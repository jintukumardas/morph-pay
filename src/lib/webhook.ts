import axios from 'axios';

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: WebhookEvent[];
  enabled: boolean;
}

export type WebhookEvent = 
  | 'transfer.initiated' 
  | 'transfer.burning' 
  | 'transfer.attestation_pending' 
  | 'transfer.ready_to_mint' 
  | 'transfer.minting' 
  | 'transfer.completed' 
  | 'transfer.failed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  transfer: {
    id: string;
    messageHash?: string;
    sourceChain: string;
    destinationChain: string;
    amount: string;
    recipient: string;
    sender?: string;
    status: string;
    sourceTransactionHash?: string;
    destinationTransactionHash?: string;
    useFastTransfer: boolean;
    enableHooks: boolean;
    hookId?: string;
  };
  metadata?: {
    estimatedCompletionTime?: number;
    progress?: number;
    error?: string;
    attestation?: string;
  };
}

export class WebhookService {
  private static instance: WebhookService;
  private webhookConfigs: WebhookConfig[] = [];

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  addWebhook(config: WebhookConfig): void {
    this.webhookConfigs.push(config);
    this.saveWebhooks();
  }

  removeWebhook(url: string): void {
    this.webhookConfigs = this.webhookConfigs.filter(config => config.url !== url);
    this.saveWebhooks();
  }

  updateWebhook(url: string, config: Partial<WebhookConfig>): void {
    const index = this.webhookConfigs.findIndex(c => c.url === url);
    if (index !== -1) {
      this.webhookConfigs[index] = { ...this.webhookConfigs[index], ...config };
      this.saveWebhooks();
    }
  }

  getWebhooks(): WebhookConfig[] {
    return [...this.webhookConfigs];
  }

  async sendWebhook(event: WebhookEvent, payload: Omit<WebhookPayload, 'event' | 'timestamp'>): Promise<void> {
    const webhookPayload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      ...payload
    };

    const relevantWebhooks = this.webhookConfigs.filter(
      config => config.enabled && config.events.includes(event)
    );

    const webhookPromises = relevantWebhooks.map(config => 
      this.deliverWebhook(config, webhookPayload)
    );

    await Promise.allSettled(webhookPromises);
  }

  private async deliverWebhook(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'MorphPay-Webhook/1.0',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp.toString(),
      };

      // Add signature if secret is provided
      if (config.secret) {
        const signature = await this.generateSignature(JSON.stringify(payload), config.secret);
        headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
      }

      console.log(`Sending webhook to ${config.url} for event ${payload.event}`);
      
      const response = await axios.post(config.url, payload, {
        headers,
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500, // Don't retry on 4xx errors
      });

      console.log(`Webhook delivered successfully to ${config.url}. Status: ${response.status}`);
    } catch (error: any) {
      console.error(`Failed to deliver webhook to ${config.url}:`, error.message);
      
      // You could implement retry logic here
      // For now, we'll just log the failure
      if (error.response) {
        console.error(`Webhook response status: ${error.response.status}`);
        console.error(`Webhook response data:`, error.response.data);
      }
    }
  }

  private async generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private saveWebhooks(): void {
    try {
      localStorage.setItem('morphpay-webhooks', JSON.stringify(this.webhookConfigs));
    } catch (error) {
      console.error('Failed to save webhooks to localStorage:', error);
    }
  }

  loadWebhooks(): void {
    try {
      const saved = localStorage.getItem('morphpay-webhooks');
      if (saved) {
        this.webhookConfigs = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load webhooks from localStorage:', error);
      this.webhookConfigs = [];
    }
  }

  // Utility method to validate webhook URL
  static isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // Test webhook delivery
  async testWebhook(config: WebhookConfig): Promise<boolean> {
    const testPayload: WebhookPayload = {
      event: 'transfer.initiated',
      timestamp: Date.now(),
      transfer: {
        id: 'test-transfer-id',
        messageHash: '0xtest',
        sourceChain: 'ethereum',
        destinationChain: 'avalanche',
        amount: '100.00',
        recipient: '0x742d35cc6675c4b9d7c5fc6ba9adacce5e00bd27',
        sender: '0x742d35cc6675c4b9d7c5fc6ba9adacce5e00bd27',
        status: 'PENDING',
        useFastTransfer: false,
        enableHooks: false,
      },
      metadata: {
        progress: 10,
      }
    };

    try {
      await this.deliverWebhook(config, testPayload);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const webhookService = WebhookService.getInstance();
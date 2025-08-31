import { ethers } from 'ethers';
import { CCTPService, TransferOptions } from './cctp';

export interface HookMetadata {
  hookType: 'REBALANCE' | 'NOTIFICATION' | 'SWAP' | 'CUSTOM';
  callbackContract?: string;
  callbackData?: string;
  executionTiming: 'PRE_MINT' | 'POST_MINT';
  gasLimit?: number;
}

export class CCTPHooksService extends CCTPService {
  async initiateBurnWithHooks(
    sourceChain: string,
    destinationChain: string,
    amount: string,
    recipientAddress: string,
    signer: ethers.Signer,
    hookMetadata: HookMetadata
  ): Promise<{ txHash: string; messageHash: string; sourceDomain: number; hookId: string }> {
    // Encode hook metadata
    const encodedHooks = this.encodeHookMetadata(hookMetadata);
    
    // Create transfer options with hooks
    const options: TransferOptions = {
      hooks: encodedHooks,
      useFastTransfer: false, // Hooks may not be compatible with fast transfer
      gasLimit: hookMetadata.gasLimit || 500000
    };
    
    // Call parent burn function with hooks
    const result = await this.initiateBurn(
      sourceChain,
      destinationChain,
      amount,
      recipientAddress,
      signer,
      options
    );

    // Generate hook ID for tracking
    const hookId = ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'string', 'bytes32'],
        [sourceChain, destinationChain, result.messageHash]
      )
    );

    return {
      ...result,
      hookId,
    };
  }

  async executeRebalanceHook(
    destinationChain: string,
    targetChain: string,
    amount: string,
    signer: ethers.Signer
  ): Promise<string> {
    // This hook automatically rebalances USDC to a target chain
    // after receiving a payment on the destination chain
    
    const hookMetadata: HookMetadata = {
      hookType: 'REBALANCE',
      executionTiming: 'POST_MINT',
      gasLimit: 500000,
    };

    // Initiate another transfer to rebalance
    const result = await this.initiateBurnWithHooks(
      destinationChain,
      targetChain,
      amount,
      await signer.getAddress(),
      signer,
      hookMetadata
    );

    return result.hookId;
  }

  async executeNotificationHook(
    messageHash: string,
    webhookUrl: string,
    merchantId: string
  ): Promise<void> {
    // This hook sends a webhook notification when a payment is received
    const notificationData = {
      messageHash,
      merchantId,
      timestamp: Date.now(),
      status: 'PAYMENT_RECEIVED',
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MorphPay-Signature': this.generateWebhookSignature(notificationData),
        },
        body: JSON.stringify(notificationData),
      });
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  async executeSwapHook(
    destinationChain: string,
    amount: string,
    targetToken: string,
    signer: ethers.Signer
  ): Promise<string> {
    // This hook swaps USDC to another token after mint
    // Implementation would integrate with DEX aggregators like 1inch or Uniswap
    
    const hookMetadata: HookMetadata = {
      hookType: 'SWAP',
      executionTiming: 'POST_MINT',
      callbackData: ethers.solidityPacked(
        ['address', 'uint256'],
        [targetToken, ethers.parseUnits(amount, 6)]
      ),
      gasLimit: 800000,
    };

    // For demo purposes, we'll just return a hook ID
    // In production, this would interact with DEX contracts
    return ethers.keccak256(
      ethers.solidityPacked(
        ['string', 'address', 'uint256'],
        ['SWAP_HOOK', targetToken, ethers.parseUnits(amount, 6)]
      )
    );
  }

  private encodeHookMetadata(metadata: HookMetadata): string {
    // Encode hook metadata into bytes
    // This is a simplified encoding - production would use more robust encoding
    const encoded = ethers.solidityPacked(
      ['uint8', 'uint8', 'uint32'],
      [
        this.hookTypeToNumber(metadata.hookType),
        metadata.executionTiming === 'PRE_MINT' ? 0 : 1,
        metadata.gasLimit || 300000,
      ]
    );

    return encoded;
  }

  private hookTypeToNumber(hookType: HookMetadata['hookType']): number {
    switch (hookType) {
      case 'REBALANCE': return 1;
      case 'NOTIFICATION': return 2;
      case 'SWAP': return 3;
      case 'CUSTOM': return 4;
      default: return 0;
    }
  }

  private generateWebhookSignature(data: any): string {
    // Generate HMAC signature for webhook security
    // In production, use a secret key from environment variables
    const payload = JSON.stringify(data);
    return ethers.keccak256(ethers.toUtf8Bytes(payload));
  }
}

// Hook contract interface for custom hooks
export const HOOK_CONTRACT_ABI = [
  "function preHook(bytes32 messageHash, uint256 amount, address recipient, bytes calldata hookData) external",
  "function postHook(bytes32 messageHash, uint256 amount, address recipient, bytes calldata hookData) external",
  "event HookExecuted(bytes32 indexed messageHash, address indexed executor, bool success)",
];

export interface MerchantHookConfig {
  merchantId: string;
  webhookUrl?: string;
  rebalanceTarget?: string;
  autoSwapToken?: string;
  customHookContract?: string;
}

export class MerchantHookManager {
  private configs: Map<string, MerchantHookConfig> = new Map();

  setMerchantConfig(config: MerchantHookConfig): void {
    this.configs.set(config.merchantId, config);
  }

  getMerchantConfig(merchantId: string): MerchantHookConfig | undefined {
    return this.configs.get(merchantId);
  }

  async processPaymentHooks(
    merchantId: string,
    messageHash: string,
    amount: string,
    destinationChain: string,
    signer: ethers.Signer
  ): Promise<string[]> {
    const config = this.getMerchantConfig(merchantId);
    if (!config) return [];

    const hooksService = new CCTPHooksService();
    const executedHooks: string[] = [];

    // Execute webhook notification
    if (config.webhookUrl) {
      await hooksService.executeNotificationHook(
        messageHash,
        config.webhookUrl,
        merchantId
      );
      executedHooks.push('NOTIFICATION');
    }

    // Execute rebalance hook
    if (config.rebalanceTarget) {
      const hookId = await hooksService.executeRebalanceHook(
        destinationChain,
        config.rebalanceTarget,
        amount,
        signer
      );
      executedHooks.push(`REBALANCE:${hookId}`);
    }

    // Execute swap hook
    if (config.autoSwapToken) {
      const hookId = await hooksService.executeSwapHook(
        destinationChain,
        amount,
        config.autoSwapToken,
        signer
      );
      executedHooks.push(`SWAP:${hookId}`);
    }

    return executedHooks;
  }
}
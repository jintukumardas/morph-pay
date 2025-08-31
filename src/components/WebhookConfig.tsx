'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, TestTube, CheckCircle, AlertCircle, Globe } from 'lucide-react';
import { type WebhookConfig, WebhookEvent, WebhookService, webhookService } from '@/lib/webhook';
import toast from 'react-hot-toast';

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { 
    value: 'transfer.initiated', 
    label: 'Transfer Initiated', 
    description: 'When a transfer is started' 
  },
  { 
    value: 'transfer.burning', 
    label: 'Burning USDC', 
    description: 'When USDC is being burned on source chain' 
  },
  { 
    value: 'transfer.attestation_pending', 
    label: 'Waiting for Attestation', 
    description: 'When waiting for Circle attestation' 
  },
  { 
    value: 'transfer.ready_to_mint', 
    label: 'Ready to Mint', 
    description: 'When attestation is received and ready to mint' 
  },
  { 
    value: 'transfer.minting', 
    label: 'Minting USDC', 
    description: 'When USDC is being minted on destination chain' 
  },
  { 
    value: 'transfer.completed', 
    label: 'Transfer Completed', 
    description: 'When transfer is successfully completed' 
  },
  { 
    value: 'transfer.failed', 
    label: 'Transfer Failed', 
    description: 'When transfer encounters an error' 
  }
];

export function WebhookConfig() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    url: string;
    secret: string;
    events: WebhookEvent[];
    enabled: boolean;
  }>({
    url: '',
    secret: '',
    events: [],
    enabled: true
  });

  useEffect(() => {
    webhookService.loadWebhooks();
    loadWebhooks();
  }, []);

  const loadWebhooks = () => {
    setWebhooks(webhookService.getWebhooks());
  };

  const handleAddWebhook = () => {
    if (!formData.url.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (!WebhookService.isValidWebhookUrl(formData.url)) {
      toast.error('Please enter a valid HTTP/HTTPS URL');
      return;
    }

    if (formData.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    const webhook: WebhookConfig = {
      url: formData.url.trim(),
      secret: formData.secret.trim() || undefined,
      events: formData.events,
      enabled: formData.enabled
    };

    webhookService.addWebhook(webhook);
    loadWebhooks();
    
    // Reset form
    setFormData({
      url: '',
      secret: '',
      events: [],
      enabled: true
    });
    setShowAddForm(false);
    
    toast.success('Webhook added successfully!');
  };

  const handleRemoveWebhook = (url: string) => {
    webhookService.removeWebhook(url);
    loadWebhooks();
    toast.success('Webhook removed');
  };

  const handleToggleWebhook = (url: string, enabled: boolean) => {
    webhookService.updateWebhook(url, { enabled });
    loadWebhooks();
    toast.success(`Webhook ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleEventToggle = (event: WebhookEvent, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        events: [...prev.events, event]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        events: prev.events.filter(e => e !== event)
      }));
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTestingWebhook(webhook.url);
    
    try {
      const success = await webhookService.testWebhook(webhook);
      if (success) {
        toast.success('Webhook test successful!');
      } else {
        toast.error('Webhook test failed');
      }
    } catch (error) {
      toast.error('Webhook test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Webhook Configuration</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Webhooks</strong> allow you to receive real-time notifications about transfer status updates. 
          Configure URLs that will receive HTTP POST requests when events occur.
        </p>
      </div>

      {/* Add Webhook Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Webhook</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret (Optional)
              </label>
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="Optional secret for signature verification"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used to generate HMAC-SHA256 signature in X-Webhook-Signature-256 header
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to Subscribe *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEBHOOK_EVENTS.map(event => (
                  <label key={event.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={(e) => handleEventToggle(event.value, e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.label}</div>
                      <div className="text-xs text-gray-500">{event.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable webhook</span>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWebhook}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Webhook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhook List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No webhooks configured</p>
            <p className="text-sm">Add a webhook to receive real-time transfer notifications</p>
          </div>
        ) : (
          webhooks.map((webhook, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-gray-900 break-all">
                      {webhook.url}
                    </span>
                    {webhook.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {webhook.events.map(event => (
                      <span key={event} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {event.replace('transfer.', '')}
                      </span>
                    ))}
                  </div>
                  
                  {webhook.secret && (
                    <div className="text-xs text-gray-500 mb-2">
                      🔒 Signature verification enabled
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTestWebhook(webhook)}
                    disabled={testingWebhook === webhook.url}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                    title="Test webhook"
                  >
                    <TestTube className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleToggleWebhook(webhook.url, !webhook.enabled)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                    title={webhook.enabled ? 'Disable' : 'Enable'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleRemoveWebhook(webhook.url)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Example Payload */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Example Webhook Payload</h4>
        <pre className="text-xs text-gray-600 overflow-x-auto">
{`{
  "event": "transfer.completed",
  "timestamp": 1703123456789,
  "transfer": {
    "id": "0x123...",
    "messageHash": "0xabc...",
    "sourceChain": "ethereum",
    "destinationChain": "avalanche",
    "amount": "100.00",
    "recipient": "0x742d35cc...",
    "sender": "0x456...",
    "status": "COMPLETED",
    "sourceTransactionHash": "0xdef...",
    "destinationTransactionHash": "0xghi...",
    "useFastTransfer": false,
    "enableHooks": false
  },
  "metadata": {
    "progress": 100,
    "estimatedCompletionTime": 1703123456789
  }
}`}
        </pre>
      </div>
    </div>
  );
}
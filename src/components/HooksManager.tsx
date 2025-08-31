'use client';

import { useState, useEffect } from 'react';
import { MerchantHookConfig } from '@/lib/hooks';
import { Settings, Webhook, ArrowRightLeft, Repeat, Zap, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export function HooksManager() {
  const [configs, setConfigs] = useState<MerchantHookConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'existing' | 'create'>('existing');
  const [newConfig, setNewConfig] = useState<Partial<MerchantHookConfig>>({
    merchantId: '',
    webhookUrl: '',
    rebalanceTarget: '',
    autoSwapToken: '',
    customHookContract: '',
  });

  useEffect(() => {
    // Load existing configurations from localStorage
    const stored = localStorage.getItem('morphpay-hooks');
    if (stored) {
      setConfigs(JSON.parse(stored));
    }
  }, []);

  const handleSaveConfig = () => {
    if (!newConfig.merchantId) {
      toast.error('Merchant ID is required');
      return;
    }

    const config: MerchantHookConfig = {
      merchantId: newConfig.merchantId,
      webhookUrl: newConfig.webhookUrl || undefined,
      rebalanceTarget: newConfig.rebalanceTarget || undefined,
      autoSwapToken: newConfig.autoSwapToken || undefined,
      customHookContract: newConfig.customHookContract || undefined,
    };

    setConfigs([...configs, config]);
    setNewConfig({
      merchantId: '',
      webhookUrl: '',
      rebalanceTarget: '',
      autoSwapToken: '',
      customHookContract: '',
    });
    
    toast.success('Hook configuration saved!');
    setActiveTab('existing');

    // Store in localStorage for demo
    const stored = JSON.parse(localStorage.getItem('morphpay-hooks') || '[]');
    localStorage.setItem('morphpay-hooks', JSON.stringify([...stored, config]));
  };

  const hookTypes = [
    {
      id: 'webhook',
      name: 'Webhook Notifications',
      description: 'Receive instant notifications when payments are received',
      icon: Webhook,
      color: 'blue',
    },
    {
      id: 'rebalance',
      name: 'Auto Rebalancing',
      description: 'Automatically move funds to your preferred chain',
      icon: ArrowRightLeft,
      color: 'green',
    },
    {
      id: 'swap',
      name: 'Auto Token Swap',
      description: 'Automatically swap USDC to other tokens',
      icon: Repeat,
      color: 'purple',
    },
    {
      id: 'custom',
      name: 'Custom Logic',
      description: 'Execute custom smart contract logic',
      icon: Settings,
      color: 'orange',
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hooks Manager</h2>
          <p className="text-gray-600 mt-1">
            Configure automated actions for your payments
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-2 rounded-lg">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">CCTP V2 Hooks</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'existing', label: 'My Hooks' },
          { id: 'create', label: 'Create New' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as 'existing' | 'create')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Existing Hooks */}
      {activeTab === 'existing' && (
        <div>
          {configs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hooks configured</h3>
              <p className="text-gray-500 mb-4">
                Create your first hook configuration to automate payment processing.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Hook
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{config.merchantId}</h3>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Active
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    {config.webhookUrl && (
                      <div>
                        <span className="text-gray-600">Webhook URL:</span>
                        <p className="font-mono text-blue-600">{config.webhookUrl}</p>
                      </div>
                    )}
                    {config.rebalanceTarget && (
                      <div>
                        <span className="text-gray-600">Rebalance Target:</span>
                        <p className="font-semibold">{config.rebalanceTarget}</p>
                      </div>
                    )}
                    {config.autoSwapToken && (
                      <div>
                        <span className="text-gray-600">Auto Swap Token:</span>
                        <p className="font-mono">{config.autoSwapToken}</p>
                      </div>
                    )}
                    {config.customHookContract && (
                      <div>
                        <span className="text-gray-600">Custom Contract:</span>
                        <p className="font-mono text-purple-600">{config.customHookContract}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create New Hook */}
      {activeTab === 'create' && (
        <div>
          {/* Hook Types Overview */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {hookTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 bg-${type.color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 text-${type.color}-600`} />
                    </div>
                    <h3 className="font-semibold">{type.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              );
            })}
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Merchant ID *
              </label>
              <input
                type="text"
                value={newConfig.merchantId}
                onChange={(e) => setNewConfig({ ...newConfig, merchantId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="my-store-id"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="url"
                value={newConfig.webhookUrl}
                onChange={(e) => setNewConfig({ ...newConfig, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://api.mystore.com/webhooks/morphpay"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rebalance Target Chain (Optional)
                </label>
                <select
                  value={newConfig.rebalanceTarget}
                  onChange={(e) => setNewConfig({ ...newConfig, rebalanceTarget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select chain...</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="arbitrum">Arbitrum</option>
                  <option value="base">Base</option>
                  <option value="avalanche">Avalanche</option>
                  <option value="sonic">Sonic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto Swap Token (Optional)
                </label>
                <input
                  type="text"
                  value={newConfig.autoSwapToken}
                  onChange={(e) => setNewConfig({ ...newConfig, autoSwapToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0x... (token contract address)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Hook Contract (Optional)
              </label>
              <input
                type="text"
                value={newConfig.customHookContract}
                onChange={(e) => setNewConfig({ ...newConfig, customHookContract: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0x... (custom hook contract address)"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={!newConfig.merchantId}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Hook Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
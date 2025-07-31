'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ethers } from 'ethers';
import { CCTPHooksService, HookMetadata } from '@/lib/hooks';
import { SUPPORTED_CHAINS } from '@/lib/cctp';
import { ArrowRight, Loader2, Zap, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export function PaymentForm() {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    sourceChain: 'ethereum',
    destinationChain: 'base',
    amount: '',
    recipient: '',
    useFastTransfer: true,
    enableHooks: false,
    hookType: 'REBALANCE' as HookMetadata['hookType'],
    rebalanceTarget: 'avalanche',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Processing payment...');

    try {
      // Create signer (in real app, this would use the connected wallet)
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const hooksService = new CCTPHooksService();

      let result;
      if (formData.enableHooks) {
        const hookMetadata: HookMetadata = {
          hookType: formData.hookType,
          executionTiming: 'POST_MINT',
          gasLimit: 500000,
        };

        result = await hooksService.initiateBurnWithHooks(
          formData.sourceChain,
          formData.destinationChain,
          formData.amount,
          formData.recipient,
          signer,
          hookMetadata
        );

        toast.success(`Payment sent with hooks! Hook ID: ${result.hookId.slice(0, 10)}...`);
      } else {
        result = await hooksService.initiateBurn(
          formData.sourceChain,
          formData.destinationChain,
          formData.amount,
          formData.recipient,
          signer
        );

        toast.success('Payment sent successfully!');
      }

      // Store transaction for history
      const transaction = {
        id: result.txHash,
        messageHash: result.messageHash,
        sourceChain: formData.sourceChain,
        destinationChain: formData.destinationChain,
        amount: formData.amount,
        recipient: formData.recipient,
        timestamp: Date.now(),
        status: 'PENDING',
        hookId: 'hookId' in result ? result.hookId : undefined,
      };

      const existingTxs = JSON.parse(localStorage.getItem('morphpay-transactions') || '[]');
      localStorage.setItem('morphpay-transactions', JSON.stringify([transaction, ...existingTxs]));

      // Reset form
      setFormData({
        ...formData,
        amount: '',
        recipient: '',
      });

      toast.dismiss(loadingToast);
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const chainOptions = Object.entries(SUPPORTED_CHAINS).map(([key, config]) => ({
    value: key,
    label: config.name,
    supportsFast: config.supportsFastTransfer,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Send USDC Payment</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <Settings className="w-4 h-4" />
          Advanced
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chain Selection */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Chain
            </label>
            <select
              value={formData.sourceChain}
              onChange={(e) => setFormData({ ...formData, sourceChain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {chainOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Chain
            </label>
            <select
              value={formData.destinationChain}
              onChange={(e) => setFormData({ ...formData, destinationChain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {chainOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount and Recipient */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              step="0.000001"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="100.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0x..."
              required
            />
          </div>
        </div>

        {/* Fast Transfer Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="fastTransfer"
            checked={formData.useFastTransfer}
            onChange={(e) => setFormData({ ...formData, useFastTransfer: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="fastTransfer" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Zap className="w-4 h-4 text-yellow-500" />
            Use Fast Transfer (8-20 seconds)
          </label>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="enableHooks"
                checked={formData.enableHooks}
                onChange={(e) => setFormData({ ...formData, enableHooks: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enableHooks" className="text-sm font-medium text-gray-700">
                Enable Smart Hooks
              </label>
            </div>

            {formData.enableHooks && (
              <div className="pl-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hook Type
                  </label>
                  <select
                    value={formData.hookType}
                    onChange={(e) => setFormData({ ...formData, hookType: e.target.value as HookMetadata['hookType'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="REBALANCE">Auto Rebalance</option>
                    <option value="NOTIFICATION">Webhook Notification</option>
                    <option value="SWAP">Auto Swap</option>
                    <option value="CUSTOM">Custom Hook</option>
                  </select>
                </div>

                {formData.hookType === 'REBALANCE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rebalance Target Chain
                    </label>
                    <select
                      value={formData.rebalanceTarget}
                      onChange={(e) => setFormData({ ...formData, rebalanceTarget: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {chainOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Transfer Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Transfer Route:</span>
            <div className="flex items-center gap-2">
              <span className="chain-badge">
                {SUPPORTED_CHAINS[formData.sourceChain]?.name}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="chain-badge">
                {SUPPORTED_CHAINS[formData.destinationChain]?.name}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-600">Estimated Time:</span>
            <span className="font-medium text-green-600">
              {formData.useFastTransfer ? '8-20 seconds' : '10-20 minutes'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !formData.amount || !formData.recipient}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Send USDC
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
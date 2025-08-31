'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { CCTPHooksService, HookMetadata } from '@/lib/hooks';
import { CCTPService, SUPPORTED_CHAINS, TransferOptions } from '@/lib/cctp';
import { ArrowRight, Loader2, Zap, Settings, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export function PaymentForm() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
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
  const [isApproving, setIsApproving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [usdcAllowance, setUsdcAllowance] = useState<string>('0');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [transferFees, setTransferFees] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Check USDC balance and allowance
  const checkBalanceAndAllowance = async () => {
    if (!address) return;

    setIsLoadingBalance(true);
    try {
      const cctpService = new CCTPService();
      const [balance, allowance] = await Promise.all([
        cctpService.checkUSDCBalance(address, formData.sourceChain),
        cctpService.checkUSDCAllowance(address, formData.sourceChain)
      ]);

      setUsdcBalance(balance);
      setUsdcAllowance(allowance);

      // Check if approval is needed
      const amount = parseFloat(formData.amount || '0');
      const currentAllowance = parseFloat(allowance);
      setNeedsApproval(amount > 0 && currentAllowance < amount);
    } catch (error) {
      console.error('Failed to check balance/allowance:', error);
      toast.error('Failed to check USDC balance');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Check fees
  const checkTransferFees = async () => {
    try {
      const cctpService = new CCTPService();
      const fees = await cctpService.getTransferFees(formData.sourceChain, formData.destinationChain);
      setTransferFees(fees);
    } catch (error) {
      console.error('Failed to check transfer fees:', error);
      setTransferFees('0');
    }
  };

  // Handle network switching
  const ensureCorrectNetwork = async () => {
    const sourceConfig = SUPPORTED_CHAINS[formData.sourceChain];
    if (chainId !== sourceConfig.id) {
      try {
        await switchChain({ chainId: sourceConfig.id });
        return true;
      } catch (error) {
        toast.error(`Please switch to ${sourceConfig.name} network`);
        return false;
      }
    }
    return true;
  };

  // Handle USDC approval
  const handleApprove = async () => {
    if (!address || !formData.amount) return;

    const networkSwitched = await ensureCorrectNetwork();
    if (!networkSwitched) return;

    setIsApproving(true);
    const loadingToast = toast.loading('Approving USDC...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const cctpService = new CCTPService();

      const txHash = await cctpService.approveUSDC(formData.amount, formData.sourceChain, signer);
      toast.success('USDC approved successfully!');
      toast.dismiss(loadingToast);

      // Refresh allowance after approval
      setTimeout(() => checkBalanceAndAllowance(), 2000);
    } catch (error: any) {
      console.error('Approval failed:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    if (address) {
      checkBalanceAndAllowance();
      checkTransferFees();
    }
  }, [address, formData.sourceChain, formData.destinationChain, formData.amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Validate form
    if (!formData.amount || !formData.recipient) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (needsApproval) {
      toast.error('Please approve USDC first');
      return;
    }

    const amount = parseFloat(formData.amount);
    const balance = parseFloat(usdcBalance);
    if (amount > balance) {
      toast.error(`Insufficient balance. You have ${usdcBalance} USDC`);
      return;
    }

    // Ensure we're on the correct network
    const networkSwitched = await ensureCorrectNetwork();
    if (!networkSwitched) return;

    setIsLoading(true);
    const loadingToast = toast.loading('Processing payment...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let result;
      if (formData.enableHooks) {
        const hooksService = new CCTPHooksService();
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
        const cctpService = new CCTPService();
        const options: TransferOptions = {
          useFastTransfer: formData.useFastTransfer,
          gasLimit: 300000
        };

        result = await cctpService.initiateBurn(
          formData.sourceChain,
          formData.destinationChain,
          formData.amount,
          formData.recipient,
          signer,
          options
        );

        if (formData.useFastTransfer) {
          toast.success('Fast payment sent! Should arrive in 8-20 seconds');
        } else {
          toast.success('Payment sent! Will arrive in 10-20 minutes');
        }
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
        useFastTransfer: formData.useFastTransfer,
        enableHooks: formData.enableHooks,
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

      // Refresh balance
      setTimeout(() => checkBalanceAndAllowance(), 3000);

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

        {/* Balance and Network Info */}
        {address && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">USDC Balance:</span>
              </div>
              {isLoadingBalance ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              ) : (
                <span className="text-sm font-semibold">
                  {parseFloat(usdcBalance).toFixed(2)} USDC
                </span>
              )}
            </div>
            {chainId !== SUPPORTED_CHAINS[formData.sourceChain]?.id && (
              <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Switch to {SUPPORTED_CHAINS[formData.sourceChain]?.name} to continue</span>
              </div>
            )}
          </div>
        )}

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
          {parseFloat(transferFees) > 0 && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Transfer Fee:</span>
              <span className="font-medium">${parseFloat(transferFees).toFixed(6)}</span>
            </div>
          )}
        </div>

        {/* Approval Section */}
        {address && needsApproval && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  USDC Approval Required
                </h4>
                <p className="text-sm text-amber-700 mb-3">
                  You need to approve {formData.amount} USDC for transfer. Current allowance: {parseFloat(usdcAllowance).toFixed(2)} USDC
                </p>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Approve USDC
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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
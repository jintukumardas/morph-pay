'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { CCTPHooksService, HookMetadata } from '@/lib/hooks';
import { CCTPService, SUPPORTED_CHAINS, TransferOptions } from '@/lib/cctp';
import { CrossChainTransferService, TransferProgress } from '@/lib/cross-chain-transfer';
import { webhookService } from '@/lib/webhook';
import { ArrowRight, Loader2, Zap, Settings, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export function PaymentForm() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [formData, setFormData] = useState({
    sourceChain: 'ethereum',
    destinationChain: 'avalanche', // Try Avalanche Fuji (domain 1) first
    amount: '',
    recipient: '',
    useFastTransfer: false, // Try standard transfer first
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
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentTransferResult, setCurrentTransferResult] = useState<any>(null);

  // Check USDC balance and allowance
  const checkBalanceAndAllowance = useCallback(async () => {
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
  }, [address, formData.sourceChain, formData.amount]);

  // Check fees
  const checkTransferFees = useCallback(async () => {
    try {
      const cctpService = new CCTPService();
      const fees = await cctpService.getTransferFees(formData.sourceChain, formData.destinationChain);
      setTransferFees(fees);
    } catch (error) {
      console.error('Failed to check transfer fees:', error);
      setTransferFees('0');
    }
  }, [formData.sourceChain, formData.destinationChain]);

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
    // Initialize webhooks on component mount
    webhookService.loadWebhooks();
    
    if (address) {
      checkBalanceAndAllowance();
      checkTransferFees();
    }
  }, [address, checkBalanceAndAllowance, checkTransferFees]);

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
    setShowProgressModal(true);
    toast.dismiss(); // Clear existing toasts

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const crossChainService = new CrossChainTransferService();

      // Only enable smart contract hooks for non-notification hook types
      // Webhook notifications are handled as events, not smart contract hooks
      const shouldUseSmartHooks = formData.enableHooks && formData.hookType !== 'NOTIFICATION';
      
      const transferOptions = {
        useFastTransfer: formData.useFastTransfer,
        enableHooks: shouldUseSmartHooks,
        hookMetadata: shouldUseSmartHooks ? {
          hookType: formData.hookType,
          executionTiming: 'POST_MINT' as const,
          gasLimit: 500000,
        } : undefined,
        onProgress: (progress: TransferProgress) => {
          setTransferProgress(progress);
        }
      };

      console.log('PaymentForm - formData.recipient:', formData.recipient);
      console.log('PaymentForm - full formData:', formData);
      
      const result = await crossChainService.initiateTransfer(
        formData.sourceChain,
        formData.destinationChain,
        formData.amount,
        formData.recipient,
        signer,
        transferOptions
      );

      // Store the transfer result for completing the transfer
      setCurrentTransferResult(result);

      if (result.status === 'ATTESTED') {
        if (formData.useFastTransfer) {
          toast.success('Fast payment initiated! Attestation received in seconds');
        } else {
          toast.success('Payment initiated! Attestation received');
        }
      }

      // Store transaction for history
      const transaction = {
        id: result.sourceTransactionHash,
        messageHash: result.messageHash,
        sourceChain: formData.sourceChain,
        destinationChain: formData.destinationChain,
        amount: formData.amount,
        recipient: formData.recipient,
        timestamp: Date.now(),
        status: result.status === 'ATTESTED' ? 'READY_TO_MINT' : 'PENDING',
        useFastTransfer: formData.useFastTransfer,
        enableHooks: shouldUseSmartHooks,
        hookId: result.hookId,
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

    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment failed');
      setTransferProgress({
        step: 'FAILED',
        message: error.message || 'Payment failed',
        progress: 0,
        timeElapsed: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle completing the transfer (minting)
  const handleCompleteTransfer = async () => {
    if (!currentTransferResult || !address) {
      toast.error('No transfer to complete');
      return;
    }

    // Switch to destination chain for minting
    const destConfig = SUPPORTED_CHAINS[formData.destinationChain];
    if (chainId !== destConfig.id) {
      try {
        await switchChain({ chainId: destConfig.id });
      } catch (error) {
        toast.error(`Please switch to ${destConfig.name} network`);
        return;
      }
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Completing transfer...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const crossChainService = new CrossChainTransferService();

      const completedResult = await crossChainService.completeTransfer(
        currentTransferResult,
        formData.destinationChain,
        signer,
        (progress: TransferProgress) => {
          setTransferProgress(progress);
        }
      );

      toast.success('Transfer completed successfully!');
      toast.dismiss(loadingToast);

      // Update stored transaction
      const existingTxs = JSON.parse(localStorage.getItem('morphpay-transactions') || '[]');
      const updatedTxs = existingTxs.map((tx: any) => 
        tx.id === currentTransferResult.sourceTransactionHash 
          ? { ...tx, status: 'COMPLETED', destinationTransactionHash: completedResult.destinationTransactionHash }
          : tx
      );
      localStorage.setItem('morphpay-transactions', JSON.stringify(updatedTxs));

      // Clear current transfer
      setCurrentTransferResult(null);

    } catch (error: any) {
      console.error('Complete transfer failed:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to complete transfer');
      setTransferProgress({
        step: 'FAILED',
        message: error.message || 'Failed to complete transfer',
        progress: 80,
        timeElapsed: 0
      });
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
            Use Fast Transfer (1-15 minutes)
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
              {formData.useFastTransfer ? '1-15 minutes' : '10-40 minutes'}
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

      {/* Progress Modal */}
      {showProgressModal && transferProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Cross-Chain Transfer Progress
              </h3>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${transferProgress.progress}%` }}
                ></div>
              </div>
              
              {/* Progress Status */}
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {transferProgress.step === 'COMPLETED' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : transferProgress.step === 'FAILED' ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {transferProgress.step.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{transferProgress.message}</p>
                <p className="text-xs text-gray-500">
                  Progress: {Math.round(transferProgress.progress)}%
                  {transferProgress.timeElapsed > 0 && (
                    <> • Time: {Math.round(transferProgress.timeElapsed / 1000)}s</>
                  )}
                </p>
              </div>

              {/* Transaction Hash */}
              {transferProgress.txHash && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                  <p className="font-mono text-xs text-blue-600 break-all">
                    {transferProgress.txHash}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {(transferProgress.step === 'COMPLETED' || transferProgress.step === 'FAILED') && (
                  <button
                    onClick={() => {
                      setShowProgressModal(false);
                      setTransferProgress(null);
                    }}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                )}
                {transferProgress.step === 'READY_TO_MINT' && (
                  <button 
                    onClick={handleCompleteTransfer}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      'Complete Transfer'
                    )}
                  </button>
                )}
                {transferProgress.step !== 'COMPLETED' && transferProgress.step !== 'FAILED' && (
                  <button
                    onClick={() => setShowProgressModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Hide Progress
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
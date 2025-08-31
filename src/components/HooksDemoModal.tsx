'use client';

import { useState } from 'react';
import { X, Zap, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { HookMetadata } from '@/lib/hooks';

interface HooksDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDemo: (hookType: HookMetadata['hookType']) => Promise<void>;
}

export function HooksDemoModal({ isOpen, onClose, onExecuteDemo }: HooksDemoModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedHook, setSelectedHook] = useState<HookMetadata['hookType']>('REBALANCE');
  const [demoStep, setDemoStep] = useState(1);

  if (!isOpen) return null;

  const handleExecuteDemo = async () => {
    setIsExecuting(true);
    try {
      await onExecuteDemo(selectedHook);
      setDemoStep(2);
    } catch (error) {
      console.error('Demo execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const hookTypes = [
    {
      type: 'REBALANCE' as const,
      title: 'Auto Rebalance',
      description: 'Automatically rebalance USDC to maintain optimal distribution across chains',
      icon: '⚖️',
      use_case: 'Merchants managing multi-chain treasury',
      steps: ['Receive USDC on destination chain', 'Check treasury balances', 'Rebalance to target chain automatically']
    },
    {
      type: 'NOTIFICATION' as const,
      title: 'Webhook Notifications',
      description: 'Send real-time webhooks when payments are received',
      icon: '📧',
      use_case: 'E-commerce stores with payment notifications',
      steps: ['Payment received', 'Hook triggered', 'Webhook sent to merchant system']
    },
    {
      type: 'SWAP' as const,
      title: 'Auto Swap',
      description: 'Automatically swap USDC to other tokens after receiving payment',
      icon: '🔄',
      use_case: 'DeFi protocols accepting USDC but needing other tokens',
      steps: ['Receive USDC payment', 'Execute DEX swap', 'Deliver target token to recipient']
    },
    {
      type: 'CUSTOM' as const,
      title: 'Custom Business Logic',
      description: 'Execute custom smart contract logic after payment',
      icon: '⚙️',
      use_case: 'Complex business workflows and integrations',
      steps: ['Payment triggers hook', 'Custom contract executed', 'Business logic completed']
    }
  ];

  const currentHook = hookTypes.find(h => h.type === selectedHook);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">CCTP v2 Hooks Demo</h2>
            <p className="text-gray-600 mt-1">Experience programmable cross-chain payments</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {demoStep === 1 && (
            <>
              {/* Hook Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Choose a Hook to Demonstrate</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {hookTypes.map((hook) => (
                    <div
                      key={hook.type}
                      onClick={() => setSelectedHook(hook.type)}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        selectedHook === hook.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{hook.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{hook.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{hook.description}</p>
                          <div className="text-xs text-blue-600 mt-2 font-medium">
                            Use Case: {hook.use_case}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Hook Details */}
              {currentHook && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl">{currentHook.icon}</div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{currentHook.title}</h4>
                      <p className="text-gray-600">{currentHook.description}</p>
                    </div>
                  </div>

                  <h5 className="font-semibold text-gray-900 mb-3">Demo Flow:</h5>
                  <div className="flex items-center gap-2 text-sm">
                    {currentHook.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="bg-white rounded-full px-3 py-1 border shadow-sm">
                          {step}
                        </div>
                        {index < currentHook.steps.length - 1 && (
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Technical Details */}
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Hook Type</h6>
                      <code className="bg-white px-2 py-1 rounded text-sm">{currentHook.type}</code>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Execution</h6>
                      <span className="bg-white px-2 py-1 rounded text-sm">POST_MINT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleExecuteDemo}
                  disabled={isExecuting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Executing Demo...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Run {currentHook?.title} Demo
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {demoStep === 2 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Demo Executed Successfully!</h3>
              <p className="text-gray-600 mb-6">
                The {currentHook?.title} hook has been demonstrated. In a real implementation, this would:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <ul className="space-y-2 text-sm">
                  {currentHook?.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDemoStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Try Another Hook
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close Demo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
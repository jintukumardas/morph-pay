'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { PaymentForm } from '@/components/PaymentForm';
import { TransactionHistory } from '@/components/TransactionHistory';
import { HooksManager } from '@/components/HooksManager';
import { ArrowRightLeft, Zap, Shield, Globe, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import config, { validateConfig } from '@/lib/config';

export default function Home() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'hooks'>('send');
  const configValidation = validateConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 relative">
                <Image
                  src="/morphpay-icon.svg"
                  alt="MorphPay"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MorphPay
                </h1>
                <p className="text-sm text-gray-500">Universal USDC Payments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Environment Status */}
              <div className="flex items-center gap-2">
                {config.cctpEnvironment === 'testnet' && (
                  <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
                    TESTNET
                  </div>
                )}
                {!configValidation.isValid && (
                  <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    CONFIG
                  </div>
                )}
                {typeof window !== 'undefined' && config.environment === 'development' && (
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    DEV
                  </div>
                )}
              </div>
              
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!isConnected && (
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              The Future of{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Multichain Payments
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Send and receive USDC across multiple blockchains in seconds with Circle&apos;s CCTP V2. 
              Fast transfers, automated rebalancing, and smart hooks.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-600">
                  8-20 second transfers with CCTP V2 Fast Transfer technology
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Globe className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Multichain Native</h3>
                <p className="text-gray-600">
                  Support for Ethereum, Arbitrum, Base, Avalanche, Sonic, and more
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg card-hover">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Hooks</h3>
                <p className="text-gray-600">
                  Automated rebalancing, notifications, and custom business logic
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main App */}
      {isConnected && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { id: 'send', label: 'Send Payment', icon: ArrowRightLeft },
              { id: 'history', label: 'History', icon: null },
              { id: 'hooks', label: 'Hooks Manager', icon: null },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'send' | 'history' | 'hooks')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {activeTab === 'send' && <PaymentForm />}
              {activeTab === 'history' && <TransactionHistory />}
              {activeTab === 'hooks' && <HooksManager />}
            </div>
            
            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Supported Chains</h3>
                <div className="space-y-2">
                  {['Ethereum', 'Arbitrum', 'Base', 'Avalanche', 'Sonic'].map((chain) => (
                    <div key={chain} className="flex items-center justify-between">
                      <span className="text-gray-600">{chain}</span>
                      <span className="chain-badge">Live</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Powered by Circle • Built for the multichain future</p>
            <p>Built with ❤️ for Circle Developer Bounties 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
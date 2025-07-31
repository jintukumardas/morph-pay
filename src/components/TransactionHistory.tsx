'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { SUPPORTED_CHAINS } from '@/lib/cctp';

interface Transaction {
  id: string;
  messageHash: string;
  sourceChain: string;
  destinationChain: string;
  amount: string;
  recipient: string;
  timestamp: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  hookId?: string;
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');

  useEffect(() => {
    const stored = localStorage.getItem('morphpay-transactions');
    if (stored) {
      setTransactions(JSON.parse(stored));
    }
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.status.toLowerCase() === filter;
  });

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          {['all', 'pending', 'completed', 'failed'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-all ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterType}
            </button>
          ))}
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'Your transactions will appear here once you make your first payment.'
              : `No ${filter} transactions found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="chain-badge text-xs">
                        {SUPPORTED_CHAINS[tx.sourceChain]?.name}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="chain-badge text-xs">
                        {SUPPORTED_CHAINS[tx.destinationChain]?.name}
                      </span>
                    </div>
                    
                    {tx.hookId && (
                      <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        <Zap className="w-3 h-3" />
                        Hooks
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="font-semibold text-lg">{tx.amount} USDC</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recipient</p>
                      <p className="font-mono text-sm text-gray-800">
                        {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(tx.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {new Date(tx.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.open(`https://etherscan.io/tx/${tx.id}`, '_blank')}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {tx.hookId && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Hook ID:</span>
                    <span className="font-mono text-gray-800">
                      {tx.hookId.slice(0, 10)}...{tx.hookId.slice(-6)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
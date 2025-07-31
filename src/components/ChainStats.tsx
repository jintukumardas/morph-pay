'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CHAINS } from '@/lib/cctp';
import { BarChart3, TrendingUp, Activity, Zap } from 'lucide-react';

interface ChainStat {
  chainId: string;
  name: string;
  volume24h: number;
  transactions24h: number;
  avgTransferTime: number;
  supportsFastTransfer: boolean;
  status: 'active' | 'maintenance' | 'congested';
}

export function ChainStats() {
  const [stats, setStats] = useState<ChainStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading chain statistics
    const generateMockStats = (): ChainStat[] => {
      return Object.entries(SUPPORTED_CHAINS).map(([key, config]) => ({
        chainId: key,
        name: config.name,
        volume24h: Math.floor(Math.random() * 10000000) + 1000000,
        transactions24h: Math.floor(Math.random() * 5000) + 100,
        avgTransferTime: config.supportsFastTransfer 
          ? Math.floor(Math.random() * 15) + 8  // 8-23 seconds
          : Math.floor(Math.random() * 600) + 300,  // 5-15 minutes
        supportsFastTransfer: config.supportsFastTransfer,
        status: Math.random() > 0.1 ? 'active' : Math.random() > 0.5 ? 'congested' : 'maintenance',
      }));
    };

    setTimeout(() => {
      setStats(generateMockStats());
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: ChainStat['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'congested':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalVolume = stats.reduce((sum, stat) => sum + stat.volume24h, 0);
  const totalTransactions = stats.reduce((sum, stat) => sum + stat.transactions24h, 0);
  const avgTransferTime = stats.reduce((sum, stat) => sum + stat.avgTransferTime, 0) / stats.length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Chain Statistics</h2>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Volume (24h)</p>
              <p className="text-xl font-bold text-blue-900">{formatVolume(totalVolume)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Transactions (24h)</p>
              <p className="text-xl font-bold text-green-900">{totalTransactions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">Avg Transfer Time</p>
              <p className="text-xl font-bold text-purple-900">{formatTime(Math.floor(avgTransferTime))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chain Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Chain Details</h3>
        
        {stats.map((stat) => (
          <div
            key={stat.chainId}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-lg">{stat.name}</h4>
                {stat.supportsFastTransfer && (
                  <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    <Zap className="w-3 h-3" />
                    Fast Transfer
                  </div>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(stat.status)}`}>
                {stat.status}
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">24h Volume</p>
                <p className="font-semibold text-lg">{formatVolume(stat.volume24h)}</p>
              </div>
              <div>
                <p className="text-gray-600">24h Transactions</p>
                <p className="font-semibold text-lg">{stat.transactions24h.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Transfer Time</p>
                <p className="font-semibold text-lg">{formatTime(stat.avgTransferTime)}</p>
              </div>
            </div>

            {/* Network Health Indicator */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Network Health</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        stat.status === 'active' && i <= 5
                          ? 'bg-green-500'
                          : stat.status === 'congested' && i <= 3
                          ? 'bg-yellow-500'
                          : stat.status === 'maintenance' && i <= 1
                          ? 'bg-red-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Notice */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-600">
          Statistics are updated every 5 minutes. Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from './Card';
import { Button } from './Button';
import { storageService } from '@/utils/storage';
import { Transaction } from '@/types';
import { formatDate, formatTimeAgo, formatAddress, getExplorerUrl } from '@/utils/helpers';
import { getConfig } from '@/utils/config';

export const TransactionHistory: React.FC = () => {
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | Transaction['type']>('all');
  const config = getConfig();


  const loadTransactions = React.useCallback(() => {
    if (publicKey) {
      const txs = storageService.getTransactions(publicKey.toBase58());
      setTransactions(txs);
    }
  }, [publicKey]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleClearHistory = () => {
    if (publicKey && confirm('Are you sure you want to clear your transaction history?')) {
      storageService.clearTransactions(publicKey.toBase58());
      loadTransactions();
    }
  };

  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'stake':
        return 'text-blue-400 bg-blue-500/20';
      case 'unstake':
        return 'text-orange-400 bg-orange-500/20';
      case 'claim':
        return 'text-green-400 bg-green-500/20';
      case 'initialize':
      case 'addRewards':
      case 'updateRate':
      case 'toggleReferral':
      case 'pause':
      case 'withdraw':
        return 'text-purple-400 bg-purple-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'stake':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'unstake':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'claim':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        );
    }
  };

  if (!publicKey) {
    return (
      <Card title="Transaction History">
        <div className="text-center py-8">
          <p className="text-gray-400">Connect your wallet to view transaction history</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Transaction History"
      subtitle={`${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'stake', 'unstake', 'claim', 'initialize', 'addRewards'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
              ? 'bg-solana-purple text-white'
              : 'bg-solana-dark text-gray-400 hover:text-white'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {transactions.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-solana-dark rounded-lg p-4 border border-gray-700/50 hover:border-gray-600 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${getTypeColor(tx.type)}`}>
                    {getTypeIcon(tx.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold capitalize">{tx.type}</h4>
                      <span className={`text-xs ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>

                    {tx.amount && (
                      <p className="text-sm text-gray-400 mb-1">
                        Amount: <span className="text-white font-medium">{tx.amount} {config.tokenSymbol}</span>
                      </p>
                    )}

                    {tx.referrer && (
                      <p className="text-sm text-gray-400 mb-1">
                        Referrer: <span className="text-solana-teal">{formatAddress(tx.referrer)}</span>
                      </p>
                    )}

                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(tx.timestamp)} • {formatDate(tx.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Signature Link */}
                {tx.signature && tx.status === 'success' && (
                  <a
                    href={getExplorerUrl(tx.signature, config.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-solana-teal hover:text-solana-purple transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Card } from './Card';
import { Button } from './Button';
import { ReferralTree } from './ReferralTree';
import { getProgram, fetchReferrerStats, initializeReferrerStats, claimReferralRewards, fetchStakingPool } from '@/utils/program';
import { generateReferralLink, copyToClipboard, formatTokenAmount, calculateLiveReferralCommission } from '@/utils/helpers';
import { getConfig } from '@/utils/config';
import { emitDataRefresh, onDataRefresh } from '@/utils/events';
import toast from 'react-hot-toast';

export const ReferralCard: React.FC = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const config = getConfig();
  const [referralStats, setReferralStats] = useState<any>(null);
  const [poolData, setPoolData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [liveCommission, setLiveCommission] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey && connection) {
      fetchReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connection]);

  // Listen for global data refresh events (from other components)
  useEffect(() => {
    const unsubscribe = onDataRefresh(() => {
      if (publicKey && connection) {
        fetchReferralData();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connection]);

  // Live Ticker Effect
  useEffect(() => {
    if (!poolData || !referralStats) return;

    const interval = setInterval(() => {
      const liveValue = calculateLiveReferralCommission(poolData, referralStats);
      setLiveCommission(liveValue);
    }, 1000);

    return () => clearInterval(interval);
  }, [poolData, referralStats]);

  const fetchReferralData = async () => {
    if (!publicKey) return;

    try {
      const wallet = {
        publicKey,
        signTransaction: signTransaction || (() => { }),
        signAllTransactions: signAllTransactions || (() => { }),
      };
      const program = getProgram(connection, wallet as any);

      const [stats, pool] = await Promise.all([
        fetchReferrerStats(program, publicKey),
        fetchStakingPool(program, config.tokenAddress)
      ]);

      if (stats) {
        setReferralStats(stats);
        setInitialized(true);
      } else {
        setInitialized(false);
      }

      if (pool) {
        setPoolData(pool);
      }
    } catch (error: any) {
      if (error?.message?.includes('Account does not exist')) {
        setInitialized(false);
      }
    }
  };

  const handleInitializeReferral = async () => {
    if (!publicKey) return;

    if (!signTransaction || !signAllTransactions) {
      toast.error('Wallet not properly connected');
      return;
    }

    setLoading(true);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const program = getProgram(connection, wallet as any);

      await initializeReferrerStats(program, wallet as any, config.tokenAddress);
      toast.success('Referral account initialized!');
      await fetchReferralData();
      emitDataRefresh(); // Notify all components to refresh
    } catch (error: any) {
      console.error('Initialize referral error:', error);
      toast.error(error.message || 'Failed to initialize referral account');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicKey) return;

    const link = generateReferralLink(publicKey.toBase58());
    const success = await copyToClipboard(link);

    if (success) {
      toast.success('Referral link copied to clipboard!');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const handleClaimCommission = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const program = getProgram(connection, wallet as any);

      await claimReferralRewards(
        program,
        wallet as any,
        config.tokenAddress,
        config.rewardTokenAddress
      );

      toast.success('Commission claimed successfully!');
      await fetchReferralData();
      emitDataRefresh(); // Notify all components to refresh
    } catch (error: any) {
      console.error('Claim commission error:', error);
      toast.error(error.message || 'Failed to claim commission');
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return null;
  }

  if (!initialized) {
    return (
      <Card title="Referral Program" glow>
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-solana-teal mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">Join the Referral Program</h3>
          <p className="text-sm text-gray-400 mb-4">
            Initialize your referral account to start earning commissions from referred users
          </p>
          <Button onClick={handleInitializeReferral} loading={loading}>
            Initialize Referral Account
          </Button>
        </div>
      </Card>
    );
  }

  const referralLink = generateReferralLink(publicKey.toBase58());
  const totalReferrals = referralStats?.totalReferrals ? Number(referralStats.totalReferrals) : 0;
  const totalCommission = referralStats ? formatTokenAmount(referralStats.totalCommissionEarned, 9, 6) : '0';

  // Use live commission if available, else fallback to static pending
  const pendingCommission = liveCommission || (referralStats ? formatTokenAmount(referralStats.pendingRewards, 9, 6) : '0');

  // Calculate referral rates from pool data (in bps) or fallback to defaults
  const l1Rate = poolData?.referralL1Bps ? poolData.referralL1Bps / 100 : 10;
  const l2Rate = poolData?.referralL2Bps ? poolData.referralL2Bps / 100 : 5;
  const l3Rate = poolData?.referralL3Bps ? poolData.referralL3Bps / 100 : 3;

  return (
    <Card title="Your Referral Dashboard" glow>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400 mb-1">Total Referrals</p>
            <p className="text-3xl font-bold text-white">{totalReferrals}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400 mb-1">Total Earned</p>
            <p className="text-3xl font-bold text-solana-teal">{totalCommission} {config.tokenSymbol}</p>
          </div>
          <div className="bg-solana-dark rounded-lg p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-400">Projected Commission</p>
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center pointer-events-none z-10">
                    Rewards are credited to your Claimable balance when your referrals claim their staking rewards.
                  </div>
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-400">{pendingCommission} {config.tokenSymbol}</p>

              <div className="mt-2 text-xs border-t border-white/10 pt-2 flex justify-between items-center">
                <span className="text-gray-400">Claimable Now:</span>
                <span className={`font-bold ${parseFloat(referralStats ? formatTokenAmount(referralStats.pendingRewards, 9, 6) : '0') > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {referralStats ? formatTokenAmount(referralStats.pendingRewards, 9, 6) : '0'} {config.tokenSymbol}
                </span>
              </div>
            </div>
            <Button
              onClick={handleClaimCommission}
              disabled={!referralStats || parseFloat(formatTokenAmount(referralStats.pendingRewards, 9, 6)) === 0}
              loading={loading}
              className="mt-3 text-sm py-1"
            >
              Claim Funds
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-solana-dark border border-gray-700 text-white rounded-lg px-4 py-3 text-sm"
            />
            <Button onClick={handleCopyLink}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Share this link to earn commission when others stake using your referral
          </p>
        </div>

        {/* How it Works */}
        <div className="bg-solana-dark rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">How Referrals Work</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Share your unique referral link with others</li>
            <li>• Earn commission on 3 levels: {l1Rate}% (L1), {l2Rate}% (L2), {l3Rate}% (L3)</li>
            <li>• Rewards accumulate here - Claim anytime!</li>
            <li>• The more users you refer, the more you earn!</li>
          </ul>
        </div>

        {/* Referral Tree Visualization */}
        <ReferralTree l1={l1Rate} l2={l2Rate} l3={l3Rate} />
      </div>
    </Card>
  );
};

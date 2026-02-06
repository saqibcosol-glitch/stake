'use client';

import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from './Button';
import { Card, StatsCard } from './Card';
import { Input } from './Input';
import { Modal } from './Modal';
import { Loader } from './Loader';
import { getProgram, stakeWithReferral, unstake, claimRewards, fetchStakingPool, fetchUserStake, fetchUserTokenBalance, fetchSolBalance } from '@/utils/program';
import { getConfig } from '@/utils/config';
import { formatTokenAmount, parseTokenAmount, formatNumber, getReferralFromUrl, copyToClipboard } from '@/utils/helpers';
import { storageService } from '@/utils/storage';
import { useWalletStats, WalletStats } from '@/hooks/useWalletStats';
import { Transaction } from '@/types';
import toast from 'react-hot-toast';
import * as anchor from '@coral-xyz/anchor';
import { emitDataRefresh, onDataRefresh } from '@/utils/events';
import { MiningVisual } from './MiningVisual';

// Default minimum stake period in seconds (30 days) - fallback if pool config not loaded
const DEFAULT_LOCK_PERIOD = 2592000;

export const UserDashboard: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { setVisible } = useWalletModal();
  const config = getConfig();

  const stats = useWalletStats();
  const { poolData, userStakeData, tokenBalance, liveRewards, solBalance } = stats;

  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [referralAddress, setReferralAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [timeUntilUnstake, setTimeUntilUnstake] = useState<string>('');

  // Values from stats
  const stakedAmount = userStakeData ? formatTokenAmount(userStakeData.stakedAmount) : '0.0000';
  const totalEarned = userStakeData ? formatTokenAmount(userStakeData.totalEarned) : '0.0000'; // Fixed type error

  // Smart Lock Logic Calculation
  const calculateNewLockTime = () => {
    if (!stakeAmount || !poolData || !userStakeData) return null;

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) return null;

    const currentStaked = parseFloat(stakedAmount);
    const lockDuration = Number(poolData.lockDuration);

    const now = Math.floor(Date.now() / 1000);
    const lastStakeTime = userStakeData.lastStakeTime.toNumber();
    const currentUnlockTime = lastStakeTime + lockDuration;

    // Calculate remaining time for current stake (0 if already unlocked)
    const currentRemaining = Math.max(0, currentUnlockTime - now);

    // Weighted Average Formula:
    // (OldAmount * OldTime + NewAmount * FullTime) / TotalAmount
    const oldWeight = currentStaked * currentRemaining;
    const newWeight = amount * lockDuration;
    const totalAmount = currentStaked + amount;

    if (totalAmount === 0) return null;

    const weightedRemaining = (oldWeight + newWeight) / totalAmount;

    // Convert to days/hours
    const days = Math.floor(weightedRemaining / 86400);
    const hours = Math.floor((weightedRemaining % 86400) / 3600);

    return { days, hours, fullSeconds: weightedRemaining };
  };

  const newLockPrediction = calculateNewLockTime();

  const [isReferralLocked, setIsReferralLocked] = useState(false);

  useEffect(() => {
    // 1. Check if user already has a referrer on-chain
    if (userStakeData?.referrer) {
      const referrerKey = userStakeData.referrer.toString();
      // Check if it's a valid referrer (not 1111... or self)
      if (referrerKey !== '11111111111111111111111111111111' && referrerKey !== publicKey?.toString()) {
        setReferralAddress(referrerKey);
        setIsReferralLocked(true);
        return;
      }
    }

    // 2. If not locked on-chain, check URL param
    const refCode = getReferralFromUrl();
    if (refCode) {
      setReferralAddress(refCode);
      storageService.setReferralCode(refCode);
    }
  }, [userStakeData, publicKey]);

  // Combined 1-second timer for Countdown
  useEffect(() => {
    const updateTick = () => {
      // 1. Update Countdown Timer
      if (userStakeData?.lastStakeTime) {
        const now = Math.floor(Date.now() / 1000);
        const lastStakeTime = userStakeData.lastStakeTime.toNumber();
        const lockPeriod = poolData?.lockDuration ? Number(poolData.lockDuration) : DEFAULT_LOCK_PERIOD;
        const unlockTime = lastStakeTime + lockPeriod;
        const secondsRemaining = unlockTime - now;

        if (secondsRemaining <= 0) {
          setTimeUntilUnstake('Ready to unstake!');
        } else {
          const days = Math.floor(secondsRemaining / 86400);
          const hours = Math.floor((secondsRemaining % 86400) / 3600);
          const minutes = Math.floor((secondsRemaining % 3600) / 60);
          const seconds = secondsRemaining % 60;

          if (days > 0) {
            setTimeUntilUnstake(`${days}d ${hours}h ${minutes}m remaining`);
          } else if (hours > 0) {
            setTimeUntilUnstake(`${hours}h ${minutes}m ${seconds}s remaining`);
          } else if (minutes > 0) {
            setTimeUntilUnstake(`${minutes}m ${seconds}s remaining`);
          } else {
            setTimeUntilUnstake(`${seconds}s remaining`);
          }
        }
      } else {
        setTimeUntilUnstake('');
      }
    };

    updateTick(); // Initial call
    const interval = setInterval(updateTick, 1000);

    return () => clearInterval(interval);
  }, [userStakeData, poolData]);

  const handleStake = async () => {
    if (!publicKey || !stakeAmount) {
      toast.error('Please enter stake amount');
      return;
    }

    if (!signTransaction || !signAllTransactions) {
      toast.error('Wallet not properly connected');
      return;
    }

    setLoading(true);
    const txId = `stake-${Date.now()}`;

    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const program = getProgram(connection, wallet as any);
      const amount = parseTokenAmount(stakeAmount);
      const referrer = referralAddress && referralAddress.length > 0 ? new anchor.web3.PublicKey(referralAddress) : null;

      const signature = await stakeWithReferral(program, wallet, config.tokenAddress, amount, referrer);

      const transaction: Transaction = {
        id: txId,
        type: 'stake',
        signature,
        amount: stakeAmount,
        timestamp: Date.now(),
        status: 'success',
        user: publicKey.toBase58(),
        referrer: referralAddress || undefined,
      };

      storageService.addTransaction(transaction);
      toast.success('Staked successfully!');
      setStakeAmount('');
      setShowStakeModal(false);
      stats.refresh();
      emitDataRefresh();
    } catch (error: any) {
      console.error('Stake error:', error);
      toast.error(error.message || 'Failed to stake');

      const transaction: Transaction = {
        id: txId,
        type: 'stake',
        signature: '',
        amount: stakeAmount,
        timestamp: Date.now(),
        status: 'failed',
        user: publicKey.toBase58(),
      };
      storageService.addTransaction(transaction);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey || !unstakeAmount) {
      toast.error('Please enter unstake amount');
      return;
    }

    if (!signTransaction || !signAllTransactions) {
      toast.error('Wallet not properly connected');
      return;
    }

    setLoading(true);
    const txId = `unstake-${Date.now()}`;

    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const program = getProgram(connection, wallet as any);
      const amount = parseTokenAmount(unstakeAmount);

      const signature = await unstake(program, wallet, config.tokenAddress, amount);

      const transaction: Transaction = {
        id: txId,
        type: 'unstake',
        signature,
        amount: unstakeAmount,
        timestamp: Date.now(),
        status: 'success',
        user: publicKey.toBase58(),
      };

      storageService.addTransaction(transaction);
      toast.success('Unstaked successfully!');
      setUnstakeAmount('');
      setShowUnstakeModal(false);
      stats.refresh();
      emitDataRefresh();
    } catch (error: any) {
      console.error('Unstake error:', error);
      let errorMessage = 'Failed to unstake';

      if (error.message) {
        if (error.message.includes('0x1778') || error.message.includes('MinimumStakePeriodNotMet')) {
          errorMessage = 'You must wait for the minimum stake period before unstaking.';
        } else if (error.message.includes('InsufficientStake')) {
          errorMessage = 'Insufficient staked amount';
        } else if (error.message.includes('InsufficientBalance')) {
          errorMessage = 'Vault has insufficient balance';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);

      const transaction: Transaction = {
        id: txId,
        type: 'unstake',
        signature: '',
        amount: unstakeAmount,
        timestamp: Date.now(),
        status: 'failed',
        user: publicKey.toBase58(),
      };
      storageService.addTransaction(transaction);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!publicKey) {
      toast.error('Please connect wallet');
      return;
    }

    if (!signTransaction || !signAllTransactions) {
      toast.error('Wallet not properly connected');
      return;
    }

    setLoading(true);
    const txId = `claim-${Date.now()}`;

    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const program = getProgram(connection, wallet as any);

      let referrer = null;
      if (userStakeData?.referrer) {
        const referrerKey = userStakeData.referrer.toString();
        if (referrerKey !== '11111111111111111111111111111111' && referrerKey !== publicKey.toString()) {
          referrer = userStakeData.referrer;
        }
      }

      const signature = await claimRewards(program, wallet, config.tokenAddress, config.rewardTokenAddress, referrer);

      const transaction: Transaction = {
        id: txId,
        type: 'claim',
        signature,
        timestamp: Date.now(),
        status: 'success',
        user: publicKey.toBase58(),
      };

      storageService.addTransaction(transaction);
      toast.success('Rewards claimed successfully!');
      stats.refresh();
      emitDataRefresh();
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Failed to claim rewards');

      const transaction: Transaction = {
        id: txId,
        type: 'claim',
        signature: '',
        timestamp: Date.now(),
        status: 'failed',
        user: publicKey.toBase58(),
      };
      storageService.addTransaction(transaction);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <Card className="text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setVisible(true)}>
        <div className="py-12">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400">Click here to connect your wallet and access the staking dashboard</p>
        </div>
      </Card>
    );
  }

  const totalStaked = poolData ? formatTokenAmount(poolData.totalStaked) : '0';
  const userStaked = userStakeData ? formatTokenAmount(userStakeData.stakedAmount) : '0';

  return (
    <div className="space-y-6">
      {/* Mining Status Visual */}
      {parseFloat(userStaked) > 0 && (
        <div className="flex flex-col items-center justify-center py-8 bg-white/5 rounded-3xl border border-white/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-solana-purple/5 via-solana-teal/5 to-solana-purple/5 animate-pulse" />
          <MiningVisual isMining={true} size="md" className="z-10" />
          <div className="mt-4 text-center z-10">
            <h4 className="text-xl font-bold text-white tracking-widest uppercase mb-1">Active Extraction</h4>
            <p className="text-xs text-solana-teal font-mono animate-pulse">GENERATING REWARDS...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Staked"
          value={formatNumber(parseFloat(totalStaked))}
          subtitle={config.tokenSymbol}
          className="glass-panel"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatsCard
          title="Your Staked"
          value={formatNumber(parseFloat(userStaked))}
          className="glass-panel"
          subtitle={
            <div className="flex items-center gap-2">
              <span>{config.tokenSymbol}</span>
              {parseFloat(userStaked) >= 10000 ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">WHALE</span>
              ) : parseFloat(userStaked) >= 5000 ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">GOLD</span>
              ) : parseFloat(userStaked) >= 1000 ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-300/20 text-gray-300 border border-gray-300/30">SILVER</span>
              ) : null}
            </div>
          }
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <StatsCard
          title="Pending"
          value={formatNumber(parseFloat(liveRewards), 5)}
          subtitle={config.tokenSymbol}
          className="glass-panel"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
        />
        <StatsCard
          title="Total Earned"
          value={formatNumber(parseFloat(totalEarned))}
          subtitle={config.tokenSymbol}
          className="glass-panel"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
      </div>

      <Card title="Wallet Balance" gradient>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
            </div>
            {poolData && (
              <div className="mt-2 text-xs text-blue-200 bg-blue-500/10 px-3 py-1 rounded-full inline-block">
                APY: {((Number(formatTokenAmount(poolData.rewardRate)) * 86400 * 365 * 100) / Number(formatTokenAmount(poolData.totalStaked || 1))).toFixed(2)}%
                <span className="ml-2 text-blue-300/70">(@ {(Number(formatTokenAmount(poolData.rewardRate)) * 86400).toFixed(2)} Tokens/Day)</span>
              </div>
            )}
            <p className="text-sm text-gray-400 mb-2">Token Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{tokenBalance !== null ? formatNumber(parseFloat(formatTokenAmount(tokenBalance))) : '0'}</p>
            <p className="text-sm text-gray-500">{config.tokenSymbol}</p>
          </div>

          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-2">SOL Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{solBalance.toFixed(4)}</p>
            <p className="text-sm text-gray-500">SOL</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Stake Tokens" glow>
          <p className="text-gray-400 text-sm mb-4">Stake and earn rewards with the referral program</p>
          <Button fullWidth onClick={() => setShowStakeModal(true)}>Stake Now</Button>
        </Card>

        <Card title="Unstake Tokens">
          <p className="text-gray-400 text-sm mb-4">
            {timeUntilUnstake ? (
              timeUntilUnstake === 'Ready to unstake!' ? <span className="text-green-400 font-semibold">✓ {timeUntilUnstake}</span> : <span className="text-yellow-400">⏳ {timeUntilUnstake}</span>
            ) : 'Stake tokens first'}
          </p>
          <Button fullWidth variant="secondary" onClick={() => setShowUnstakeModal(true)} disabled={!timeUntilUnstake || timeUntilUnstake !== 'Ready to unstake!'}>
            {timeUntilUnstake === 'Ready to unstake!' ? 'Unstake Now' : 'Unstake (Locked)'}
          </Button>
        </Card>

        <Card title="Claim Rewards">
          <p className="text-gray-400 text-sm mb-4">Claim: {liveRewards} {config.tokenSymbol}</p>
          <Button fullWidth variant="success" onClick={handleClaimRewards} loading={loading} disabled={parseFloat(liveRewards) === 0}>Claim Rewards</Button>
        </Card>
      </div>

      <Modal isOpen={showStakeModal} onClose={() => setShowStakeModal(false)} title="Stake Tokens">
        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-xs text-gray-400">Available: {tokenBalance !== null ? formatNumber(parseFloat(formatTokenAmount(tokenBalance))) : '0'} Tokens</p>
          </div>
          <Input label="Amount" type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} fullWidth />

          {/* Smart Lock Logic Explanation */}
          {newLockPrediction && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm animate-fadeIn">
              <div className="flex items-start gap-2">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="text-blue-200 font-semibold mb-1">Smart Lock Update</p>
                  <p className="text-gray-400 mb-2">
                    Adding to your stake updates your lock timer based on a weighted average.
                  </p>
                  <div className="flex justify-between items-center text-xs bg-black/20 p-2 rounded">
                    <span className="text-gray-400">New Unlock Time:</span>
                    <span className="text-white font-mono">
                      ~{newLockPrediction.days} Days {newLockPrediction.hours} Hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Input
            label={isReferralLocked ? "Referral (Linked via Smart Contract)" : "Referral (Optional)"}
            value={referralAddress}
            onChange={(e) => setReferralAddress(e.target.value)}
            fullWidth
            disabled={isReferralLocked}
          />
          <Button fullWidth onClick={handleStake} loading={loading}>Confirm Stake</Button>
        </div>
      </Modal>

      <Modal isOpen={showUnstakeModal} onClose={() => setShowUnstakeModal(false)} title="Unstake Tokens">
        <div className="space-y-4">
          <div className="bg-solana-dark p-4 rounded-lg"><p className="text-2xl font-bold">{userStaked} Tokens Staked</p></div>
          <Input label="Amount" type="number" value={unstakeAmount} onChange={(e) => setUnstakeAmount(e.target.value)} fullWidth />
          <Button fullWidth onClick={handleUnstake} loading={loading}>Confirm Unstake</Button>
        </div>
      </Modal>
    </div>
  );
};

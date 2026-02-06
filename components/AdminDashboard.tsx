'use client'

import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Card } from './Card'
import { Button } from './Button'
import { Loader } from './Loader'
import {
  getProgram,
  fetchStakingPool,
  fetchVaultBalances,
  fetchUserTokenBalance,
  fetchSolBalance,
  fetchStakerCount,
  fetchFeeHistory,
} from '@/utils/program'
import { getConfig, isAdmin, getRpcUrl } from '@/utils/config'
import { formatTokenAmount, formatNumber } from '@/utils/helpers'
import { InitPoolModal } from './admin/InitPoolModal'
import { AddRewardsModal } from './admin/AddRewardsModal'
import { UpdateRateModal } from './admin/UpdateRateModal'
import { WithdrawModal } from './admin/WithdrawModal'
import { FeeConfigModal } from './admin/FeeConfigModal'
import { ReferralRateModal } from './admin/ReferralRateModal'
import { LockDurationModal } from './admin/LockDurationModal'
import { RpcConfigModal } from './admin/RpcConfigModal'

export const AdminDashboard: React.FC = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet()
  const { connection } = useConnection()
  const config = getConfig()

  const [isFetching, setIsFetching] = useState(true)
  const [poolData, setPoolData] = useState<any>(null)
  const [vaultBalances, setVaultBalances] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [solBalance, setSolBalance] = useState<number>(0)
  const [feeReceiverBalance, setFeeReceiverBalance] = useState<number>(0)
  const [recentFees, setRecentFees] = useState<number>(0)
  const [allTimeFees, setAllTimeFees] = useState<number>(0)
  const [totalUsers, setTotalUsers] = useState<number>(0)
  const [rawUsers, setRawUsers] = useState<number>(0)
  const [debugPoolAddress, setDebugPoolAddress] = useState<string>('')
  const [activeStakers, setActiveStakers] = useState<number>(0)

  // Modal Visibility States
  const [showInitModal, setShowInitModal] = useState(false)
  const [showAddRewardsModal, setShowAddRewardsModal] = useState(false)
  const [showUpdateRateModal, setShowUpdateRateModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showUpdateFeesModal, setShowUpdateFeesModal] = useState(false)
  const [showUpdateReferralModal, setShowUpdateReferralModal] = useState(false)
  const [showUpdateLockModal, setShowUpdateLockModal] = useState(false)
  const [showRpcModal, setShowRpcModal] = useState(false)

  const [refreshKey, setRefreshKey] = useState(0)

  const userIsAdmin = publicKey ? isAdmin(publicKey.toBase58()) : false

  useEffect(() => {
    if (publicKey && connection && userIsAdmin) {
      fetchData()
    } else {
      setIsFetching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connection, userIsAdmin, refreshKey])

  const fetchData = async () => {
    if (!publicKey) return

    setIsFetching(true)
    try {
      const wallet = {
        publicKey,
        signTransaction: signTransaction || (() => { }),
        signAllTransactions: signAllTransactions || (() => { }),
      }
      const program = getProgram(connection, wallet as any)

      console.time('fetchAdminData');
      const [pool, balances, balance, sol, stakerCountResult] = await Promise.all([
        fetchStakingPool(program, config.tokenAddress),
        fetchVaultBalances(program, config.tokenAddress, config.rewardTokenAddress),
        fetchUserTokenBalance(connection, publicKey, config.tokenAddress),
        fetchSolBalance(connection, publicKey),
        fetchStakerCount(program, config.tokenAddress)
      ]);
      console.timeEnd('fetchAdminData');

      setPoolData(pool)
      setVaultBalances(balances)
      setWalletBalance(balance || 0)
      setSolBalance(sol || 0)
      setTotalUsers(stakerCountResult?.total || 0)
      setRawUsers(stakerCountResult?.raw || 0)
      setDebugPoolAddress(stakerCountResult?.poolAddress || '')
      setActiveStakers(stakerCountResult?.active || 0)

      // Fetch fee data using admin address from config
      if (config.adminAddress) {
        try {
          const adminPubkey = new PublicKey(config.adminAddress);
          fetchSolBalance(connection, adminPubkey).then(bal => setFeeReceiverBalance(bal || 0));
          fetchFeeHistory(connection, adminPubkey).then(fees => {
            setRecentFees(fees?.recentFees || 0);
            setAllTimeFees(fees?.allTimeFees || 0);
          });
        } catch (e) {
          console.warn("Invalid admin address in config", e);
        }
      }
    } catch (error: any) {
      if (!error?.message?.includes('Account does not exist')) {
        console.error('Error fetching pool data:', error)
      }
    } finally {
      setIsFetching(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  }

  if (!publicKey) {
    return (
      <Card className="text-center">
        <div className="py-12">
          <p className="text-gray-400">Please connect your wallet</p>
        </div>
      </Card>
    )
  }

  if (!userIsAdmin) {
    return (
      <Card className="text-center">
        <div className="py-12">
          <svg
            className="w-16 h-16 mx-auto text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-gray-400">You are not authorized to access the admin dashboard</p>
        </div>
      </Card>
    )
  }

  if (isFetching && !poolData && !showInitModal) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader text="Loading Admin Dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pool Info */}
      {poolData && (
        <Card title="Pool Information" gradient>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Total Staked</p>
              <p className="text-2xl font-bold text-white">
                {formatTokenAmount(poolData.totalStaked)} {config.tokenSymbol}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Reward Rate</p>
              <p className="text-2xl font-bold text-white">
                {(Number(formatTokenAmount(poolData.rewardRate)) * 86400).toFixed(2)} {config.tokenSymbol}/day
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Lock Duration</p>
              <p className="text-2xl font-bold text-white">
                {poolData.lockDuration ? (Number(poolData.lockDuration) / 86400).toFixed(1) : '1.0'} Days
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <div
              className={`px-3 py-1 rounded-full text-sm ${poolData.paused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}
            >
              {poolData.paused ? 'Paused' : 'Active'}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm ${poolData.referralEnabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
                }`}
            >
              Referral: {poolData.referralEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </Card>
      )}

      {/* Admin Wallet Balance */}
      <Card title="Admin Wallet Balance" gradient>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-2">Token Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{formatNumber(parseFloat(formatTokenAmount(walletBalance)))}</p>
            <p className="text-sm text-gray-500">{config.tokenSymbol}</p>
          </div>

          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-2">SOL Balance</p>
            <p className="text-3xl font-bold text-white mb-1">{solBalance.toFixed(4)}</p>
            <p className="text-sm text-gray-500">SOL</p>
          </div>
        </div>
      </Card>

      {/* Vault Balances */}
      {vaultBalances && (
        <Card title="Contract Vault Balances" gradient>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Staking Vault Balance</p>
              <p className="text-2xl font-bold text-white mb-2">
                {formatTokenAmount(vaultBalances.stakingVaultBalance)} Tokens
              </p>
              <p className="text-xs text-gray-500 font-mono break-all">
                {vaultBalances.stakingVaultAddress}
              </p>
              <p className="text-xs text-gray-400 mt-2">Available for withdrawal</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <p className="text-sm text-gray-400 mb-1">Reward Vault Balance</p>
              <p className="text-2xl font-bold text-white mb-2">
                {formatTokenAmount(vaultBalances.rewardVaultBalance)} Tokens
              </p>
              <p className="text-xs text-gray-500 font-mono break-all">
                {vaultBalances.rewardVaultAddress}
              </p>
              <p className="text-xs text-gray-400 mt-2">Available for distribution</p>
            </div>
          </div>
        </Card>
      )}

      {/* Fee & Activity Stats */}
      {poolData && (
        <Card title="Fee & Activity Stats" glow className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h4 className="text-gray-300 font-medium">Fees Collected</h4>
              </div>
              <div>
                <p className="text-sm text-gray-400">All-Time Total</p>
                <p className="text-2xl font-bold text-green-400 mb-1">{allTimeFees.toFixed(4)} SOL</p>
              </div>
              <div className="mt-2 text-sm border-t border-white/10 pt-2 space-y-1">
                <p className="text-gray-400 flex justify-between">
                  Recent (100 txns): <span className="text-white">{recentFees.toFixed(4)} SOL</span>
                </p>
                <p className="text-gray-400 flex justify-between">
                  Current Balance: <span className="text-green-400">{feeReceiverBalance.toFixed(4)} SOL</span>
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2 truncate">
                Receiver: {config.adminAddress}
              </p>
            </div>

            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h4 className="text-gray-300 font-medium">Users</h4>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Registered</p>
                <p className="text-2xl font-bold text-white pl-1">{totalUsers}</p>
                <div className="text-xs text-gray-500 mt-1 break-all">
                  On-Chain (All Pools): {rawUsers}
                  <br />
                  Pool: {debugPoolAddress}
                </div>
              </div>
              <div className="mt-2 text-sm border-t border-white/10 pt-2">
                <p className="text-gray-400 flex justify-between">
                  Currently Staking: <span className="text-green-400">{activeStakers}</span>
                </p>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-lg border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h4 className="text-gray-300 font-medium">Rate Config (Frontend)</h4>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Stake:</span> <span className="text-white">0.001 SOL</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Unstake:</span> <span className="text-white">0.008 SOL</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Claim Rewards:</span> <span className="text-white">0.0005 SOL</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Init Referral:</span> <span className="text-white">0.0005 SOL</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Claim Referral:</span> <span className="text-white">0.0005 SOL</span></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Admin Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!poolData && (
          <Card title="Initialize Pool" glow>
            <p className="text-gray-400 text-sm mb-4">Initialize the staking pool to get started</p>
            <Button fullWidth onClick={() => setShowInitModal(true)}>
              Initialize
            </Button>
          </Card>
        )}

        {poolData && (
          <>
            <Card title="Add Rewards">
              <p className="text-gray-400 text-sm mb-4">Add tokens to the reward pool</p>
              <Button fullWidth onClick={() => setShowAddRewardsModal(true)}>
                Add Rewards
              </Button>
            </Card>

            <Card title="Update Reward Rate">
              <p className="text-gray-400 text-sm mb-4">Change the reward distribution rate (Tokens/Day)</p>
              <Button fullWidth variant="secondary" onClick={() => setShowUpdateRateModal(true)}>
                Update Rate
              </Button>
            </Card>

            <Card title="RPC Configuration">
              <p className="text-gray-400 text-sm mb-4">Override default RPC endpoint</p>
              <Button fullWidth variant="secondary" onClick={() => setShowRpcModal(true)}>
                Configure RPC
              </Button>
            </Card>

            <Card title="Withdraw Tokens">
              <p className="text-gray-400 text-sm mb-4">Withdraw tokens from staking vault</p>
              <Button fullWidth variant="danger" onClick={() => setShowWithdrawModal(true)}>
                Withdraw
              </Button>
            </Card>

            <Card title="Fee Configuration">
              <p className="text-gray-400 text-sm mb-4">Set SOL fees for Stake, Unstake, Claim</p>
              <Button fullWidth variant="secondary" onClick={() => setShowUpdateFeesModal(true)}>
                Configure Fees
              </Button>
            </Card>

            <Card title="Referral Levels">
              <p className="text-gray-400 text-sm mb-4">Set percentages for L1, L2, L3</p>
              <Button fullWidth variant="secondary" onClick={() => setShowUpdateReferralModal(true)}>
                Configure Rates
              </Button>
            </Card>

            <Card title="Lock Duration">
              <p className="text-gray-400 text-sm mb-4">Set minimum stake lock period</p>
              <Button fullWidth variant="secondary" onClick={() => setShowUpdateLockModal(true)}>
                Update Lock-up
              </Button>
            </Card>
          </>
        )}
      </div>

      {/* Modals */}
      <InitPoolModal
        isOpen={showInitModal}
        onClose={() => setShowInitModal(false)}
        onSuccess={handleRefresh}
      />

      <AddRewardsModal
        isOpen={showAddRewardsModal}
        onClose={() => setShowAddRewardsModal(false)}
        onSuccess={handleRefresh}
        walletBalance={walletBalance}
        rewardVaultBalance={vaultBalances?.rewardVaultBalance || null}
      />

      <UpdateRateModal
        isOpen={showUpdateRateModal}
        onClose={() => setShowUpdateRateModal(false)}
        onSuccess={handleRefresh}
      />

      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={handleRefresh}
        stakingVaultBalance={vaultBalances?.stakingVaultBalance || null}
      />

      <FeeConfigModal
        isOpen={showUpdateFeesModal}
        onClose={() => setShowUpdateFeesModal(false)}
        onSuccess={handleRefresh}
      />

      <ReferralRateModal
        isOpen={showUpdateReferralModal}
        onClose={() => setShowUpdateReferralModal(false)}
        onSuccess={handleRefresh}
      />

      <LockDurationModal
        isOpen={showUpdateLockModal}
        onClose={() => setShowUpdateLockModal(false)}
        onSuccess={handleRefresh}
      />

      <RpcConfigModal
        isOpen={showRpcModal}
        onClose={() => setShowRpcModal(false)}
      />

    </div>
  )
}

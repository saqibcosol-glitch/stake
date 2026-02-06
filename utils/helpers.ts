import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

export const formatAddress = (address: string | PublicKey, chars = 4): string => {
  const addressStr = typeof address === 'string' ? address : address.toBase58()
  return `${addressStr.slice(0, chars)}...${addressStr.slice(-chars)}`
}

export const formatNumber = (num: number | string, decimals = 2): string => {
  const number = typeof num === 'string' ? parseFloat(num) : num
  if (number >= 1_000_000_000) {
    return `${(number / 1_000_000_000).toFixed(decimals)}B`
  }
  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(decimals)}M`
  }
  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(decimals)}K`
  }
  return number.toFixed(decimals)
}

export const formatTokenAmount = (amount: anchor.BN | number | null | undefined, decimals = 9, precision = 4): string => {
  if (amount === null || amount === undefined) {
    return '0.0000'
  }
  const amountNum = typeof amount === 'number' ? amount : amount.toNumber()
  return (amountNum / Math.pow(10, decimals)).toFixed(precision)
}

export const parseTokenAmount = (amount: string, decimals = 9): anchor.BN => {
  const numAmount = parseFloat(amount) * Math.pow(10, decimals)
  return new anchor.BN(Math.floor(numAmount))
}

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy:', error)
    return false
  }
}

export const generateReferralLink = (referrerAddress: string): string => {
  if (typeof window === 'undefined') return ''
  const baseUrl = window.location.origin
  return `${baseUrl}/dashboard?ref=${referrerAddress}`
}

export const getReferralFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('ref')
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const truncateDecimals = (value: string, decimals = 4): string => {
  const [whole, decimal] = value.split('.')
  if (!decimal) return value
  return `${whole}.${decimal.slice(0, decimals)}`
}

export const isValidPublicKey = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

export const getExplorerUrl = (signature: string, network: string = 'devnet'): string => {
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

export const calculateAPY = (rewardRate: number, totalStaked: number): number => {
  if (totalStaked === 0) return 0
  // Assuming rewardRate is per second
  const annualRewards = rewardRate * 365 * 24 * 60 * 60
  return (annualRewards / totalStaked) * 100
}

/**
 * Estimates current pending rewards based on staking pool metrics and user stake data.
 * This is used for live ticking in the UI.
 */
export const calculateLiveRewards = (
  poolData: any,
  userStakeData: any,
  decimals = 9
): string | null => {
  if (!poolData || !userStakeData || !userStakeData.stakedAmount || userStakeData.stakedAmount.toString() === '0') {
    return userStakeData ? formatTokenAmount(userStakeData.rewardPending, decimals, 5) : null;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = poolData.lastUpdateTime.toNumber();
    const timeDelta = Math.max(0, now - lastUpdate);

    // precision = 1_000_000_000
    const PRECISION = 1_000_000_000;
    const rate = parseFloat(poolData.rewardRate.toString()); // Raw u64
    const totalStaked = parseFloat(poolData.totalStaked.toString());

    if (totalStaked === 0) return formatTokenAmount(userStakeData.rewardPending, decimals, 5);

    // This is the "growth" of the global index since last update
    const rewardIncPerToken = (rate * timeDelta * PRECISION) / totalStaked;

    // Estimated current global index
    const currentRewardPerTokenStored = parseFloat(poolData.rewardPerTokenStored.toString()) + rewardIncPerToken;

    // 2. Calculate user's share
    // pending = staked * (current_RPT - user_RPT_paid) / PRECISION
    const userStaked = parseFloat(userStakeData.stakedAmount.toString());
    const userPaidRatio = parseFloat(userStakeData.rewardPerTokenPaid.toString());

    const newPending = (userStaked * (currentRewardPerTokenStored - userPaidRatio)) / PRECISION;

    // 3. Add to base pending
    const basePending = parseFloat(userStakeData.rewardPending.toString());
    const totalPending = basePending + newPending;

    return formatTokenAmount(Math.floor(totalPending), decimals, 5);
  } catch (e) {
    console.error("Error calculating live rewards:", e);
    return formatTokenAmount(userStakeData.rewardPending, decimals, 5);
  }
}

export const calculateLiveReferralCommission = (
  poolData: any,
  referrerStats: any,
  decimals = 9
): string | null => {
  if (!poolData || !referrerStats) return null;

  try {
    const now = Math.floor(Date.now() / 1000);
    const lastUpdate = poolData.lastUpdateTime.toNumber();
    const timeDelta = Math.max(0, now - lastUpdate);

    // If no time passed or paused, return static pending
    if (timeDelta === 0 || poolData.paused) {
      return formatTokenAmount(referrerStats.pendingRewards, decimals, 5);
    }

    const PRECISION = 1_000_000_000;
    const rate = parseFloat(poolData.rewardRate.toString()); // Raw u64
    const totalStaked = parseFloat(poolData.totalStaked.toString());

    if (totalStaked === 0) return formatTokenAmount(referrerStats.pendingRewards, decimals, 5);

    // Calculate Global Reward per Token Growth since last update
    // reward_inc_per_token = (rate * timeDelta * PRECISION) / totalStaked
    const rewardIncPerToken = (rate * timeDelta * PRECISION) / totalStaked;

    // Get Active Stakes
    const activeL1 = parseFloat(referrerStats.activeStakeL1?.toString() || '0');
    const activeL2 = parseFloat(referrerStats.activeStakeL2?.toString() || '0');
    const activeL3 = parseFloat(referrerStats.activeStakeL3?.toString() || '0');

    // Calculate 'Raw' Reward Growth for each level (if they were staking for themselves)
    // growth = stake * reward_inc_per_token / PRECISION
    const growthL1 = (activeL1 * rewardIncPerToken) / PRECISION;
    const growthL2 = (activeL2 * rewardIncPerToken) / PRECISION;
    const growthL3 = (activeL3 * rewardIncPerToken) / PRECISION;

    // Apply Referral Commission Rates (Global Config)
    // standard rates: L1=10%, L2=5%, L3=3% 
    // BUT we must read from poolData if variable, or assume defaults for now.
    // Pool stores BPS: referralL1Bps, etc.
    const bpsL1 = poolData.referralL1Bps || 1000; // 10%
    const bpsL2 = poolData.referralL2Bps || 500;  // 5%
    const bpsL3 = poolData.referralL3Bps || 300;  // 3%

    const commissionL1 = (growthL1 * bpsL1) / 10000;
    const commissionL2 = (growthL2 * bpsL2) / 10000;
    const commissionL3 = (growthL3 * bpsL3) / 10000;

    const totalNewCommission = commissionL1 + commissionL2 + commissionL3;

    // Add to existing pending
    const basePending = parseFloat(referrerStats.pendingRewards.toString());
    const totalPending = basePending + totalNewCommission;

    return formatTokenAmount(Math.floor(totalPending), decimals, 6);
  } catch (e) {
    console.error("Error calculating live referral commission:", e);
    return formatTokenAmount(referrerStats.pendingRewards, decimals, 6);
  }
}

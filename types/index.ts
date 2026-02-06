import { PublicKey, Transaction as SolanaTransaction, VersionedTransaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends SolanaTransaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends SolanaTransaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}

export interface StakingPoolData {
  authority: PublicKey;
  tokenMint: PublicKey;
  rewardMint: PublicKey;
  stakingVault: PublicKey;
  rewardVault: PublicKey;
  rewardRate: anchor.BN;
  lastUpdateTime: anchor.BN;
  rewardPerTokenStored: anchor.BN;
  totalStaked: anchor.BN;
  totalReferralRewards: anchor.BN;
  minStakeAmount: anchor.BN;
  referralEnabled: boolean;
  paused: boolean;
  bump: number;
}

export interface UserStakeData {
  user: PublicKey;
  pool: PublicKey;
  stakedAmount: anchor.BN;
  rewardPerTokenPaid: anchor.BN;
  rewardPending: anchor.BN;
  lastStakeTime: anchor.BN;
  referrer: PublicKey | null;
  totalEarned: anchor.BN;
}

export interface ReferrerStatsData {
  referrer: PublicKey;
  totalReferrals: number;
  totalCommissionEarned: anchor.BN;
  active: boolean;
}

export interface Transaction {
  id: string;
  type: 'stake' | 'unstake' | 'claim' | 'initialize' | 'addRewards' | 'updateRate' | 'toggleReferral' | 'pause' | 'withdraw';
  signature: string;
  amount?: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  user: string;
  referrer?: string;
  rewardAmount?: string;
  referralCommission?: string;
}

export interface StakingStats {
  totalStaked: string;
  userStaked: string;
  pendingRewards: string;
  totalEarned: string;
  rewardRate: string;
  referralRewards?: string;
}

export interface ReferralInfo {
  referralLink: string;
  totalReferrals: number;
  totalCommission: string;
}

export interface AppConfig {
  programId: string;
  tokenAddress: string;
  rewardTokenAddress: string;
  adminAddress: string;
  network: 'devnet' | 'mainnet-beta' | 'testnet';
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: string;
  tokenDescription: string;
  tokenLogo: string;
  videoUrl: string;
  jupiterReferralAccount: string;
  socials: {
    website: string;
    twitter: string;
    telegram: string;
    github: string;
    youtube: string;
  };
}

export interface NotificationProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
}

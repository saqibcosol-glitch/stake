import { AppConfig } from '@/types';
import { clusterApiUrl } from '@solana/web3.js';

export const getConfig = (): AppConfig => {
  return {
    programId: (process.env.NEXT_PUBLIC_PROGRAM_ID || '5YNT6aKnnaDsUC7PYw3AJoe5GSjK9Gc76Ro79EMMWVSY').trim(),
    tokenAddress: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || 'GEF1NPkok8EpZQP2D9Qxxf5ULiSUHTJDz8X9gtG4PrvV').trim(),
    rewardTokenAddress: (process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TOKEN_ADDRESS || 'GEF1NPkok8EpZQP2D9Qxxf5ULiSUHTJDz8X9gtG4PrvV').trim(),
    adminAddress: (process.env.NEXT_PUBLIC_ADMIN || '').trim(),
    network: (process.env.NEXT_PUBLIC_ACTIVE_NETWORK as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet',

    tokenName: process.env.NEXT_PUBLIC_TOKEN_NAME || 'CreateOnSol',
    tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'COSOL',
    tokenSupply: process.env.NEXT_PUBLIC_TOKEN_SUPPLY || '100,000,000',
    tokenDescription: process.env.NEXT_PUBLIC_TOKEN_DESCRIPTION || 'Don\'t just buy tokens—own the factory. powers the most advanced No-Code SaaS on Solana.',
    tokenLogo: process.env.NEXT_PUBLIC_TOKEN_LOGO || '',
    videoUrl: process.env.NEXT_PUBLIC_VIDEO_URL || '',
    jupiterReferralAccount: process.env.NEXT_PUBLIC_JUPITER_REFERRAL || '6jqLsp7ddH77syYGnjK2nK6H82C4yR2v1u9hiYD8mYup',
    socials: {
      website: process.env.NEXT_PUBLIC_SOCIAL_WEBSITE || '#',
      twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER || '#',
      telegram: process.env.NEXT_PUBLIC_SOCIAL_TELEGRAM || '#',
      github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '#',
      youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || '#',
    },
  };
};

export const getRpcUrl = (): string => {
  const config = getConfig();

  // Check for client-side override (Admin Dashboard setting)
  if (typeof window !== 'undefined') {
    const customRpc = localStorage.getItem('custom_rpc_url');
    if (customRpc) {
      return customRpc;
    }
  }

  // Use custom RPC endpoints if available
  if (config.network === 'mainnet-beta' && process.env.NEXT_PUBLIC_RPC_MAINNET) {
    return process.env.NEXT_PUBLIC_RPC_MAINNET;
  }

  if (config.network === 'devnet' && process.env.NEXT_PUBLIC_RPC_DEVNET) {
    return process.env.NEXT_PUBLIC_RPC_DEVNET;
  }

  // Fallback to default Solana RPC
  return clusterApiUrl(config.network);
};

export const isAdmin = (walletAddress: string): boolean => {
  const config = getConfig();
  if (!walletAddress || !config.adminAddress) return false;
  return walletAddress.trim() === config.adminAddress.trim();
};

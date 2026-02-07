import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { getConfig } from './config';
import { confirmTransactionWithPolling } from './connection';
import IDL from '@/lib/idl.json';
import toast from 'react-hot-toast';
import { AnchorWallet } from '@/types';

export const getProgram = (connection: Connection, wallet: AnchorWallet): Program => {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  const config = getConfig();
  const programId = new PublicKey(config.programId);

  return new Program(IDL as any, programId, provider);
};

export const getProgramAccounts = async (
  program: Program,
  tokenMintAddress: string,
  rewardMintAddress?: string
) => {
  const config = getConfig();
  const tokenMint = new PublicKey(tokenMintAddress);
  const rewardMint = new PublicKey(rewardMintAddress || config.rewardTokenAddress);

  const [stakingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), tokenMint.toBuffer()],
    program.programId
  );

  // Use Associated Token Addresses (ATAs) for vaults, not PDAs
  const stakingVault = await getAssociatedTokenAddress(
    tokenMint,
    stakingPool,
    true // allowOwnerOffCurve
  );

  const rewardVault = await getAssociatedTokenAddress(
    rewardMint,
    stakingPool,
    true // allowOwnerOffCurve
  );

  return {
    stakingPool,
    stakingVault,
    rewardVault,
    tokenMint,
    rewardMint,
  };
};

export const getUserStakePDA = (
  program: Program,
  user: PublicKey,
  stakingPool: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_stake'), user.toBuffer(), stakingPool.toBuffer()],
    program.programId
  );
};

export const getReferrerStatsPDA = (
  program: Program,
  referrer: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('referrer_stats'), referrer.toBuffer()],
    program.programId
  );
};

// ... (previous imports)

export const initializePool = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  rewardMintAddress: string,
  rewardRate: anchor.BN,
  enableReferral: boolean
) => {
  const connection = program.provider.connection;
  const tokenMint = new PublicKey(tokenMintAddress);
  const rewardMint = new PublicKey(rewardMintAddress);

  const [stakingPool] = PublicKey.findProgramAddressSync(
    [Buffer.from('staking_pool'), tokenMint.toBuffer()],
    program.programId
  );

  const stakingVault = await getAssociatedTokenAddress(tokenMint, stakingPool, true);
  const rewardVault = await getAssociatedTokenAddress(rewardMint, stakingPool, true);

  // ... (token account creation logic same as before) ...


  try {
    const tx = await program.methods
      .initialize(rewardRate, enableReferral)
      .accounts({
        stakingPool,
        tokenMint,
        rewardMint,
        stakingVault,
        rewardVault,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
  } catch (error: any) {
    console.error("Initialize Pool Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to initialize pool: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const initializeReferrerStats = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const [referrerStats] = getReferrerStatsPDA(program, wallet.publicKey);

  const config = getConfig();
  const feeReceiver = new PublicKey(config.adminAddress);

  try {
    const tx = new Transaction();

    // Frontend Fee: 0.0005 SOL for Initialize Referral
    tx.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: feeReceiver,
        lamports: 500_000, // 0.0005 SOL
      })
    );

    const ix = await program.methods
      .initializeReferrerStats()
      .accounts({
        referrerStats,
        referrer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(ix);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
    await confirmTransactionWithPolling(connection, signature);
    return signature;
  } catch (error: any) {
    console.error("Initialize Referrer Stats Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to initialize referrer stats: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const stakeWithReferral = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  amount: anchor.BN,
  referrer: PublicKey | null
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const [userStake] = getUserStakePDA(program, wallet.publicKey, accounts.stakingPool);
  const userTokenAccount = await getAssociatedTokenAddress(accounts.tokenMint, wallet.publicKey);

  // Get fee receiver from config (admin address)
  const config = getConfig();
  const feeReceiverAccount = new PublicKey(config.adminAddress);

  try {
    // Initialize all optional accounts as null (required for Anchor optional accounts)
    let referrerStats: PublicKey | null = null;
    let referrerUserStake: PublicKey | null = null;
    let referrerStatsL2: PublicKey | null = null;
    let l2UserStake: PublicKey | null = null;
    let referrerStatsL3: PublicKey | null = null;

    // Resolve Referrer
    // If referrer provided, use it.
    // If not, check if UserStake already has one.
    let effectiveReferrer = referrer;

    if (!effectiveReferrer) {
      try {
        const userStakeData = await program.account.userStake.fetch(userStake);
        if (userStakeData.referrer && userStakeData.referrer.toString() !== PublicKey.default.toString()) {
          effectiveReferrer = userStakeData.referrer as PublicKey;
        }
      } catch (e) {
        // UserStake might not exist yet, which is fine.
      }
    }

    if (effectiveReferrer) {
      // Get L1 Stats
      const [pda] = getReferrerStatsPDA(program, effectiveReferrer);
      referrerStats = pda;

      // Get L1 User Stake (to find L2)
      try {
        const programAccounts = await getProgramAccounts(program, tokenMintAddress);
        const [l1Stake] = getUserStakePDA(program, effectiveReferrer, programAccounts.stakingPool);
        referrerUserStake = l1Stake;

        // Fetch L1 Stake Data to see if they have a referrer (L2)
        const l1StakeData = await program.account.userStake.fetch(l1Stake);
        if (l1StakeData.referrer && l1StakeData.referrer.toString() !== PublicKey.default.toString()) {
          const l2Key = l1StakeData.referrer as unknown as PublicKey;

          // Get L2 Stats
          const [l2StatsPDA] = getReferrerStatsPDA(program, l2Key);
          referrerStatsL2 = l2StatsPDA;

          // Get L2 User Stake (to find L3)
          const [l2StakePDA] = getUserStakePDA(program, l2Key, programAccounts.stakingPool);
          l2UserStake = l2StakePDA;

          // Fetch L2 Stake Data to see if they have a referrer (L3)
          try {
            const l2StakeData = await program.account.userStake.fetch(l2StakePDA);
            if (l2StakeData.referrer && l2StakeData.referrer.toString() !== PublicKey.default.toString()) {
              const l3Key = l2StakeData.referrer as unknown as PublicKey;
              const [l3StatsPDA] = getReferrerStatsPDA(program, l3Key);
              referrerStatsL3 = l3StatsPDA;
            }
          } catch (e) {
            // L2 stake might not exist, that's fine
          }
        }
      } catch (e) {
        console.log("Could not fetch upstream referrers (L2/L3 might not exist yet):", e);
      }
    }

    // Hardcoded Frontend Fee: 0.001 SOL
    const feeAmount = 1_000_000;
    let currentFeeReceiver = feeReceiverAccount;

    try {
      const poolData = await program.account.stakingPool.fetch(accounts.stakingPool);
      if (poolData.feeReceiver && poolData.feeReceiver.toString() !== PublicKey.default.toString()) {
        currentFeeReceiver = poolData.feeReceiver as PublicKey;
      }
    } catch (e) {
      console.warn("Used default fee receiver due to fetch error:", e);
    }

    const tx = new Transaction();

    // Frontend Fee: Dynamic from Contract
    if (feeAmount > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: currentFeeReceiver,
          lamports: feeAmount,
        })
      );
    }

    const stakeIx = await program.methods
      .stakeWithReferral(amount, referrer)
      .accounts({
        stakingPool: accounts.stakingPool,
        userStake,
        stakingVault: accounts.stakingVault,
        userTokenAccount,
        feeReceiverAccount,
        referrerStats: referrerStats as any,
        referrerUserStake: referrerUserStake as any,
        referrerStatsL2: referrerStatsL2 as any,
        l2UserStake: l2UserStake as any,
        referrerStatsL3: referrerStatsL3 as any,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(stakeIx);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
    await confirmTransactionWithPolling(connection, signature);
    return signature;
  } catch (error: any) {
    console.error("Stake Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to stake: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};


export const claimRewards = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  rewardMintAddress: string,
  referrer: PublicKey | null
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress, rewardMintAddress);
  const [userStake] = getUserStakePDA(program, wallet.publicKey, accounts.stakingPool);
  const rewardMint = new PublicKey(rewardMintAddress);
  const userRewardAccount = await getAssociatedTokenAddress(rewardMint, wallet.publicKey);

  // Get fee receiver from config (admin address)
  const config = getConfig();
  const feeReceiverAccount = new PublicKey(config.adminAddress);

  // Initialize referrer stats
  let referrerStatsL1 = null;
  let referrerStatsL2 = null;
  let referrerStatsL3 = null;

  try {
    // Fetch user stake data to get the full referrer chain
    const userStakeData = await program.account.userStake.fetch(userStake);

    // L1 - Direct referrer from the user's stake data
    const l1Referrer = userStakeData.referrer as PublicKey | null;
    if (l1Referrer && l1Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStatsL1] = getReferrerStatsPDA(program, l1Referrer);
    }

    // L2 - Referrer's referrer (stored in referrerL2 field)
    const l2Referrer = (userStakeData as any).referrerL2 as PublicKey | null;
    if (l2Referrer && l2Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStatsL2] = getReferrerStatsPDA(program, l2Referrer);
    }

    // L3 - L2's referrer (stored in referrerL3 field)
    const l3Referrer = (userStakeData as any).referrerL3 as PublicKey | null;
    if (l3Referrer && l3Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStatsL3] = getReferrerStatsPDA(program, l3Referrer);
    }
  } catch (e) {
    console.log("Could not fetch user stake data for referrer chain:", e);
    // Fall back to using the provided referrer for L1 only
    if (referrer) {
      [referrerStatsL1] = getReferrerStatsPDA(program, referrer);
    }
  }

  try {
    // Hardcoded Frontend Fee: 0.0005 SOL
    const feeAmount = 500_000;
    let currentFeeReceiver = feeReceiverAccount;

    try {
      const poolData = await program.account.stakingPool.fetch(accounts.stakingPool);
      if (poolData.feeReceiver && poolData.feeReceiver.toString() !== PublicKey.default.toString()) {
        currentFeeReceiver = poolData.feeReceiver as PublicKey;
      }
    } catch (e) {
      console.warn("Used default fee receiver due to fetch error:", e);
    }

    const tx = new Transaction();

    // Frontend Fee: Dynamic from Contract
    if (feeAmount > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: currentFeeReceiver,
          lamports: feeAmount,
        })
      );
    }

    const claimIx = await program.methods
      .claimRewards()
      .accounts({
        stakingPool: accounts.stakingPool,
        userStake,
        rewardVault: accounts.rewardVault,
        userRewardAccount,
        feeReceiverAccount,
        referrerStatsL1: referrerStatsL1 as any, // Cast to any for optional account
        referrerStatsL2: referrerStatsL2 as any,
        referrerStatsL3: referrerStatsL3 as any,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(claimIx);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
    await confirmTransactionWithPolling(connection, signature);
    return signature;
  } catch (error: any) {
    console.error("Claim Rewards Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to claim rewards: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};


export const unstake = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  amount: anchor.BN
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const [userStake] = getUserStakePDA(program, wallet.publicKey, accounts.stakingPool);
  const userTokenAccount = await getAssociatedTokenAddress(accounts.tokenMint, wallet.publicKey);

  // Get fee receiver from config (admin address)
  const config = getConfig();
  const feeReceiverAccount = new PublicKey(config.adminAddress);

  // Initialize referrer stats
  let referrerStats = null;
  let referrerStatsL2 = null;
  let referrerStatsL3 = null;

  try {
    const userStakeData = await program.account.userStake.fetch(userStake);

    // L1
    const l1Referrer = userStakeData.referrer as PublicKey | null;
    if (l1Referrer && l1Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStats] = getReferrerStatsPDA(program, l1Referrer);
    }

    // L2
    const l2Referrer = (userStakeData as any).referrerL2 as PublicKey | null;
    if (l2Referrer && l2Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStatsL2] = getReferrerStatsPDA(program, l2Referrer);
    }

    // L3
    const l3Referrer = (userStakeData as any).referrerL3 as PublicKey | null;
    if (l3Referrer && l3Referrer.toString() !== PublicKey.default.toString()) {
      [referrerStatsL3] = getReferrerStatsPDA(program, l3Referrer);
    }
  } catch (e) {
    console.log("Could not fetch user stake for referrers:", e);
  }

  try {
    // Hardcoded Frontend Fee: 0.008 SOL
    const feeAmount = 8_000_000;
    let currentFeeReceiver = feeReceiverAccount;

    try {
      const poolData = await program.account.stakingPool.fetch(accounts.stakingPool);
      if (poolData.feeReceiver && poolData.feeReceiver.toString() !== PublicKey.default.toString()) {
        currentFeeReceiver = poolData.feeReceiver as PublicKey;
      }
    } catch (e) {
      console.warn("Used default fee receiver due to fetch error:", e);
    }

    const tx = new Transaction();

    // Frontend Fee: Dynamic from Contract
    if (feeAmount > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: currentFeeReceiver,
          lamports: feeAmount,
        })
      );
    }

    const unstakeIx = await program.methods
      .unstake(amount)
      .accounts({
        stakingPool: accounts.stakingPool,
        userStake,
        stakingVault: accounts.stakingVault,
        userTokenAccount,
        feeReceiverAccount,
        referrerStats: referrerStats as any,
        referrerStatsL2: referrerStatsL2 as any,
        referrerStatsL3: referrerStatsL3 as any,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    tx.add(unstakeIx);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
    await confirmTransactionWithPolling(connection, signature);
    return signature;
  } catch (error: any) {
    console.error("Unstake Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to unstake: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const claimReferralRewards = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  rewardMintAddress: string
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress, rewardMintAddress);
  const [referrerStats] = getReferrerStatsPDA(program, wallet.publicKey);
  const rewardMint = new PublicKey(rewardMintAddress);
  const referrerRewardAccount = await getAssociatedTokenAddress(rewardMint, wallet.publicKey);

  // Get fee receiver from config (admin address)
  const config = getConfig();
  const feeReceiverAccount = new PublicKey(config.adminAddress);

  // Hardcoded Frontend Fee: 0.0005 SOL
  const feeAmount = 500_000;
  let currentFeeReceiver = feeReceiverAccount;

  try {
    const poolData = await program.account.stakingPool.fetch(accounts.stakingPool);
    if (poolData.feeReceiver && poolData.feeReceiver.toString() !== PublicKey.default.toString()) {
      currentFeeReceiver = poolData.feeReceiver as PublicKey;
    }
  } catch (e) {
    console.warn("Used default fee receiver due to fetch error:", e);
  }

  try {
    const tx = new Transaction();

    // Add fee transfer instruction
    if (feeAmount > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: currentFeeReceiver,
          lamports: feeAmount,
        })
      );
    }

    // Add claim referral rewards instruction
    const claimIx = await program.methods
      .claimReferralRewards()
      .accounts({
        stakingPool: accounts.stakingPool,
        referrerStats,
        rewardVault: accounts.rewardVault,
        referrerRewardAccount,
        referrer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    tx.add(claimIx);

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
    await confirmTransactionWithPolling(connection, signature);
    return signature;
  } catch (error: any) {
    console.error("Claim Referral Rewards Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to claim referral rewards: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};



export const addRewards = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  rewardMintAddress: string,
  amount: anchor.BN
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const rewardMint = new PublicKey(rewardMintAddress);
  const funderRewardAccount = await getAssociatedTokenAddress(
    rewardMint,
    wallet.publicKey
  );


  try {
    const tx = await program.methods
      .addRewards(amount)
      .accounts({
        stakingPool: accounts.stakingPool,
        rewardVault: accounts.rewardVault,
        funderRewardAccount,
        funder: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    // Set blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send WITHOUT simulation
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true, // Skip simulation
      maxRetries: 3,
    });

    return signature;
  } catch (error: any) {
    console.error("Add Rewards Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to add rewards: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const updateRewardRate = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  newRate: anchor.BN
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .updateRewardRate(newRate)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey,
      })
      .transaction();

    // Set blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send WITHOUT simulation
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true, // Skip simulation
      maxRetries: 3,
    });

    return signature;
  } catch (error: any) {
    console.error("Update Reward Rate Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to update reward rate: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const toggleReferralSystem = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  enable: boolean
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .toggleReferralSystem(enable)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey,
      })
      .transaction();

    // Set blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send WITHOUT simulation
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true, // Skip simulation
      maxRetries: 3,
    });

    return signature;
  } catch (error: any) {
    console.error("Toggle Referral System Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to toggle referral system: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const setPauseState = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  paused: boolean
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .setPauseState(paused)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey,
      })
      .transaction();

    // Set blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send WITHOUT simulation
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true, // Skip simulation
      maxRetries: 3,
    });

    return signature;
  } catch (error: any) {
    console.error("Set Pause State Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to set pause state: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const withdrawTokens = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  amount: anchor.BN
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const adminTokenAccount = await getAssociatedTokenAddress(
    accounts.tokenMint,
    wallet.publicKey
  );


  try {
    const tx = await program.methods
      .withdrawTokens(amount)
      .accounts({
        stakingPool: accounts.stakingPool,
        stakingVault: accounts.stakingVault,
        adminTokenAccount,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    // Set blockhash and fee payer
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send WITHOUT simulation
    const signedTx = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true, // Skip simulation
      maxRetries: 3,
    });

    return signature;
  } catch (error: any) {
    console.error("Withdraw Tokens Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to withdraw tokens: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const fetchStakerCount = async (
  program: Program,
  tokenMintAddress: string
): Promise<{ total: number; active: number; raw: number; poolAddress: string }> => {
  try {
    // Use public Solana RPC for getProgramAccounts (Alchemy free tier doesn't support it)
    const config = getConfig();
    const fallbackRpc = config.network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';

    const fallbackConnection = new Connection(fallbackRpc, 'confirmed');
    const wallet = {
      publicKey: program.provider.publicKey!,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any) => txs,
    };
    const fallbackProgram = getProgram(fallbackConnection, wallet as any);

    // Fetch all UserStake accounts from the program using fallback RPC
    const allUserStakes = await fallbackProgram.account.userStake.all();

    // Count active stakers (staked amount > 0)
    const activeStakers = allUserStakes.filter(s => {
      const stakedAmount = s.account.stakedAmount as any;
      const amount = stakedAmount?.toNumber ? stakedAmount.toNumber() : Number(stakedAmount || 0);
      return amount > 0;
    });

    return {
      total: allUserStakes.length,
      active: activeStakers.length,
      raw: allUserStakes.length,
      poolAddress: ''
    };
  } catch (error: any) {
    console.error('Error fetching staker count:', error);
    return { total: 0, active: 0, raw: 0, poolAddress: '' };
  }
};


export const fetchStakingPool = async (
  program: Program,
  tokenMintAddress: string
) => {
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  try {
    const poolData = await program.account.stakingPool.fetch(accounts.stakingPool);
    return poolData;
  } catch (error) {
    console.error('Error fetching staking pool:', error);
    return null;
  }
};

export const fetchUserStake = async (
  program: Program,
  wallet: PublicKey,
  tokenMintAddress: string
) => {
  const accounts = await getProgramAccounts(program, tokenMintAddress);
  const [userStake] = getUserStakePDA(program, wallet, accounts.stakingPool);

  try {
    const stakeData = await program.account.userStake.fetch(userStake);
    return stakeData;
  } catch (error: any) {
    // User stake not initialized - valid state for new users
    if (error.message?.includes('Account does not exist') || error.message?.includes('Could not find account')) {
      return null;
    }
    console.error('Error fetching user stake:', error);
    return null;
  }
};

export const fetchReferrerStats = async (
  program: Program,
  referrer: PublicKey
) => {
  const [referrerStats] = getReferrerStatsPDA(program, referrer);

  try {
    const statsData = await program.account.referrerStats.fetch(referrerStats);
    return statsData;
  } catch (error: any) {
    // Referrer stats not initialized yet - this is normal
    if (error.message?.includes('Account does not exist')) {
      console.log('Referrer stats not initialized for:', referrer.toString());
      return null;
    }
    console.error('Error fetching referrer stats:', error);
    return null;
  }
};

export const fetchVaultBalances = async (
  program: Program,
  tokenMintAddress: string,
  rewardMintAddress?: string
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress, rewardMintAddress);

  try {
    // Fetch staking vault and reward vault in parallel
    const [stakingVaultAccount, rewardVaultAccount] = await Promise.all([
      getAccount(connection, accounts.stakingVault).catch(e => {
        if (!e.message?.includes('could not find account')) console.error('Error fetching staking vault:', e);
        return { amount: BigInt(0) }; // Return dummy object with amount 0
      }),
      getAccount(connection, accounts.rewardVault).catch(e => {
        if (!e.message?.includes('could not find account')) console.error('Error fetching reward vault:', e);
        return { amount: BigInt(0) };
      })
    ]);

    const stakingVaultBalance = Number(stakingVaultAccount.amount);
    const rewardVaultBalance = Number(rewardVaultAccount.amount);

    return {
      stakingVaultBalance,
      rewardVaultBalance,
      stakingVaultAddress: accounts.stakingVault.toString(),
      rewardVaultAddress: accounts.rewardVault.toString(),
    };
  } catch (error: any) {
    console.error('Error fetching vault balances:', error);
    return {
      stakingVaultBalance: 0,
      rewardVaultBalance: 0,
      stakingVaultAddress: accounts.stakingVault.toString(),
      rewardVaultAddress: accounts.rewardVault.toString(),
    };
  }
};

export const fetchUserTokenBalance = async (
  connection: Connection,
  walletAddress: PublicKey,
  tokenMintAddress: string
) => {
  try {
    const tokenMint = new PublicKey(tokenMintAddress);
    const userTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      walletAddress
    );

    try {
      const accountInfo = await getAccount(connection, userTokenAccount);
      return Number(accountInfo.amount);
    } catch (error: any) {
      // Token account doesn't exist yet - this is expected for new users
      return 0;
    }
  } catch (error: any) {
    console.error('Error fetching user token balance:', error);
    return null;
  }
};

// Helper to fetch and track cumulative fees collected
export const fetchFeeHistory = async (
  connection: Connection,
  feeReceiver: PublicKey
): Promise<{ recentFees: number; allTimeFees: number }> => {
  const STORAGE_KEY = `fee_history_${feeReceiver.toBase58()}`;

  try {
    // Load saved state from localStorage
    let savedState: { allTimeFees: number; lastSignature: string | null } = { allTimeFees: 0, lastSignature: null };
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) savedState = JSON.parse(stored);
    } catch (e) {
      console.warn("Could not load fee history from localStorage:", e);
    }

    // Fetch recent transactions (up to 100)
    const signatures = await connection.getSignaturesForAddress(feeReceiver, { limit: 100 });

    // Find new transactions since last processed
    const lastProcessedIndex = savedState.lastSignature
      ? signatures.findIndex(s => s.signature === savedState.lastSignature)
      : -1;

    const newSignatures = lastProcessedIndex === -1
      ? signatures // Process all if no history
      : signatures.slice(0, lastProcessedIndex); // Only new ones

    let newFeesCollected = 0;
    let recentFeesTotal = 0;

    // Process in chunks
    const sigs = signatures.map(s => s.signature);
    const chunks: string[][] = [];
    const sigsCopy = [...sigs];
    while (sigsCopy.length > 0) {
      chunks.push(sigsCopy.splice(0, 50));
    }

    for (const chunk of chunks) {
      const txs = await connection.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 });

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        if (!tx || !tx.meta) continue;

        const accountKeys = tx.transaction.message.accountKeys;
        const index = accountKeys.findIndex((k: any) => k.pubkey.toString() === feeReceiver.toString());

        if (index !== -1) {
          const pre = tx.meta.preBalances[index];
          const post = tx.meta.postBalances[index];
          const diff = post - pre;

          if (diff > 0) {
            recentFeesTotal += diff;
            // Only count towards new fees if it's in the newSignatures list
            if (newSignatures.some(s => s.signature === chunk[i])) {
              newFeesCollected += diff;
            }
          }
        }
      }
    }

    // Update all-time fees
    const allTimeFees = savedState.allTimeFees + (newFeesCollected / 1_000_000_000);

    // Save new state
    try {
      const newState = {
        allTimeFees,
        lastSignature: signatures.length > 0 ? signatures[0].signature : savedState.lastSignature
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn("Could not save fee history to localStorage:", e);
    }

    return {
      recentFees: recentFeesTotal / 1_000_000_000, // Last 100 txns in SOL
      allTimeFees
    };
  } catch (error) {
    console.error('Error fetching fee history:', error);
    return { recentFees: 0, allTimeFees: 0 };
  }
};

export const fetchSolBalance = async (
  connection: Connection,
  walletAddress: PublicKey
) => {
  try {
    const balance = await connection.getBalance(walletAddress);
    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    return balance / 1_000_000_000;
  } catch (error: any) {
    console.error('Error fetching SOL balance:', error);
    return null;
  }
};



export const updateFees = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  feeStake: anchor.BN,
  feeUnstake: anchor.BN,
  feeClaim: anchor.BN,
  newReceiver: PublicKey
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .updateFees(feeStake, feeUnstake, feeClaim, newReceiver)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey
      })
      .transaction();

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
  } catch (error: any) {
    console.error("Update Fees Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to update fees: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const updateReferralRates = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  l1: number,
  l2: number,
  l3: number
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .updateReferralRates(l1, l2, l3)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey
      })
      .transaction();

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
  } catch (error: any) {
    console.error("Update Referral Rates Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to update referral rates: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

export const updateLockDuration = async (
  program: Program,
  wallet: AnchorWallet,
  tokenMintAddress: string,
  duration: anchor.BN
) => {
  const connection = program.provider.connection;
  const accounts = await getProgramAccounts(program, tokenMintAddress);


  try {
    const tx = await program.methods
      .updateLockDuration(duration)
      .accounts({
        stakingPool: accounts.stakingPool,
        authority: wallet.publicKey
      })
      .transaction();

    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = wallet.publicKey;
    const signedTx = await wallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
  } catch (error: any) {
    console.error("Update Lock Duration Error:", error);
    if (error.message?.includes("User rejected")) {
      toast.error("Transaction rejected by user");
    } else {
      toast.error("Failed to update lock duration: " + (error.message || "Unknown error"));
    }
    throw error;
  }
};

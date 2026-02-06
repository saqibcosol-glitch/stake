use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction, clock::Clock};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("5YNT6aKnnaDsUC7PYw3AJoe5GSjK9Gc76Ro79EMMWVSY");

// Constants
const BASIS_POINTS: u16 = 10000;
const PRECISION: u128 = 1_000_000_000;

#[program]
pub mod solana_staking_referral {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        reward_rate: u64,
        enable_referral: bool,
    ) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let authority = &ctx.accounts.authority;

        staking_pool.authority = authority.key();
        staking_pool.fee_receiver = authority.key(); 
        
        staking_pool.reward_rate = reward_rate;
        staking_pool.referral_enabled = enable_referral;
        staking_pool.paused = false;
        staking_pool.lock_duration = 2592000; // 30 days

        staking_pool.referral_l1_bps = 1000;
        staking_pool.referral_l2_bps = 500;
        staking_pool.referral_l3_bps = 300;

        staking_pool.fee_stake = 1_000_000;
        staking_pool.fee_unstake = 5_000_000;
        staking_pool.fee_claim = 100_000;
        staking_pool.min_stake_amount = 1_000_000;

        staking_pool.last_update_time = Clock::get()?.unix_timestamp;
        staking_pool.reward_per_token_stored = 0;
        staking_pool.total_staked = 0;
        
        staking_pool.token_mint = ctx.accounts.token_mint.key();
        staking_pool.reward_mint = ctx.accounts.reward_mint.key();
        staking_pool.staking_vault = ctx.accounts.staking_vault.key();
        staking_pool.reward_vault = ctx.accounts.reward_vault.key();
        staking_pool.bump = ctx.bumps.staking_pool;

        Ok(())
    }

    // -----------------------------------------------------
    // STAKE (Fixed Top-Up Logic)
    // -----------------------------------------------------
    pub fn stake_with_referral(
        ctx: Context<StakeWithReferral>,
        amount: u64,
        referrer: Option<Pubkey>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        require!(!pool.paused, StakingError::PoolPaused);
        require!(amount > 0, StakingError::ZeroAmount);
        require!(amount >= pool.min_stake_amount, StakingError::BelowMinimumStake);

        // 1. Pay Fee
        // 1. Pay Fee (DISABLED: handled on frontend)
        // if pool.fee_stake > 0 {
        //     invoke(
        //         &system_instruction::transfer(
        //             &ctx.accounts.user.key(),
        //             &pool.fee_receiver,
        //             pool.fee_stake,
        //         ),
        //         &[
        //             ctx.accounts.user.to_account_info(),
        //             ctx.accounts.fee_receiver_account.to_account_info(),
        //             ctx.accounts.system_program.to_account_info(),
        //         ],
        //     )?;
        // }

        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        if user_stake.user == Pubkey::default() {
             user_stake.user = ctx.accounts.user.key();
             user_stake.pool = pool.key();
        }

        // 2. LINKING LOGIC (Only runs once per user)
        if pool.referral_enabled && user_stake.referrer.is_none() {
             if let Some(ref_key) = referrer {
                 require!(ref_key != ctx.accounts.user.key(), StakingError::SelfReferral);
                 
                 // Save L1
                 user_stake.referrer = Some(ref_key);

                 // Increment Referral Count for L1
                 if let Some(stats) = &mut ctx.accounts.referrer_stats {
                      // Verify PDA
                      let (expected_pda, _) = Pubkey::find_program_address(
                          &[b"referrer_stats", ref_key.as_ref()], ctx.program_id
                      );
                      require!(stats.key() == expected_pda, StakingError::InvalidReferrerAccount);
                      stats.total_referrals = stats.total_referrals.checked_add(1).ok_or(StakingError::MathOverflow)?;
                 }

                 // Save L2 (if exists)
                 if let Some(ref_stake_info) = &ctx.accounts.referrer_user_stake {
                      let (expected_stake_pda, _) = Pubkey::find_program_address(
                          &[b"user_stake", ref_key.as_ref(), pool.key().as_ref()], ctx.program_id
                      );
                      require!(ref_stake_info.key() == expected_stake_pda, StakingError::InvalidReferrerAccount);

                      let ref_stake_data = UserStake::try_deserialize(&mut &ref_stake_info.data.borrow()[..])?;
                      if let Some(l2_key) = ref_stake_data.referrer {
                          user_stake.referrer_l2 = Some(l2_key);
                          
                          // Increment Referral Count for L2
                          if let Some(l2_stats) = &mut ctx.accounts.referrer_stats_l2 {
                               let (expected_l2_pda, _) = Pubkey::find_program_address(
                                   &[b"referrer_stats", l2_key.as_ref()], ctx.program_id
                               );
                               require!(l2_stats.key() == expected_l2_pda, StakingError::InvalidReferrerAccount);
                               l2_stats.total_referrals = l2_stats.total_referrals.checked_add(1).ok_or(StakingError::MathOverflow)?;
                          }

                          // Save L3 (if exists)
                          if let Some(l2_stake_info) = &ctx.accounts.l2_user_stake {
                               let (expected_l2_stake_pda, _) = Pubkey::find_program_address(
                                   &[b"user_stake", l2_key.as_ref(), pool.key().as_ref()], ctx.program_id
                               );
                               require!(l2_stake_info.key() == expected_l2_stake_pda, StakingError::InvalidReferrerAccount);

                               let l2_stake_data = UserStake::try_deserialize(&mut &l2_stake_info.data.borrow()[..])?;
                               if let Some(l3_key) = l2_stake_data.referrer {
                                   user_stake.referrer_l3 = Some(l3_key);

                                   // Increment Referral Count for L3
                                   if let Some(l3_stats) = &mut ctx.accounts.referrer_stats_l3 {
                                        let (expected_l3_pda, _) = Pubkey::find_program_address(
                                            &[b"referrer_stats", l3_key.as_ref()], ctx.program_id
                                        );
                                        require!(l3_stats.key() == expected_l3_pda, StakingError::InvalidReferrerAccount);
                                        l3_stats.total_referrals = l3_stats.total_referrals.checked_add(1).ok_or(StakingError::MathOverflow)?;
                                   }
                               }
                          }
                      }
                 }
                 emit!(NewReferral { user: ctx.accounts.user.key(), referrer: ref_key, timestamp: clock.unix_timestamp });
             }
        }

        // 3. ACTIVE STAKE UPDATE LOGIC (Runs on EVERY stake, even top-ups)
        // We separate this from the linking logic so stats update when users add more funds.
        if pool.referral_enabled {
            // Update L1 Active Stake
            if let Some(l1_key) = user_stake.referrer {
                if let Some(stats) = &mut ctx.accounts.referrer_stats {
                    // Check if the provided stats account matches the user's referrer
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l1_key.as_ref()], ctx.program_id);
                    if stats.key() == expected_pda {
                        stats.active_stake_l1 = stats.active_stake_l1.checked_add(amount).ok_or(StakingError::MathOverflow)?;
                        stats.volume_referred = stats.volume_referred.checked_add(amount).ok_or(StakingError::MathOverflow)?; // Track lifetime volume too
                    }
                }
            }
            // Update L2 Active Stake
            if let Some(l2_key) = user_stake.referrer_l2 {
                if let Some(stats) = &mut ctx.accounts.referrer_stats_l2 {
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l2_key.as_ref()], ctx.program_id);
                    if stats.key() == expected_pda {
                        stats.active_stake_l2 = stats.active_stake_l2.checked_add(amount).ok_or(StakingError::MathOverflow)?;
                    }
                }
            }
            // Update L3 Active Stake
            if let Some(l3_key) = user_stake.referrer_l3 {
                if let Some(stats) = &mut ctx.accounts.referrer_stats_l3 {
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l3_key.as_ref()], ctx.program_id);
                    if stats.key() == expected_pda {
                        stats.active_stake_l3 = stats.active_stake_l3.checked_add(amount).ok_or(StakingError::MathOverflow)?;
                    }
                }
            }
        }

        update_rewards_optimized(pool, user_stake, clock.unix_timestamp)?;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.staking_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        pool.total_staked = pool.total_staked.checked_add(amount).ok_or(StakingError::MathOverflow)?;
        
        // Lock Timer Logic
        let mut new_last_stake_time = clock.unix_timestamp;
        if user_stake.staked_amount > 0 {
            let unlock_time = user_stake.last_stake_time.checked_add(pool.lock_duration).unwrap_or(i64::MAX);
            let remaining_time = if unlock_time > clock.unix_timestamp { unlock_time - clock.unix_timestamp } else { 0 };
            let old_weight = user_stake.staked_amount as u128 * remaining_time as u128;
            let new_weight = amount as u128 * pool.lock_duration as u128;
            let total_amount = user_stake.staked_amount as u128 + amount as u128;
            let weighted_remaining = (old_weight + new_weight) / total_amount;
            new_last_stake_time = clock.unix_timestamp.checked_sub(pool.lock_duration - weighted_remaining as i64).unwrap_or(clock.unix_timestamp);
        }

        user_stake.staked_amount = user_stake.staked_amount.checked_add(amount).ok_or(StakingError::MathOverflow)?;
        user_stake.last_stake_time = new_last_stake_time;

        emit!(Staked { user: ctx.accounts.user.key(), amount, timestamp: clock.unix_timestamp });

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        require!(!pool.paused, StakingError::PoolPaused);

        // if pool.fee_claim > 0 {
        //     invoke(
        //         &system_instruction::transfer(&ctx.accounts.user.key(), &pool.fee_receiver, pool.fee_claim),
        //         &[ctx.accounts.user.to_account_info(), ctx.accounts.fee_receiver_account.to_account_info(), ctx.accounts.system_program.to_account_info()],
        //     )?;
        // }

        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        update_rewards_optimized(pool, user_stake, clock.unix_timestamp)?;
        let total_reward = user_stake.reward_pending;
        require!(total_reward > 0, StakingError::NoRewardsToClaim);

        if pool.referral_enabled {
            if let Some(l1_key) = user_stake.referrer {
                if let Some(l1_stats) = &mut ctx.accounts.referrer_stats_l1 {
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l1_key.as_ref()], ctx.program_id);
                    if l1_stats.key() == expected_pda {
                         let comm = (total_reward as u128 * pool.referral_l1_bps as u128 / BASIS_POINTS as u128) as u64;
                         if comm > 0 {
                             l1_stats.total_commission_earned = l1_stats.total_commission_earned.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                             l1_stats.pending_rewards = l1_stats.pending_rewards.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                         }
                    }
                }
            }
            if let Some(l2_key) = user_stake.referrer_l2 {
                if let Some(l2_stats) = &mut ctx.accounts.referrer_stats_l2 {
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l2_key.as_ref()], ctx.program_id);
                    if l2_stats.key() == expected_pda {
                        let comm = (total_reward as u128 * pool.referral_l2_bps as u128 / BASIS_POINTS as u128) as u64;
                        if comm > 0 {
                            l2_stats.total_commission_earned = l2_stats.total_commission_earned.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                            l2_stats.pending_rewards = l2_stats.pending_rewards.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                        }
                    }
                }
            }
             if let Some(l3_key) = user_stake.referrer_l3 {
                if let Some(l3_stats) = &mut ctx.accounts.referrer_stats_l3 {
                    let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l3_key.as_ref()], ctx.program_id);
                    if l3_stats.key() == expected_pda {
                        let comm = (total_reward as u128 * pool.referral_l3_bps as u128 / BASIS_POINTS as u128) as u64;
                        if comm > 0 {
                            l3_stats.total_commission_earned = l3_stats.total_commission_earned.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                            l3_stats.pending_rewards = l3_stats.pending_rewards.checked_add(comm).ok_or(StakingError::MathOverflow)?;
                        }
                    }
                }
            }
        }

        user_stake.reward_pending = 0;
        user_stake.total_earned = user_stake.total_earned.checked_add(total_reward).ok_or(StakingError::MathOverflow)?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    to: ctx.accounts.user_reward_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                &[&[b"staking_pool", pool.token_mint.as_ref(), &[pool.bump]]],
            ),
            total_reward,
        )?;

        emit!(RewardsClaimed { user: ctx.accounts.user.key(), amount: total_reward, timestamp: clock.unix_timestamp });
        Ok(())
    }

    pub fn claim_referral_rewards(ctx: Context<ClaimReferralRewards>) -> Result<()> {
        let stats = &mut ctx.accounts.referrer_stats;
        let pool = &ctx.accounts.staking_pool;
        
        let amount = stats.pending_rewards;
        require!(amount > 0, StakingError::NoRewardsToClaim);

        stats.pending_rewards = 0;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    to: ctx.accounts.referrer_reward_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                &[&[b"staking_pool", pool.token_mint.as_ref(), &[pool.bump]]],
            ),
            amount,
        )?;
        Ok(())
    }

    // -----------------------------------------------------
    // UNSTAKE (Secure & Updates Active Stake)
    // -----------------------------------------------------
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        require!(!pool.paused, StakingError::PoolPaused);
        
        // if pool.fee_unstake > 0 {
        //      invoke(
        //         &system_instruction::transfer(&ctx.accounts.user.key(), &pool.fee_receiver, pool.fee_unstake),
        //         &[ctx.accounts.user.to_account_info(), ctx.accounts.fee_receiver_account.to_account_info(), ctx.accounts.system_program.to_account_info()],
        //     )?;
        // }
        
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(amount > 0, StakingError::ZeroAmount);
        require!(amount <= user_stake.staked_amount, StakingError::InsufficientStakedAmount);
        require!(clock.unix_timestamp - user_stake.last_stake_time >= pool.lock_duration, StakingError::MinimumStakePeriodNotMet);

        update_rewards_optimized(pool, user_stake, clock.unix_timestamp)?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staking_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: pool.to_account_info(),
                },
                &[&[b"staking_pool", pool.token_mint.as_ref(), &[pool.bump]]],
            ),
             amount,
        )?;

        // Update Active Stake in Referrer Stats
        // SECURITY FIX: We verify the PDA before decrementing
        if let Some(l1_key) = user_stake.referrer {
            if let Some(stats) = &mut ctx.accounts.referrer_stats {
                let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l1_key.as_ref()], ctx.program_id);
                if stats.key() == expected_pda {
                      stats.active_stake_l1 = stats.active_stake_l1.checked_sub(amount).unwrap_or(0);
                }
            }
        }
        
        if let Some(l2_key) = user_stake.referrer_l2 {
            if let Some(stats) = &mut ctx.accounts.referrer_stats_l2 {
                let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l2_key.as_ref()], ctx.program_id);
                if stats.key() == expected_pda {
                      stats.active_stake_l2 = stats.active_stake_l2.checked_sub(amount).unwrap_or(0);
                }
            }
        }

        if let Some(l3_key) = user_stake.referrer_l3 {
             if let Some(stats) = &mut ctx.accounts.referrer_stats_l3 {
                let (expected_pda, _) = Pubkey::find_program_address(&[b"referrer_stats", l3_key.as_ref()], ctx.program_id);
                if stats.key() == expected_pda {
                      stats.active_stake_l3 = stats.active_stake_l3.checked_sub(amount).unwrap_or(0);
                }
            }
        }

        pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();
        user_stake.staked_amount = user_stake.staked_amount.checked_sub(amount).unwrap();

        emit!(Unstaked { user: ctx.accounts.user.key(), amount, timestamp: clock.unix_timestamp });

        Ok(())
    }

    pub fn update_fees(ctx: Context<AdminUpdate>, fee_stake: u64, fee_unstake: u64, fee_claim: u64, new_receiver: Pubkey) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.fee_stake = fee_stake;
        pool.fee_unstake = fee_unstake;
        pool.fee_claim = fee_claim;
        pool.fee_receiver = new_receiver;
        Ok(())
    }

    pub fn update_referral_rates(ctx: Context<AdminUpdate>, l1: u16, l2: u16, l3: u16) -> Result<()> {
        require!(l1.checked_add(l2).and_then(|v| v.checked_add(l3)).unwrap_or(u16::MAX) <= 2500, StakingError::ReferralRatesExceedMax);
        let pool = &mut ctx.accounts.staking_pool;
        pool.referral_l1_bps = l1;
        pool.referral_l2_bps = l2;
        pool.referral_l3_bps = l3;
        Ok(())
    }

    pub fn update_lock_duration(ctx: Context<AdminUpdate>, duration: i64) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.lock_duration = duration;
        Ok(())
    }

    pub fn update_reward_rate(ctx: Context<AdminUpdate>, new_rate: u64) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        let clock = Clock::get()?;
        if pool.total_staked > 0 {
             let now = clock.unix_timestamp;
             let delta = now.checked_sub(pool.last_update_time).unwrap_or(0);
             if delta > 0 {
                let reward_inc = (pool.reward_rate as u128 * delta as u128 * PRECISION) / pool.total_staked as u128;
                pool.reward_per_token_stored += reward_inc;
                pool.last_update_time = now;
             }
        } else {
             pool.last_update_time = clock.unix_timestamp;
        }
        pool.reward_rate = new_rate;
        Ok(())
    }

    pub fn set_pause_state(ctx: Context<AdminUpdate>, paused: bool) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.paused = paused;
        Ok(())
    }

    pub fn toggle_referral_system(ctx: Context<AdminUpdate>, enabled: bool) -> Result<()> {
        let pool = &mut ctx.accounts.staking_pool;
        pool.referral_enabled = enabled;
        Ok(())
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
        let pool = &ctx.accounts.staking_pool;
        require!(amount > 0, StakingError::ZeroAmount);
         token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staking_vault.to_account_info(),
                    to: ctx.accounts.admin_token_account.to_account_info(),
                    authority: ctx.accounts.staking_pool.to_account_info(),
                },
                &[&[b"staking_pool", pool.token_mint.as_ref(), &[pool.bump]]]
            ),
            amount
        )?;
        Ok(())
    }

    pub fn initialize_referrer_stats(ctx: Context<InitializeReferrerStats>) -> Result<()> {
        let stats = &mut ctx.accounts.referrer_stats;
        stats.referrer = ctx.accounts.referrer.key();
        stats.total_commission_earned = 0;
        stats.pending_rewards = 0;
        stats.total_referrals = 0; 
        stats.volume_referred = 0;
        stats.active_stake_l1 = 0; // Init new fields
        stats.active_stake_l2 = 0;
        stats.active_stake_l3 = 0;
        Ok(())
    }
    
    pub fn add_rewards(ctx: Context<AddRewards>, amount: u64) -> Result<()> {
         token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.funder_reward_account.to_account_info(),
                    to: ctx.accounts.reward_vault.to_account_info(),
                    authority: ctx.accounts.funder.to_account_info(),
                }
            ),
            amount
         )?;
         Ok(())
    }
}

// -----------------------------------------------------
// HELPERS & ACCOUNTS
// -----------------------------------------------------
fn update_rewards_optimized(pool: &mut StakingPool, user_stake: &mut UserStake, now: i64) -> Result<()> {
    if pool.total_staked == 0 {
        pool.last_update_time = now;
        return Ok(());
    }
    let delta = now.checked_sub(pool.last_update_time).unwrap_or(0);
    if delta > 0 {
        let reward_inc = (pool.reward_rate as u128 * delta as u128 * PRECISION) / pool.total_staked as u128;
        pool.reward_per_token_stored += reward_inc;
        pool.last_update_time = now;
    }
    if user_stake.staked_amount > 0 {
        let pending = (user_stake.staked_amount as u128 * (pool.reward_per_token_stored - user_stake.reward_per_token_paid)) / PRECISION;
        user_stake.reward_pending = user_stake.reward_pending.checked_add(pending as u64).unwrap();
    }
    user_stake.reward_per_token_paid = pool.reward_per_token_stored;
    Ok(())
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub staking_vault: Pubkey,
    pub reward_vault: Pubkey,
    pub fee_receiver: Pubkey,
    pub reward_per_token_stored: u128,
    pub reward_rate: u64,
    pub total_staked: u64,
    pub fee_stake: u64,
    pub fee_unstake: u64,
    pub fee_claim: u64,
    pub min_stake_amount: u64,
    pub last_update_time: i64,
    pub lock_duration: i64,
    pub referral_l1_bps: u16,
    pub referral_l2_bps: u16,
    pub referral_l3_bps: u16,
    pub referral_enabled: bool,
    pub paused: bool,
    pub bump: u8,
}

impl StakingPool {
    pub const SIZE: usize = 288; 
}

#[account]
pub struct UserStake {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub staked_amount: u64,
    pub reward_per_token_paid: u128,
    pub reward_pending: u64,
    pub last_stake_time: i64,
    pub referrer: Option<Pubkey>, 
    pub referrer_l2: Option<Pubkey>,
    pub referrer_l3: Option<Pubkey>,
    pub total_earned: u64,
}

impl Default for UserStake {
    fn default() -> Self {
        Self {
            user: Pubkey::default(),
            pool: Pubkey::default(),
            staked_amount: 0,
            reward_per_token_paid: 0,
            reward_pending: 0,
            last_stake_time: 0,
            referrer: None,
            referrer_l2: None,
            referrer_l3: None,
            total_earned: 0,
        }
    }
}

impl UserStake {
    pub const SIZE: usize = 220;
}

#[account]
pub struct ReferrerStats {
    pub referrer: Pubkey,
    pub total_referrals: u64,
    pub total_commission_earned: u64,
    pub pending_rewards: u64,
    pub volume_referred: u64,
    pub active_stake_l1: u64, // NEW
    pub active_stake_l2: u64, // NEW
    pub active_stake_l3: u64, // NEW
}

impl ReferrerStats {
    // 8 + 32 + 8 + 8 + 8 + 8 + 24 (3*u64) = 96
    pub const SIZE: usize = 96; 
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + StakingPool::SIZE, seeds = [b"staking_pool", token_mint.key().as_ref()], bump)]
    pub staking_pool: Account<'info, StakingPool>,
    pub token_mint: Account<'info, Mint>,
    pub reward_mint: Account<'info, Mint>,
    #[account(init_if_needed, payer = authority, associated_token::mint = token_mint, associated_token::authority = staking_pool)]
    pub staking_vault: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = authority, associated_token::mint = reward_mint, associated_token::authority = staking_pool)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct StakeWithReferral<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(init_if_needed, payer = user, space = 8 + UserStake::SIZE, seeds = [b"user_stake", user.key().as_ref(), staking_pool.key().as_ref()], bump)]
    pub user_stake: Box<Account<'info, UserStake>>,
    #[account(mut)]
    pub staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_receiver_account.key() == staking_pool.fee_receiver)]
    pub fee_receiver_account: AccountInfo<'info>,
    #[account(mut)]
    pub referrer_stats: Option<Account<'info, ReferrerStats>>,
    /// CHECK: Verified via PDA address calculation in instruction body
    #[account(mut)]
    pub referrer_user_stake: Option<AccountInfo<'info>>,
    #[account(mut)]
    pub referrer_stats_l2: Option<Account<'info, ReferrerStats>>,
    /// CHECK: Verified via PDA address calculation in instruction body
    #[account(mut)]
    pub l2_user_stake: Option<AccountInfo<'info>>,
    #[account(mut)]
    pub referrer_stats_l3: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user_stake: Box<Account<'info, UserStake>>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_reward_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_receiver_account.key() == staking_pool.fee_receiver)]
    pub fee_receiver_account: AccountInfo<'info>,
    #[account(mut)]
    pub referrer_stats_l1: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub referrer_stats_l2: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub referrer_stats_l3: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReferralRewards<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut, seeds = [b"referrer_stats", referrer.key().as_ref()], bump, constraint = referrer_stats.referrer == referrer.key())]
    pub referrer_stats: Account<'info, ReferrerStats>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub referrer_reward_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub referrer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub user_stake: Account<'info, UserStake>,
    #[account(mut)]
    pub staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_receiver_account.key() == staking_pool.fee_receiver)]
    pub fee_receiver_account: AccountInfo<'info>,
    // --- Added for Live Referral Stats ---
    #[account(mut)]
    pub referrer_stats: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub referrer_stats_l2: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub referrer_stats_l3: Option<Account<'info, ReferrerStats>>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminUpdate<'info> {
    #[account(mut, has_one = authority)]
    pub staking_pool: Account<'info, StakingPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut, constraint = staking_vault.key() == staking_pool.staking_vault)]
    pub staking_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    #[account(address = staking_pool.authority)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeReferrerStats<'info> {
    #[account(init, payer = referrer, space = 8 + ReferrerStats::SIZE, seeds = [b"referrer_stats", referrer.key().as_ref()], bump)]
    pub referrer_stats: Account<'info, ReferrerStats>,
    #[account(mut)]
    pub referrer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddRewards<'info> {
    pub staking_pool: Account<'info, StakingPool>,
    #[account(mut)]
    pub reward_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub funder_reward_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct NewReferral {
    pub user: Pubkey,
    pub referrer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct Staked {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct Unstaked {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Pool is paused")]
    PoolPaused,
    #[msg("Cannot refer yourself")]
    SelfReferral,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient staked amount")]
    InsufficientStakedAmount,
    #[msg("Minimum stake period not met")]
    MinimumStakePeriodNotMet,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Invalid referrer account")]
    InvalidReferrerAccount,
    #[msg("Amount is below minimum stake")]
    BelowMinimumStake,
    #[msg("Total referral rates exceed 25%")]
    ReferralRatesExceedMax,
}
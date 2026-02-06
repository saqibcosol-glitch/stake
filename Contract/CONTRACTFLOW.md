# Smart Contract Workflow Documentation

## Overview

This document provides a comprehensive workflow of the Solana Staking with Referral smart contract. It explains how the contract works, the role of each function, and detailed workflows for both users and administrators.

**Program ID:** `m9NfqMdXF7ULF5d2QmNGofP6er6nJtmf4nde4oSmENx`

---

## Table of Contents

1. [Contract Architecture](#contract-architecture)
2. [Key Concepts](#key-concepts)
3. [Account Structure](#account-structure)
4. [Admin Workflows](#admin-workflows)
5. [User Workflows](#user-workflows)
6. [Referral System Workflows](#referral-system-workflows)
7. [Reward Calculation Logic](#reward-calculation-logic)
8. [Security Features](#security-features)

---

## Contract Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     STAKING CONTRACT                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │ StakingPool  │────▶│  UserStake   │◀───│ReferrerStats │ │
│  │   (Global)   │     │  (Per User)  │    │ (Optional)   │ │
│  └──────────────┘     └──────────────┘    └──────────────┘ │
│         │                     │                    │        │
│         ▼                     ▼                    ▼        │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │StakingVault  │     │ User Token   │    │  Referrer    │ │
│  │ (Holds SPL)  │     │   Account    │    │Token Account │ │
│  └──────────────┘     └──────────────┘    └──────────────┘ │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                          │
│  │ RewardVault  │                                          │
│  │(Holds Rewards)                                          │
│  └──────────────┘                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Constants

- **Referral Commission:** 5% (500 basis points out of 10,000)
- **Minimum Stake Period:** 86,400 seconds (24 hours)
- **Precision:** 1,000,000,000 (for reward calculations)

---

## Key Concepts

### 1. **Staking Pool**

- Central account that manages the entire staking system
- Stores global state: reward rate, total staked, referral settings
- Derived using PDA: `["staking_pool", token_mint]`

### 2. **User Stake Account**

- Individual account for each user per staking pool
- Tracks user's staked amount, pending rewards, and referrer
- Derived using PDA: `["user_stake", user_pubkey, staking_pool]`

### 3. **Referrer Stats Account**

- Optional account tracking referrer statistics
- Stores total referrals and commission earned
- Derived using PDA: `["referrer_stats", referrer_pubkey]`

### 4. **Reward Calculation**

- Uses time-based distribution model
- Rewards accrue per second based on reward rate
- Precision of 1 billion to handle fractional tokens

---

## Account Structure

### StakingPool (219 bytes)

```rust
{
  authority: Pubkey,              // Admin who can manage pool
  token_mint: Pubkey,             // Token being staked (e.g., MC)
  reward_mint: Pubkey,            // Token used for rewards
  staking_vault: Pubkey,          // Vault holding staked tokens
  reward_vault: Pubkey,           // Vault holding reward tokens
  reward_rate: u64,               // Rewards per second
  last_update_time: i64,          // Last reward calculation time
  reward_per_token_stored: u128,  // Accumulated reward per token
  total_staked: u64,              // Total tokens staked in pool
  total_referral_rewards: u64,    // Total paid to referrers
  referral_enabled: bool,         // Is referral system active
  paused: bool,                   // Emergency pause state
  bump: u8                        // PDA bump seed
}
```

### UserStake (148 bytes)

```rust
{
  user: Pubkey,                  // User's wallet address
  pool: Pubkey,                  // Associated staking pool
  staked_amount: u64,            // Amount user has staked
  reward_per_token_paid: u128,   // Last calculated reward snapshot
  reward_pending: u64,           // Unclaimed rewards
  last_stake_time: i64,          // Timestamp of last stake
  referrer: Option<Pubkey>,      // Optional referrer address
  total_earned: u64              // Lifetime earnings
}
```

### ReferrerStats (48 bytes)

```rust
{
  referrer: Pubkey,              // Referrer's address
  total_referrals: u32,          // Number of users referred
  total_commission_earned: u64,  // Total commission earned
  active: bool                   // Is referrer active
}
```

---

## Admin Workflows

### 1. Initialize Staking Pool

**Function:** `initialize(reward_rate, enable_referral)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 1. Calls initialize()
       │    - reward_rate: 1000 (tokens per second)
       │    - enable_referral: true
       ▼
┌────────────────────────────────────────────┐
│         CREATE STAKING POOL                │
│                                            │
│  • Create StakingPool PDA                  │
│  • Set authority = admin                   │
│  • Set reward_rate = 1000                  │
│  • Set referral_enabled = true             │
│  • Set paused = false                      │
│  • Store token_mint, reward_mint           │
│  • Store staking_vault, reward_vault       │
│  • Initialize counters to 0                │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           POOL INITIALIZED                 │
│  Ready to accept stakes and deposits       │
└────────────────────────────────────────────┘
```

**Prerequisites:**

- Admin must create token accounts (vaults) first
- Staking vault: ATA owned by StakingPool for token_mint
- Reward vault: ATA owned by StakingPool for reward_mint

**Transaction Accounts:**

- `staking_pool` (write, init) - New PDA account
- `token_mint` (read) - SPL token for staking
- `reward_mint` (read) - SPL token for rewards
- `staking_vault` (read) - Token account for deposits
- `reward_vault` (read) - Token account for rewards
- `authority` (write, signer) - Admin wallet

---

### 2. Add Rewards to Pool

**Function:** `add_rewards(amount)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 2. Calls add_rewards(10000)
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER REWARDS                   │
│                                            │
│  FROM: admin_reward_account                │
│  TO:   reward_vault                        │
│  AMOUNT: 10,000 tokens                     │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      REWARDS AVAILABLE FOR DISTRIBUTION    │
│  Users can now earn from this pool         │
└────────────────────────────────────────────┘
```

**Transaction Accounts:**

- `staking_pool` (write) - Pool PDA
- `reward_vault` (write) - Receives rewards
- `funder_reward_account` (write) - Admin's token account
- `funder` (signer) - Can be admin or anyone
- `token_program` - SPL Token program

**Event Emitted:**

```rust
AddRewardsEvent {
  funder: admin_pubkey,
  amount: 10000,
  timestamp: current_time
}
```

---

### 3. Update Reward Rate

**Function:** `update_reward_rate(new_rate)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 3. Calls update_reward_rate(2000)
       │
       ▼
┌────────────────────────────────────────────┐
│      UPDATE REWARD CALCULATION             │
│                                            │
│  1. Calculate pending rewards at old rate  │
│  2. Update reward_per_token_stored         │
│  3. Set last_update_time = now             │
│  4. Set reward_rate = 2000                 │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       NEW RATE IN EFFECT                   │
│  Future rewards calculated at 2000/sec     │
└────────────────────────────────────────────┘
```

**Why Update Rewards First?**

- Ensures all existing stakes get rewards at the old rate
- Prevents users from losing rewards during rate change
- Maintains accurate accounting

**Transaction Accounts:**

- `staking_pool` (write) - Pool to update
- `authority` (signer) - Must be pool authority

---

### 4. Toggle Referral System

**Function:** `toggle_referral_system(enable)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 4. Calls toggle_referral_system(false)
       │
       ▼
┌────────────────────────────────────────────┐
│      SET REFERRAL STATE                    │
│                                            │
│  staking_pool.referral_enabled = false     │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       REFERRAL SYSTEM DISABLED             │
│  New claims won't distribute commission    │
│  Existing referrers still tracked          │
└────────────────────────────────────────────┘
```

**Use Cases:**

- Enable: Activate referral rewards
- Disable: Pause referral distributions (emergency)

---

### 5. Emergency Pause

**Function:** `set_pause_state(paused)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 5. Calls set_pause_state(true)
       │
       ▼
┌────────────────────────────────────────────┐
│         PAUSE ALL OPERATIONS               │
│                                            │
│  staking_pool.paused = true                │
│                                            │
│  ❌ stake_with_referral() - BLOCKED        │
│  ❌ unstake() - BLOCKED                    │
│  ❌ claim_rewards() - BLOCKED              │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       POOL PAUSED                          │
│  Only admin functions available            │
│  Users cannot interact with pool           │
└────────────────────────────────────────────┘
```

**Event Emitted:**

```rust
PauseEvent {
  paused: true,
  timestamp: current_time
}
```

---

### 6. Withdraw Tokens (Emergency)

**Function:** `withdraw_tokens(amount)`

**Workflow:**

```
┌─────────────┐
│   ADMIN     │
└──────┬──────┘
       │
       │ 6. Calls withdraw_tokens(5000)
       │
       ▼
┌────────────────────────────────────────────┐
│      AUTHORIZATION CHECK                   │
│                                            │
│  Verify: caller == staking_pool.authority  │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER TOKENS                    │
│                                            │
│  FROM: staking_vault                       │
│  TO:   admin_token_account                 │
│  AMOUNT: 5,000 tokens                      │
│  AUTHORITY: StakingPool PDA (signed)       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       TOKENS WITHDRAWN                     │
│  Admin responsibility to manage funds      │
└────────────────────────────────────────────┘
```

**⚠️ Warning:**

- Only use in emergencies
- Withdrawing reduces available funds for users
- Should maintain enough for all staked amounts

---

## User Workflows

### Workflow 1: User Stakes WITHOUT Referral

**Function:** `stake_with_referral(amount, None)`

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Calls stake_with_referral(1000, None)
       │
       ▼
┌────────────────────────────────────────────┐
│         VALIDATION CHECKS                  │
│                                            │
│  ✓ amount > 0                              │
│  ✓ pool not paused                         │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      CREATE/LOAD USER STAKE ACCOUNT        │
│                                            │
│  IF first time:                            │
│    • Initialize UserStake PDA              │
│    • Set user, pool references             │
│    • Set referrer = None                   │
│    • Initialize counters to 0              │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE REWARDS                     │
│                                            │
│  1. Calculate time since last update       │
│  2. Update reward_per_token_stored         │
│  3. Calculate user's pending rewards       │
│  4. Update user_stake.reward_pending       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER TOKENS                    │
│                                            │
│  FROM: user_token_account                  │
│  TO:   staking_vault                       │
│  AMOUNT: 1,000 tokens                      │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE STATE                       │
│                                            │
│  • pool.total_staked += 1000               │
│  • user_stake.staked_amount += 1000        │
│  • user_stake.last_stake_time = now        │
│  • user_stake.reward_per_token_paid = current│
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           STAKE COMPLETE                   │
│                                            │
│  Event: StakeEvent {                       │
│    user: user_pubkey,                      │
│    amount: 1000,                           │
│    referrer: None,                         │
│    timestamp: now                          │
│  }                                         │
└────────────────────────────────────────────┘
```

**Transaction Accounts:**

- `staking_pool` (write) - Updates total_staked
- `user_stake` (write, init_if_needed) - User's stake account
- `staking_vault` (write) - Receives staked tokens
- `user_token_account` (write) - User's SPL account
- `user` (signer) - Transaction signer
- `token_program`, `system_program` - Required programs

---

### Workflow 2: User Stakes WITH Referral

**Function:** `stake_with_referral(amount, Some(referrer_pubkey))`

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Calls stake_with_referral(1000, Some(referrer))
       │
       ▼
┌────────────────────────────────────────────┐
│         VALIDATION CHECKS                  │
│                                            │
│  ✓ amount > 0                              │
│  ✓ pool not paused                         │
│  ✓ referrer != user (no self-referral)     │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      CREATE USER STAKE ACCOUNT             │
│                                            │
│  IF first time:                            │
│    • Initialize UserStake PDA              │
│    • Set user, pool references             │
│    • IF referral_enabled:                  │
│        Set referrer = Some(referrer_pk)    │
│    • Initialize counters to 0              │
│                                            │
│  ⚠️ IMPORTANT: Referrer set ONLY on        │
│     first stake, cannot change later       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE REWARDS                     │
│         (same as workflow 1)               │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER & UPDATE                  │
│         (same as workflow 1)               │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           STAKE COMPLETE                   │
│                                            │
│  Event: StakeEvent {                       │
│    user: user_pubkey,                      │
│    amount: 1000,                           │
│    referrer: Some(referrer_pk),  ← SET!   │
│    timestamp: now                          │
│  }                                         │
│                                            │
│  User is now linked to referrer forever    │
└────────────────────────────────────────────┘
```

**Key Differences from Workflow 1:**

- Referrer validation (must not be self)
- Referrer stored in user_stake account
- Referrer link is permanent for that user
- Future claims will distribute commission to referrer

---

### Workflow 3: User Unstakes Tokens

**Function:** `unstake(amount)`

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ Wait 24 hours after last stake...
       │
       │ 3. Calls unstake(500)
       │
       ▼
┌────────────────────────────────────────────┐
│         VALIDATION CHECKS                  │
│                                            │
│  ✓ amount > 0                              │
│  ✓ pool not paused                         │
│  ✓ amount <= user_stake.staked_amount      │
│  ✓ (now - last_stake_time) >= 86400        │
│    └─ 24 hour minimum lock period          │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE REWARDS                     │
│                                            │
│  Calculate and add any pending rewards     │
│  BEFORE reducing stake                     │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER TOKENS BACK               │
│                                            │
│  FROM: staking_vault                       │
│  TO:   user_token_account                  │
│  AMOUNT: 500 tokens                        │
│  AUTHORITY: StakingPool PDA (signed)       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE STATE                       │
│                                            │
│  • pool.total_staked -= 500                │
│  • user_stake.staked_amount -= 500         │
│                                            │
│  Note: reward_pending unchanged            │
│        (can still claim later)             │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           UNSTAKE COMPLETE                 │
│                                            │
│  Event: UnstakeEvent {                     │
│    user: user_pubkey,                      │
│    amount: 500,                            │
│    timestamp: now                          │
│  }                                         │
└────────────────────────────────────────────┘
```

**Important Notes:**

- 24-hour minimum stake period enforced
- Rewards calculated BEFORE unstaking
- Pending rewards remain claimable
- Can unstake partial amounts
- Does not reset referrer link

**Transaction Accounts:**

- `staking_pool` (write) - Updates total_staked
- `user_stake` (write) - User's stake account
- `staking_vault` (write) - Sends back tokens
- `user_token_account` (write) - Receives tokens
- `user` (signer) - Must be stake owner
- `token_program` - For transfer

---

### Workflow 4: User Claims Rewards (No Referrer)

**Function:** `claim_rewards_with_referral()`

```
┌─────────────┐
│    USER     │
│ (No Referrer)│
└──────┬──────┘
       │
       │ 4. Calls claim_rewards_with_referral()
       │
       ▼
┌────────────────────────────────────────────┐
│         VALIDATION CHECKS                  │
│                                            │
│  ✓ pool not paused                         │
│  ✓ user_stake exists                       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE REWARDS                     │
│                                            │
│  1. Calculate time delta                   │
│  2. Update reward_per_token_stored         │
│  3. Calculate user earned:                 │
│     earned = staked_amount *               │
│       (reward_per_token_stored -           │
│        user.reward_per_token_paid)         │
│  4. Add to user_stake.reward_pending       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│        CHECK PENDING REWARDS               │
│                                            │
│  total_reward = user_stake.reward_pending  │
│  Example: total_reward = 100 tokens        │
│                                            │
│  ✓ total_reward > 0                        │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      NO REFERRER - FULL AMOUNT             │
│                                            │
│  user_stake.referrer = None                │
│                                            │
│  user_reward = 100 (full amount)           │
│  referral_reward = 0                       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER REWARDS                   │
│                                            │
│  FROM: reward_vault                        │
│  TO:   user_reward_account                 │
│  AMOUNT: 100 tokens (100% to user)         │
│  AUTHORITY: StakingPool PDA (signed)       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE STATE                       │
│                                            │
│  • user_stake.reward_pending = 0           │
│  • user_stake.total_earned += 100          │
│  • user_stake.reward_per_token_paid = current│
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           CLAIM COMPLETE                   │
│                                            │
│  Event: ClaimEvent {                       │
│    user: user_pubkey,                      │
│    reward_amount: 100,                     │
│    referral_commission: 0,                 │
│    referrer: None,                         │
│    timestamp: now                          │
│  }                                         │
└────────────────────────────────────────────┘
```

---

### Workflow 5: User Claims Rewards (With Referrer)

**Function:** `claim_rewards_with_referral()`

```
┌─────────────┐
│    USER     │
│(Has Referrer)│
└──────┬──────┘
       │
       │ 5. Calls claim_rewards_with_referral()
       │
       ▼
┌────────────────────────────────────────────┐
│         VALIDATION & REWARD UPDATE         │
│         (same as workflow 4)               │
│                                            │
│  total_reward = 100 tokens                 │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      CHECK REFERRAL CONDITIONS             │
│                                            │
│  ✓ pool.referral_enabled = true            │
│  ✓ user_stake.referrer = Some(referrer_pk) │
│  ✓ referrer_reward_account provided        │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       CALCULATE COMMISSION SPLIT           │
│                                            │
│  total_reward = 100 tokens                 │
│                                            │
│  referral_reward = total_reward *          │
│                    500 / 10000             │
│                  = 100 * 5 / 100           │
│                  = 5 tokens (5%)           │
│                                            │
│  user_reward = total_reward - referral_reward│
│              = 100 - 5                     │
│              = 95 tokens (95%)             │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      TRANSFER REFERRAL COMMISSION          │
│                                            │
│  FROM: reward_vault                        │
│  TO:   referrer_reward_account             │
│  AMOUNT: 5 tokens                          │
│  AUTHORITY: StakingPool PDA (signed)       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      UPDATE REFERRER STATS                 │
│                                            │
│  IF referrer_stats account provided:       │
│    • total_commission_earned += 5          │
│    • total_referrals += 1                  │
│                                            │
│  pool.total_referral_rewards += 5          │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         TRANSFER USER REWARDS              │
│                                            │
│  FROM: reward_vault                        │
│  TO:   user_reward_account                 │
│  AMOUNT: 95 tokens                         │
│  AUTHORITY: StakingPool PDA (signed)       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│         UPDATE USER STATE                  │
│                                            │
│  • user_stake.reward_pending = 0           │
│  • user_stake.total_earned += 100 (full)   │
│  • user_stake.reward_per_token_paid = current│
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│           CLAIM COMPLETE                   │
│                                            │
│  Event: ClaimEvent {                       │
│    user: user_pubkey,                      │
│    reward_amount: 95,      ← User gets 95% │
│    referral_commission: 5, ← Referrer gets 5%│
│    referrer: Some(referrer_pk),            │
│    timestamp: now                          │
│  }                                         │
└────────────────────────────────────────────┘
```

**Transaction Accounts:**

- `staking_pool` (write) - Updates referral rewards
- `user_stake` (write) - User's stake account
- `referrer_stats` (write, optional) - Referrer stats
- `reward_vault` (write) - Source of rewards
- `user_reward_account` (write) - User receives 95%
- `referrer_reward_account` (write, optional) - Referrer receives 5%
- `user` (signer) - Transaction signer
- `token_program` - For transfers

---

## Referral System Workflows

### Initialize Referrer Stats Account

**Function:** `initialize_referrer_stats()`

```
┌─────────────┐
│  REFERRER   │
└──────┬──────┘
       │
       │ Wants to track referral stats
       │
       │ Calls initialize_referrer_stats()
       │
       ▼
┌────────────────────────────────────────────┐
│      CREATE REFERRER STATS ACCOUNT         │
│                                            │
│  PDA: ["referrer_stats", referrer_pubkey]  │
│                                            │
│  Initialize:                               │
│    • referrer = referrer_pubkey            │
│    • total_referrals = 0                   │
│    • total_commission_earned = 0           │
│    • active = true                         │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│      REFERRER ACCOUNT READY                │
│                                            │
│  Can now track:                            │
│    • Number of people referred             │
│    • Total commission earned               │
│    • Active status                         │
└────────────────────────────────────────────┘
```

**Note:** This is optional! Referrals work without this account, but stats won't be tracked.

---

### Complete Referral Flow (End-to-End)

```
STEP 1: REFERRER SHARES LINK
┌─────────────┐
│  REFERRER   │
│  (Alice)    │
└──────┬──────┘
       │
       │ Generates referral link:
       │ https://app.com?ref=AlicePublicKey
       │
       ▼
   Shares link with friends


STEP 2: NEW USER STAKES WITH REFERRAL
┌─────────────┐
│  NEW USER   │
│   (Bob)     │
└──────┬──────┘
       │
       │ Opens link, sees Alice's address
       │
       │ Calls: stake_with_referral(1000, Some(Alice))
       │
       ▼
┌────────────────────────────────────────────┐
│      BOB'S USERSTAKE CREATED               │
│                                            │
│  user = Bob                                │
│  staked_amount = 1000                      │
│  referrer = Alice ← LOCKED FOREVER         │
└────────────────────────────────────────────┘


STEP 3: TIME PASSES, REWARDS ACCRUE

   Days: 1 ──── 2 ──── 3 ──── 4
         │      │      │      │
         ▼      ▼      ▼      ▼
      Rewards accumulate based on:
      - Bob's staked amount (1000)
      - Reward rate (e.g., 10 tokens/sec)
      - Time elapsed

      Pending rewards = ~34,560 tokens
                       (4 days * 86400 sec * 0.1 rate)


STEP 4: BOB CLAIMS REWARDS
┌─────────────┐
│     BOB     │
└──────┬──────┘
       │
       │ Calls: claim_rewards_with_referral()
       │
       ▼
┌────────────────────────────────────────────┐
│      CALCULATE DISTRIBUTION                │
│                                            │
│  Total pending = 34,560 tokens             │
│                                            │
│  Referral commission (5%):                 │
│    = 34,560 * 500 / 10000                  │
│    = 1,728 tokens → Alice                  │
│                                            │
│  User amount (95%):                        │
│    = 34,560 - 1,728                        │
│    = 32,832 tokens → Bob                   │
└────────────────────────────────────────────┘
       │
       ├──────────┬─────────────┐
       ▼          ▼             ▼
   ┌────────┐ ┌────────┐  ┌─────────────┐
   │  Bob   │ │ Alice  │  │Pool Stats   │
   │receives│ │receives│  │Updated      │
   │ 32,832 │ │ 1,728  │  └─────────────┘
   └────────┘ └────────┘


STEP 5: BOB STAKES MORE (ALICE STILL BENEFITS)
┌─────────────┐
│     BOB     │
└──────┬──────┘
       │
       │ Calls: stake_with_referral(500, _)
       │                              ↑
       │                              └── Ignored, referrer already set
       │
       ▼
┌────────────────────────────────────────────┐
│      BOB'S STAKE INCREASES                 │
│                                            │
│  staked_amount: 1000 → 1500                │
│  referrer: Alice (unchanged)               │
│                                            │
│  Future claims will still give 5% to Alice │
└────────────────────────────────────────────┘
```

**Key Points:**

1. Referrer link is set on FIRST stake only
2. Referrer cannot be changed later
3. All future claims give 5% commission to referrer
4. No limit on commission amounts
5. Referrer doesn't need to do anything after initial link share

---

## Reward Calculation Logic

### Mathematical Formula

```
Reward Per Token = Previous RPT + (
  (Reward Rate * Time Delta * PRECISION) / Total Staked
)

User Earned = (
  Staked Amount * (Current RPT - User's Paid RPT)
) / PRECISION
```

### Example Calculation

**Pool State:**

- Reward Rate: 10 tokens/second
- Total Staked: 10,000 tokens
- Last Update: 100 seconds ago
- Previous RPT: 5,000,000,000

**Calculate New RPT:**

```
time_delta = 100 seconds
increment = (10 * 100 * 1,000,000,000) / 10,000
         = 1,000,000,000,000 / 10,000
         = 100,000,000

new_RPT = 5,000,000,000 + 100,000,000
        = 5,100,000,000
```

**User Rewards (staked 1,000 tokens):**

```
user_paid_RPT = 5,000,000,000 (from last claim)
current_RPT = 5,100,000,000

earned = (1,000 * (5,100,000,000 - 5,000,000,000)) / 1,000,000,000
      = (1,000 * 100,000,000) / 1,000,000,000
      = 100,000,000,000 / 1,000,000,000
      = 100 tokens
```

### Update Triggers

Rewards are recalculated on:

1. Any user stake
2. Any user unstake
3. Any user claim
4. Admin updating reward rate

---

## Security Features

### 1. **Access Control**

```rust
// Admin-only functions
constraint = staking_pool.authority == authority.key()

Functions:
- initialize
- update_reward_rate
- toggle_referral_system
- set_pause_state
- withdraw_tokens
```

### 2. **Anti-Manipulation**

```rust
// Prevent self-referral
require!(
  referrer_pubkey != ctx.accounts.user.key(),
  StakingError::SelfReferral
);

// Referrer set once only
if user_stake.staked_amount == 0 {
  // First stake - can set referrer
  user_stake.referrer = Some(referrer);
} else {
  // Subsequent stakes - referrer ignored
}
```

### 3. **Emergency Controls**

```rust
// Pause all user operations
require!(!ctx.accounts.staking_pool.paused, StakingError::PoolPaused);

// Checked in:
- stake_with_referral
- unstake
- claim_rewards_with_referral
```

### 4. **Math Safety**

```rust
// All arithmetic uses checked operations
.checked_add()
.checked_sub()
.checked_mul()
.checked_div()

// Returns error instead of panicking on overflow
.ok_or(StakingError::MathOverflow)?
```

### 5. **Time Locks**

```rust
// Minimum 24-hour stake period
require!(
  stake_duration >= 86400,
  StakingError::MinimumStakePeriodNotMet
);
```

### 6. **Account Validation**

```rust
// Verify ownership and mint matching
constraint = token_account.owner == user.key()
constraint = token_account.mint == expected_mint
```

---

## Events & Monitoring

### Event Types

1. **StakeEvent**

```rust
{
  user: Pubkey,
  amount: u64,
  timestamp: i64,
  referrer: Option<Pubkey>
}
```

2. **UnstakeEvent**

```rust
{
  user: Pubkey,
  amount: u64,
  timestamp: i64
}
```

3. **ClaimEvent**

```rust
{
  user: Pubkey,
  reward_amount: u64,
  referral_commission: u64,
  referrer: Option<Pubkey>,
  timestamp: i64
}
```

4. **AddRewardsEvent**

```rust
{
  funder: Pubkey,
  amount: u64,
  timestamp: i64
}
```

5. **PauseEvent**

```rust
{
  paused: bool,
  timestamp: i64
}
```

### Monitoring Recommendations

**Admin should monitor:**

- Total staked vs reward vault balance
- Referral commission rates
- Unusual withdrawal patterns
- Pool pause/resume events

**Users should monitor:**

- Stake confirmations
- Reward accrual rates
- Claim transaction success
- Referral commissions earned

---

## Error Codes

```rust
0x1770 (6000) - MathOverflow
0x1771 (6001) - ZeroAmount
0x1772 (6002) - InsufficientStakedAmount
0x1773 (6003) - NoRewardsToClaim
0x1774 (6004) - Unauthorized
0x1775 (6005) - SelfReferral
0x1776 (6006) - InvalidReferrerAccount
0x1777 (6007) - PoolPaused
0x1778 (6008) - MinimumStakePeriodNotMet
```

---

## Best Practices

### For Admin:

1. Always add rewards before users stake
2. Monitor reward vault balance regularly
3. Use pause in emergencies only
4. Test reward rate changes on devnet first
5. Keep enough tokens for all stakes

### For Users:

1. Verify referrer address before staking
2. Remember 24-hour lock period
3. Claim rewards regularly to compound
4. Check transaction confirmation
5. Keep small amount for transaction fees

### For Referrers:

1. Initialize stats account for tracking
2. Share genuine referral links only
3. Monitor commission earnings
4. Encourage referred users to stake more
5. Build trust with community

---

## Summary

This staking contract provides:

- ✅ Flexible staking (any amount, any time after 24hrs)
- ✅ Real-time reward accrual
- ✅ 5% referral commission system
- ✅ Separate staking and reward tokens
- ✅ Emergency pause functionality
- ✅ Admin controls for reward management
- ✅ Comprehensive event logging
- ✅ Math overflow protection
- ✅ Account validation and security

The contract successfully implements a production-ready staking system with a built-in referral program, suitable for token communities looking to incentivize long-term holding and user growth.

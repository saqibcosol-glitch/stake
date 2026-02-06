# Solana Staking with Referral DApp

![alt text](https://www.daulathussain.com/wp-content/uploads/2025/10/Create-Deploy-Solana-Staking-with-Referral-DApp-Rust-Anchor-Smart-Contract-Next.js-TypeScript-Full-Project.jpg)

- [Final Source Code](https://www.theblockchaincoders.com/sourceCode/create-and-deploy-solana-staking-with-referral-dapp-or-rust-+-anchor-smart-contract-next.js-typescript-or-full-project)

#### Setup Video

- [Final Code Setup video](https://youtu.be/VzHP6y3tTMA?si=zmlZSnjAqSZKAWC5)

## Project Overview

Create & Deploy Solana Staking with Referral DApp | Rust + Anchor Smart Contract, Next.js, TypeScript | Full Project

In this Solana Project, we’ll build and deploy a Staking DApp with a Referral System using Rust, Anchor, Next.js, and TypeScript. 💎

You’ll learn how to develop and integrate a complete on-chain staking mechanism on Solana, connect it to a modern web frontend, and implement a referral reward logic for users to earn extra tokens.

🔧 What You’ll Learn:

- Building Solana staking smart contracts with Rust + Anchor
- Integrating on-chain programs into Next.js frontend
- Creating a Referral reward system on Solana
- Wallet integration and transaction handling
- Full DApp deployment workflow (Devnet → Mainnet)

💡 Tech Stack:
Rust • Anchor • Solana Web3.js • Next.js • TypeScript • Phantom Wallet

## Instruction

Kindly follow the following Instructions to run the project in your system and install the necessary requirements

#### Deploying Dapp

```
  WATCH: Hostinger
  Get : Discount 75%
  URL: https://www.hostg.xyz/aff_c?offer_id=6&aff_id=139422
```

### MULTI-CURRENCY ICO DAPP

```
  PROJECT: MULTI-CURRENCY ICO DAPP
  Code: https://www.theblockchaincoders.com/sourceCode/create-and-deploy-a-solana-multi-currency-ico-dapp-or-accept-usdt-and-sol-payments-or-rust-+-anchor-+-next.js-+-web3.js
  VIDEO: https://youtu.be/YMESzVrs41E?si=EuEUWc0G81Q_m-Tg
```

#### Install Vs Code Editor

```
  GET: VsCode Editor
  URL: https://code.visualstudio.com/download
```

#### NodeJs & NPM Version

```
  NodeJs: 20 / LATEST
  URL: https://nodejs.org/en/download
  Video: https://youtu.be/PIR0oBVowXU?si=9eNdR29u37F2ujJJ
```

All you need to follow the complete project and follow the instructions which are explained in the tutorial by Daulat

## Final Code Instruction

If you download the final source code then you can follow the following instructions to run the Dapp successfully

#### TATUM

```
  OPEN: TATUM
  URL: https://tatum.io/
```

#### Solana Playground ID

```
  OPEN: Solana Playground ID
  URL: https://beta.solpg.io/
```

#### ALCHEMY

```
  OPEN: ALCHEMY.COM
  URL: https://www.alchemy.com/
```

## Important Links

- [Get Pro Blockchain Developer Course](https://www.theblockchaincoders.com/pro-nft-marketplace)
- [Support Creator](https://bit.ly/Support-Creator)
- [All Projects Source Code](https://www.theblockchaincoders.com/SourceCode)

## Authors

- [@theblockchaincoders.com](https://www.theblockchaincoders.com/)
- [@consultancy](https://www.theblockchaincoders.com/consultancy)
- [@youtube](https://www.youtube.com/@daulathussain)

# Solana Staking with Referral DApp

A decentralized staking platform built on Solana blockchain with an integrated referral system. Users can stake tokens, earn rewards, and benefit from referring others to the platform.

## Features

### User Features

- **Wallet Integration**: Connect using Phantom, Solflare, Torus, or Ledger wallets
- **Flexible Staking**: Stake and unstake tokens anytime without lock-up periods
- **Real-time Rewards**: Track and claim rewards in real-time
- **Referral System**: Earn commission by referring new users
- **Transaction History**: View all your staking activities stored locally

### Admin Features

- **Pool Initialization**: Set up staking pool with custom reward rates
- **Reward Management**: Add rewards to the pool
- **Rate Updates**: Adjust reward distribution rates
- **Pause/Resume**: Emergency pause functionality
- **Referral Toggle**: Enable or disable the referral system
- **Token Withdrawal**: Withdraw tokens from the staking vault

## Tech Stack

- **Frontend**: Next.js 13, TypeScript, Tailwind CSS
- **Blockchain**: Solana (Devnet/Mainnet)
- **Smart Contracts**: Anchor Framework (Rust)
- **Wallet Adapter**: Solana Wallet Adapter
- **State Management**: React Hooks
- **Storage**: Local Storage for transaction history
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- A Solana wallet (Phantom recommended)
- SOL tokens (for devnet, get from [Solana Faucet](https://faucet.solana.com/))

### Installation

1. **Clone the repository**

   ```bash
   cd Solana-Staking-Refferal
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment Variables**

   The `.env.local` file should contain:

   ```env
   NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID
   NEXT_PUBLIC_TOKEN_ADDRESS=YOUR_TOKEN_ADDRESS
   NEXT_PUBLIC_ADMIN=YOUR_ADMIN_WALLET_ADDRESS
   NEXT_PUBLIC_ACTIVE_NETWORK=devnet
   ```

   - `NEXT_PUBLIC_PROGRAM_ID`: Your deployed Anchor program ID
   - `NEXT_PUBLIC_TOKEN_ADDRESS`: The token mint address for staking
   - `NEXT_PUBLIC_ADMIN`: Admin wallet public key
   - `NEXT_PUBLIC_ACTIVE_NETWORK`: Network (`devnet` or `mainnet-beta`)

4. **Run the development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
Solana-Staking-Refferal/
├── app/                    # Next.js app directory
│   ├── dashboard/         # User dashboard page
│   ├── admin/             # Admin dashboard page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── AdminDashboard.tsx # Admin panel
│   ├── Button.tsx         # Button component
│   ├── Card.tsx           # Card components
│   ├── Header.tsx         # Navigation header
│   ├── Input.tsx          # Input components
│   ├── Modal.tsx          # Modal component
│   ├── ReferralCard.tsx   # Referral system
│   ├── TransactionHistory.tsx # Transaction list
│   └── UserDashboard.tsx  # User staking interface
├── contexts/              # React contexts
│   └── WalletContextProvider.tsx # Wallet adapter setup
├── hooks/                 # Custom React hooks
├── lib/                   # Libraries and configs
│   └── idl.json          # Anchor program IDL
├── types/                 # TypeScript type definitions
│   └── index.ts          # Type definitions
├── utils/                 # Utility functions
│   ├── config.ts         # App configuration
│   ├── helpers.ts        # Helper functions
│   ├── program.ts        # Solana program interactions
│   └── storage.ts        # Local storage service
├── .env.local            # Environment variables
├── package.json          # Dependencies
├── tailwind.config.ts    # Tailwind configuration
└── tsconfig.json         # TypeScript configuration
```

## Usage Guide

### For Users

1. **Connect Wallet**

   - Click "Connect Wallet" in the header
   - Select your wallet provider
   - Approve the connection

2. **Stake Tokens**

   - Navigate to Dashboard
   - Click "Stake Now"
   - Enter amount and optional referrer address
   - Confirm transaction

3. **Claim Rewards**

   - View pending rewards on Dashboard
   - Click "Claim Rewards"
   - Approve transaction to receive rewards

4. **Unstake Tokens**

   - Click "Unstake" on Dashboard
   - Enter amount to withdraw
   - Confirm transaction

5. **Use Referral System**
   - Initialize your referral account
   - Copy and share your referral link
   - Earn commission when others stake using your link

### For Admins

1. **Initialize Pool**

   - Navigate to Admin page
   - Click "Initialize"
   - Set reward rate and enable/disable referrals
   - Confirm transaction

2. **Add Rewards**

   - Click "Add Rewards"
   - Enter amount to add to reward pool
   - Confirm transaction

3. **Update Reward Rate**

   - Click "Update Rate"
   - Enter new reward rate (tokens per second)
   - Confirm transaction

4. **Pause/Resume Pool**

   - Click "Pause" or "Resume"
   - Confirm to toggle pool state

5. **Toggle Referral System**
   - Click "Enable" or "Disable"
   - Confirm to toggle referral functionality

## Network Configuration

### Switching Networks

To switch between devnet and mainnet:

1. Update `.env.local`:

   ```env
   # For Devnet
   NEXT_PUBLIC_ACTIVE_NETWORK=devnet

   # For Mainnet
   NEXT_PUBLIC_ACTIVE_NETWORK=mainnet-beta
   ```

2. Update your program ID and token addresses accordingly
3. Restart the development server

## Smart Contract

The smart contract is built using Anchor Framework and includes:

- **Initialize**: Set up the staking pool
- **Stake with Referral**: Stake tokens with optional referrer
- **Unstake**: Withdraw staked tokens
- **Claim Rewards**: Claim accumulated rewards
- **Add Rewards**: Admin function to add rewards
- **Update Reward Rate**: Admin function to change APY
- **Toggle Referral**: Enable/disable referral system
- **Pause/Resume**: Emergency pause functionality
- **Withdraw Tokens**: Admin emergency withdrawal

## Security Features

- Smart contracts built with Anchor Framework
- Admin-only functions protected by authority checks
- Pause mechanism for emergency situations
- All transactions verifiable on Solana Explorer
- Client-side validation for user inputs

## Transaction History

All transactions are stored locally in browser's Local Storage:

- Stake/Unstake operations
- Reward claims
- Admin actions
- Transaction status and timestamps
- Links to Solana Explorer for verification

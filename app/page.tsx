'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Card, StatsCard } from '@/components/Card'
import { Button } from '@/components/Button'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getConfig } from '@/utils/config'

const Roadmap = dynamic(() => import('@/components/Roadmap'), {
  loading: () => <div className="py-20 text-center text-gray-500">Loading...</div>,
  ssr: false // Roadmap is visual only, no SEO critical content above fold
})
import { useWalletStats } from '@/hooks/useWalletStats'
import { formatTokenAmount, formatNumber } from '@/utils/helpers'
import { MiningVisual } from '@/components/MiningVisual'
import { Tokenomics } from '@/components/Tokenomics'

export default function HomePage() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const config = getConfig()
  const stats = useWalletStats()
  const { poolData, userStakeData, tokenBalance: walletBalance, liveRewards } = stats

  const [apy, setApy] = useState<string>('Up to 15%')

  useEffect(() => {
    // Calculate APY whenever poolData changes
    if (poolData && Number(poolData.totalStaked) > 0) {
      const rewardRate = Number(poolData.rewardRate);
      const totalStaked = Number(poolData.totalStaked);
      const secondsInYear = 31536000;
      const calculatedApy = ((rewardRate * secondsInYear) / totalStaked) * 100;
      setApy(`${calculatedApy.toFixed(2)}%`);
    } else if (poolData && Number(poolData.totalStaked) === 0) {
      // If pool exists but nothing staked, show default or high APY
      setApy('High APY');
    }
  }, [poolData]);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-16 animate-fadeIn relative">
          {/* Decorative background blur */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-solana-purple/20 blur-[100px] rounded-full -z-10" />

          <div className="inline-block mb-6 relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-glow mx-auto animate-bounce-slow">
              <video
                src="/grok-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6 glow-text tracking-tight leading-tight">
            Turn Your Wallet into a <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-solana-purple to-solana-teal">
              Money Printer
            </span>
          </h1>
          <p className="text-base md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto px-4 leading-relaxed">
            Stake $COSOL to activate your cloud node. Real-time payouts every second.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">{publicKey ? 'Go to Dashboard' : 'Start Mining Now'}</Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Learn More
              </Button>
            </a>
          </div>
        </div>

        {/* Stats Section - New Grid Implementation */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-16">
          <StatsCard
            title="Current Network APY"
            value="Dynamic"
            subtitle={<span className="text-solana-teal">High Yield</span>}
            className="glass-panel"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatsCard
            title="Instant Withdrawals"
            value="Real-time"
            subtitle="Claim anytime"
            className="glass-panel"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Total Value Locked (TVL)"
            value={poolData ? `${formatTokenAmount(poolData.totalStaked)} ${config.tokenSymbol}` : 'Loading...'}
            subtitle={poolData?.referralEnabled ? 'Active' : 'Disabled'}
            className="glass-panel col-span-2 md:col-span-1"
            loading={poolData === null}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>


        {/* User Details (if connected) */}
        {
          publicKey && (
            <Card gradient glow className="mb-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                <MiningVisual isMining={parseFloat(liveRewards) > 0 || (userStakeData && parseFloat(formatTokenAmount(userStakeData.stakedAmount)) > 0)} size="sm" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-6 text-center">Your Staking Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                  <p className="text-gray-400 text-sm mb-2">Wallet Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {walletBalance !== null ? formatNumber(parseFloat(formatTokenAmount(walletBalance))) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{config.tokenSymbol}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                  <p className="text-gray-400 text-sm mb-2">Your Staked</p>
                  <p className="text-2xl font-bold text-white">
                    {userStakeData ? formatNumber(parseFloat(formatTokenAmount(userStakeData.stakedAmount))) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{config.tokenSymbol}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                  <p className="text-gray-400 text-sm mb-2">Pending Rewards</p>
                  <p className="text-2xl font-bold text-white">
                    {userStakeData ? formatNumber(parseFloat(liveRewards)) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{config.tokenSymbol}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center">
                  <p className="text-gray-400 text-sm mb-2">Total Earned</p>
                  <p className="text-2xl font-bold text-white">
                    {userStakeData ? formatNumber(parseFloat(formatTokenAmount(userStakeData.totalEarned))) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{config.tokenSymbol}</p>
                </div>
              </div>
            </Card>
          )
        }

        {/* Features Section */}
        <div id="features" className="mb-16 md:mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose Us?</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-solana-purple to-solana-teal mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-solana-purple/10 border border-solana-purple/30 rounded-full flex items-center justify-center mb-4 text-solana-purple">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Secure & Audited</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Built with Anchor Framework on Solana. Smart contracts are secure and thoroughly
                  tested.
                </p>
              </div>
            </Card>

            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-solana-teal/10 border border-solana-teal/30 rounded-full flex items-center justify-center mb-4 text-solana-teal">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Built on Solana blockchain for instant transactions and low fees.
                </p>
              </div>
            </Card>

            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mb-4 text-blue-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Flexible Staking</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Flexible staking options with a default 30-day lock-up period for maximum rewards.
                </p>
              </div>
            </Card>

            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-pink-500/10 border border-pink-500/30 rounded-full flex items-center justify-center mb-4 text-pink-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Passive Income</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Earn rewards automatically while you hold your staked tokens.
                </p>
              </div>
            </Card>

            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center mb-4 text-purple-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Referral Program</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Earn extra rewards by referring friends to our staking platform.
                </p>
              </div>
            </Card>

            <Card glow className="h-full">
              <div className="text-center h-full flex flex-col items-center">
                <div className="w-14 h-14 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mb-4 text-green-400">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Transparent</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  All transactions are on-chain and verifiable. Full transparency guaranteed.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* How it Works - Timeline on Mobile */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>

          <div className="space-y-4 md:grid md:grid-cols-4 md:gap-6 md:space-y-0">
            {[
              {
                step: '1',
                title: 'Connect Wallet',
                description: 'Connect your Solana wallet (Phantom, Solflare, etc.)',
              },
              {
                step: '2',
                title: 'Stake Tokens',
                description: 'Choose amount and stake your tokens to start earning',
              },
              {
                step: '3',
                title: 'Earn Rewards',
                description: 'Watch your rewards accumulate in real-time',
              },
              {
                step: '4',
                title: 'Claim Anytime',
                description: 'Claim rewards and unstake whenever you want',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                {/* Connector Line (Mobile) */}
                <div className="md:hidden absolute left-6 top-12 bottom-[-16px] w-[2px] bg-white/10 group-last:hidden" />

                <Card gradient className="relative z-10">
                  <div className="flex md:block items-center gap-4 text-left md:text-center">
                    <div className="flex-shrink-0 w-12 h-12 bg-solana-gradient rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1 md:mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-400 leading-snug">{item.description}</p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

      </div>



      {/* Roadmap Section */}


      {/* CTA Section with Token & Contract Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          {/* Token Information */}
          <Card gradient glow>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                {config.tokenName} ({config.tokenSymbol})
              </h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">{config.tokenDescription}</p>
            </div>

            <div className="mb-8">
              <Tokenomics />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token Details */}
              <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                <div className="flex items-center justify-center mb-4">
                  {config.videoUrl ? (
                    <video
                      src={config.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-32 h-32 rounded-full object-cover shadow-lg shadow-solana-purple/30"
                    />
                  ) : config.tokenLogo ? (
                    <Image
                      src={config.tokenLogo}
                      alt={config.tokenName}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full"
                    />
                  ) : null}
                </div>
                <h3 className="text-xl font-semibold text-white mb-4 text-center">Token Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-semibold">{config.tokenName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Symbol:</span>
                    <span className="text-white font-semibold">{config.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Supply:</span>
                    <span className="text-white font-semibold">{config.tokenSupply}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white font-semibold capitalize">{config.network}</span>
                  </div>
                </div>
              </div>

              {/* Contract Details */}
              <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 bg-solana-gradient rounded-full flex items-center justify-center">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  Contract Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Program ID:</span>
                    <p className="text-white font-mono text-xs break-all mt-1 bg-black/30 p-2 rounded">
                      {config.programId}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Token Address:</span>
                    <p className="text-white font-mono text-xs break-all mt-1 bg-black/30 p-2 rounded">
                      {config.tokenAddress}
                    </p>
                  </div>
                  {poolData && (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-gray-400">Total Staked:</span>
                        <span className="text-white font-semibold">
                          {formatTokenAmount(poolData.totalStaked)} {config.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Status:</span>
                        <span
                          className={`font-semibold ${poolData.paused ? 'text-red-400' : 'text-green-400'
                            }`}
                        >
                          {poolData.paused ? 'Paused' : 'Active'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-gray-400">Audit:</span>
                  <a
                    href="https://docs.createonsol.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-solana-teal hover:text-white transition-colors text-sm font-semibold flex items-center gap-1 group"
                  >
                    View Report
                    <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </Card >



          {/* Roadmap Section */}
          <Roadmap />

          {/* CTA */}
          <div className="mt-12 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-solana-purple to-solana-teal rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200"></div>
            <div className="relative px-6 py-6 bg-solana-dark rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Ready to Start Earning?
                </h2>
                <p className="text-gray-400 text-sm">
                  Join thousands of users already earning passive income through our secure staking platform.
                </p>
              </div>

              <Link href="/dashboard" className="shrink-0">
                <Button size="lg" className="px-8 shadow-glow hover:scale-105 transition-transform duration-200">
                  {publicKey ? 'Go to Dashboard' : 'Start Staking Now'}
                </Button>
              </Link>
            </div>
          </div>
        </div >
      </div >
    </>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import dynamic from 'next/dynamic'
import { getConfig, isAdmin } from '@/utils/config'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getProgram, fetchUserStake, fetchStakingPool } from '@/utils/program'
import { formatTokenAmount, formatNumber, calculateLiveRewards } from '@/utils/helpers'
import { PublicKey } from '@solana/web3.js'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'
import { onDataRefresh } from '@/utils/events'

import { useWalletStats, WalletStats } from '@/hooks/useWalletStats'

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
)

export const Header: React.FC = () => {
  const { publicKey } = useWallet()
  const stats = useWalletStats() // Centralized stats fetching
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isUserAdmin = publicKey ? isAdmin(publicKey.toBase58()) : false

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/buy', label: 'Buy Token' },
    ...(isUserAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  // Close mobile menu on pathname change (navigation)
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // JS-level mobile menu safety and tracking
  useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches
      setIsMobile(mobile)
      if (!mobile && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileMenuOpen])

  return (
    <>
      <header className="sticky top-0 z-50 transition-all duration-300 border-b border-white/5 bg-solana-dark/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group relative z-50">
              <div className="w-12 h-12 bg-gradient-to-tr from-solana-purple to-solana-teal rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300">
                <video
                  src="/grok-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-white tracking-tight">COSOL Staking</h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className={cn(
              "items-center gap-1",
              mounted && !isMobile ? "flex" : "hidden md:flex"
            )}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    pathname === link.href
                      ? "text-solana-teal bg-solana-teal/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <TokenBalanceDisplay balance={stats.tokenBalance} />
                <PendingRewardsDisplay rewards={stats.liveRewards} />
              </div>

              <div className="relative z-[45]">
                <WalletMultiButton className="!h-10 !px-4 !text-sm" />
              </div>

              {/* Mobile Menu Button */}
              <button
                className={cn(
                  "relative z-50 w-10 h-10 items-center justify-center text-white focus:outline-none",
                  mounted && !isMobile ? "hidden" : "flex md:hidden"
                )}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <div className="relative w-6 h-5">
                  <motion.span
                    animate={mobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
                    className="absolute top-0 left-0 w-full h-0.5 bg-current rounded-full origin-center transition-colors"
                  />
                  <motion.span
                    animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                    className="absolute top-[9px] left-0 w-full h-0.5 bg-current rounded-full transition-colors"
                  />
                  <motion.span
                    animate={mobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-full origin-center transition-colors"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay - Force hidden on desktop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-solana-dark/95 backdrop-blur-2xl md:hidden flex flex-col pt-24 px-6"
          >
            <nav className="flex flex-col gap-2">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block text-2xl font-bold py-4 border-b border-white/5 transition-colors",
                      pathname === link.href ? "text-solana-teal" : "text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 space-y-4 pb-10" // Added padding bottom for scroll
            >
              <MobileBalanceDisplay stats={stats} />
              {/* Add a secondary connect button for mobile menu if needed, though sticky header has one */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const TokenBalanceDisplay: React.FC<{ balance: number | null }> = ({ balance }) => {
  if (balance === null) return null

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
      <span className="text-gray-400 text-xs">Bal:</span>
      <span className="text-white font-bold text-sm">
        {balance !== null ? formatNumber(parseFloat(formatTokenAmount(balance))) : '0.00'}
      </span>
    </div>
  )
}

const PendingRewardsDisplay: React.FC<{ rewards: string }> = ({ rewards }) => {
  if (parseFloat(rewards) === 0) return null

  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-solana-teal/20 bg-solana-teal/10">
      <span className="text-xs text-solana-teal font-medium">Rewards:</span>
      <span className="text-sm font-bold text-solana-teal whitespace-nowrap">{rewards}</span>
    </div>
  )
}

// Mobile-specific balance display for the mobile menu
const MobileBalanceDisplay: React.FC<{ stats: WalletStats }> = ({ stats }) => {
  const { publicKey } = useWallet()

  if (!publicKey) return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
      <p className="text-gray-400">Connect wallet to view stats</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-gray-400 mb-1">Balance</p>
        <p className="text-xl font-bold text-white tracking-tight">
          {stats.tokenBalance !== null ? formatNumber(parseFloat(formatTokenAmount(stats.tokenBalance))) : '0.00'}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-solana-teal/10 border border-solana-teal/20">
        <p className="text-xs text-solana-teal mb-1">Rewards</p>
        <p className="text-xl font-bold text-solana-teal truncate">{stats.liveRewards}</p>
      </div>
    </div>
  )
}

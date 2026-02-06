import './globals.css'
import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { WalletContextProvider } from '@/contexts/WalletContextProvider'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Toaster } from 'react-hot-toast'

import NextTopLoader from 'nextjs-toploader';

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'COSOL Staking Referral - No-Code SaaS on Solana',
  description: "Don't just buy tokens—own the factory. $COSOL powers the most advanced No-Code SaaS on Solana. From instant SPL minting to viral MLM protocols, this is the utility key for the next wave of super-dapps.",
  keywords: ['Solana', 'SaaS', 'No-Code', 'Token Mint', 'MLM', 'DAO', 'Governance', 'COSOL', 'CreateOnSol', 'Utility'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <NextTopLoader
          color="#14f195"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
          shadow="0 0 10px #14f195,0 0 5px #14f195"
        />
        <WalletContextProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1a23',
                color: '#fff',
                border: '1px solid rgba(153, 69, 255, 0.3)',
                borderRadius: '0.75rem',
              },
              success: {
                iconTheme: {
                  primary: '#14f195',
                  secondary: '#1a1a23',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#1a1a23',
                },
              },
            }}
          />
        </WalletContextProvider>
      </body>
    </html>
  )
}

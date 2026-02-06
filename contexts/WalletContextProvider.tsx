'use client';

import { FC, ReactNode, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  WalletConnectWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { getConfig, getRpcUrl } from '@/utils/config';

require('@solana/wallet-adapter-react-ui/styles.css');

export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const config = getConfig();
  const network = config.network as WalletAdapterNetwork;

  // Use custom RPC endpoint from config
  const endpoint = useMemo(() => {
    const rpcUrl = getRpcUrl();
    console.log('Using RPC endpoint:', rpcUrl);
    return rpcUrl;
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new WalletConnectWalletAdapter({
        network: network as WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet,
        options: {
          projectId: 'd8e2228daafb8993538bf475a3efa54e',
          metadata: {
            name: 'Create On Sol',
            description: 'Solana Staking & Referral Platform',
            url: 'https://www.createonsol.com',
            icons: ['https://www.createonsol.com/logo.png'],
          },
        },
      }),
    ],
    [network]
  );

  // Connection config without WebSocket
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000,
  }), []);

  // Completely suppress WebSocket at the browser level
  useEffect(() => {
    // Save original WebSocket and console methods
    const OriginalWebSocket = window.WebSocket;
    const originalError = console.error;
    const originalWarn = console.warn;

    // Create a proxy to intercept WebSocket creation
    (window as any).WebSocket = new Proxy(OriginalWebSocket, {
      construct(target: any, args: any[]) {
        const url = args[0] as string;

        // Block WebSocket for Solana/Tatum RPC endpoints
        if (url.includes('solana') || url.includes('tatum')) {
          console.log('🚫 WebSocket blocked for:', url.substring(0, 50) + '...');

          // Return a mock WebSocket that does nothing
          const mockWs: any = {
            readyState: 3, // CLOSED
            onerror: null,
            onopen: null,
            onclose: null,
            onmessage: null,
            send() { },
            close() { },
            addEventListener() { },
            removeEventListener() { },
            dispatchEvent() { return true; },
          };

          // Trigger error callback immediately
          setTimeout(() => {
            if (mockWs.onerror) {
              (mockWs.onerror as any)(new Event('error'));
            }
          }, 0);

          return mockWs;
        }

        // Allow WebSocket for other services
        return Reflect.construct(target, args);
      }
    });

    // Override console.error to filter WebSocket errors
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || '';
      if (
        errorMessage.includes('WebSocket') ||
        errorMessage.includes('ws error') ||
        errorMessage.includes('wss://') ||
        errorMessage.includes('WebSocketBrowserImpl')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    // Override console.warn to filter WebSocket warnings
    console.warn = (...args: any[]) => {
      const warnMessage = args[0]?.toString() || '';
      if (
        warnMessage.includes('WebSocket') ||
        warnMessage.includes('ws error') ||
        warnMessage.includes('wss://')
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.log('✅ HTTP-only mode enabled - WebSocket connections blocked');

    return () => {
      // Restore originals on cleanup
      window.WebSocket = OriginalWebSocket;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

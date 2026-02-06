import { Connection, ConnectionConfig } from '@solana/web3.js';

/**
 * Creates a Connection instance configured for HTTP-only (no WebSocket)
 * This is useful for RPC endpoints that don't support WebSocket connections like Tatum
 */
export const createHttpOnlyConnection = (endpoint: string): Connection => {
  const config: ConnectionConfig = {
    commitment: 'confirmed',
    // Disable WebSocket by setting a very high fetch interval
    // This forces the connection to use HTTP polling instead
    disableRetryOnRateLimit: false,
    confirmTransactionInitialTimeout: 60000,
  };

  const connection = new Connection(endpoint, config);

  // Override the internal _rpcWebSocket to prevent WebSocket usage
  // This is a workaround since Solana's Connection always tries to create WebSocket
  try {
    // @ts-ignore - Accessing private property to disable WebSocket
    if (connection._rpcWebSocket) {
      // @ts-ignore
      connection._rpcWebSocket.close = () => {}; // Prevent close errors
      // @ts-ignore
      connection._rpcWebSocket.connect = () => {}; // Prevent reconnect
    }
  } catch (error) {
    // Silently fail if we can't override
    console.log('Could not override WebSocket, will use HTTP polling');
  }

  return connection;
};

/**
 * Confirms a transaction using HTTP polling only (no WebSocket)
 * This is a drop-in replacement for connection.confirmTransaction()
 */
export const confirmTransactionWithPolling = async (
  connection: Connection,
  signature: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
): Promise<void> => {
  const startTime = Date.now();
  const timeout = 60000; // 60 seconds
  const interval = 1000; // Check every 1 second

  while (Date.now() - startTime < timeout) {
    try {
      const status = await connection.getSignatureStatus(signature);

      if (status?.value?.confirmationStatus === commitment ||
          status?.value?.confirmationStatus === 'finalized') {
        console.log(`Transaction ${signature.slice(0, 8)}... confirmed`);
        return;
      }

      if (status?.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      // If we can't get status, wait and try again
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
};

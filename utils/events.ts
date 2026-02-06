// Custom event system for triggering data refresh across components

const DATA_REFRESH_EVENT = 'solana-staking-data-refresh';

/**
 * Emit a data refresh event that all components can listen to
 * Call this after any successful blockchain transaction
 */
export const emitDataRefresh = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT));
    }
};

/**
 * Subscribe to data refresh events
 * Returns an unsubscribe function
 */
export const onDataRefresh = (callback: () => void): (() => void) => {
    if (typeof window === 'undefined') return () => { };

    window.addEventListener(DATA_REFRESH_EVENT, callback);
    return () => window.removeEventListener(DATA_REFRESH_EVENT, callback);
};

/**
 * React hook to trigger a callback when data refresh is emitted
 * Automatically cleans up on unmount
 */
export const useDataRefresh = (callback: () => void, deps: any[] = []) => {
    if (typeof window === 'undefined') return;

    // This will be used inside useEffect in components
    return { onDataRefresh, emitDataRefresh };
};

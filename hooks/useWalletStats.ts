'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import {
    getProgram,
    fetchStakingPool,
    fetchUserStake,
    fetchUserTokenBalance,
    fetchSolBalance,
    fetchReferrerStats
} from '@/utils/program';
import { getConfig } from '@/utils/config';
import { onDataRefresh } from '@/utils/events';
import { calculateLiveRewards, calculateLiveReferralCommission } from '@/utils/helpers';

export interface WalletStats {
    solBalance: number;
    tokenBalance: number | null;
    poolData: any;
    userStakeData: any;
    referrerStats: any;
    liveRewards: string;
    liveReferralRewards: string;
    loading: boolean;
    refresh: () => void;
}

export const useWalletStats = (shouldPoll = true, pollInterval = 30000): WalletStats => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();

    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        solBalance: 0,
        tokenBalance: null as number | null,
        poolData: null as any,
        userStakeData: null as any,
        referrerStats: null as any,
    });

    const [liveRewards, setLiveRewards] = useState('0.0000');
    const [liveReferralRewards, setLiveReferralRewards] = useState('0.0000');

    const fetchData = useCallback(async () => {
        if (!publicKey || !connection) {
            return;
        }

        setLoading(true);
        try {
            const wallet = {
                publicKey,
                signTransaction: signTransaction || (() => { }),
                signAllTransactions: signAllTransactions || (() => { }),
            };
            const program = getProgram(connection, wallet as any);

            // Fetch individually to better catch specific errors
            const solPromise = fetchSolBalance(connection, publicKey).catch(() => 0);
            const poolPromise = fetchStakingPool(program, config.tokenAddress).catch(() => null);
            const userStakePromise = fetchUserStake(program, publicKey, config.tokenAddress).catch(() => null);
            const balancePromise = fetchUserTokenBalance(connection, publicKey, config.tokenAddress).catch(() => null);
            const refStatsPromise = fetchReferrerStats(program, publicKey).catch(() => null);

            const [sol, pool, userStake, balance, refStats] = await Promise.all([
                solPromise,
                poolPromise,
                userStakePromise,
                balancePromise,
                refStatsPromise
            ]);

            setStats({
                solBalance: sol || 0,
                tokenBalance: balance,
                poolData: pool,
                userStakeData: userStake,
                referrerStats: refStats
            });
        } catch (error) {
            console.error('Error fetching wallet stats:', error);
        } finally {
            setLoading(false);
        }
    }, [publicKey, connection, config.tokenAddress, signTransaction, signAllTransactions]);


    // Main data fetching effect
    useEffect(() => {
        fetchData();

        let intervalId: NodeJS.Timeout;
        if (shouldPoll && publicKey) {
            intervalId = setInterval(fetchData, pollInterval);
        }

        const unsubscribe = onDataRefresh(() => fetchData());

        return () => {
            if (intervalId) clearInterval(intervalId);
            unsubscribe();
        };
    }, [fetchData, shouldPoll, pollInterval, publicKey]);

    // Live ticking effect (1 second)
    useEffect(() => {
        if (!stats.poolData) return;

        const tick = () => {
            if (stats.poolData && stats.userStakeData) {
                setLiveRewards(calculateLiveRewards(stats.poolData, stats.userStakeData) || '0.0000');
            }
            if (stats.poolData && stats.referrerStats) {
                setLiveReferralRewards(calculateLiveReferralCommission(stats.poolData, stats.referrerStats) || '0.0000');
            }
        };

        const tickerId = setInterval(tick, 1000);
        tick();

        return () => clearInterval(tickerId);
    }, [stats.poolData, stats.userStakeData, stats.referrerStats]);

    return {
        ...stats,
        liveRewards,
        liveReferralRewards,
        loading,
        refresh: fetchData,
    };
};

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@/types';
import { getProgram, addRewards } from '@/utils/program';
import { parseTokenAmount, formatTokenAmount } from '@/utils/helpers';
import { storageService } from '@/utils/storage';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface AddRewardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    walletBalance: number;
    rewardVaultBalance: number | null;
}

export const AddRewardsModal: React.FC<AddRewardsModalProps> = ({ isOpen, onClose, onSuccess, walletBalance, rewardVaultBalance }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [rewardAmount, setRewardAmount] = useState('');

    const handleAddRewards = async () => {
        if (!publicKey || !rewardAmount) {
            toast.error('Please enter reward amount');
            return;
        }

        if (!signTransaction || !signAllTransactions) {
            toast.error('Wallet not properly connected');
            return;
        }

        setLoading(true);
        const txId = `addRewards-${Date.now()}`;

        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);
            const amount = parseTokenAmount(rewardAmount);

            const signature = await addRewards(
                program,
                wallet as any,
                config.tokenAddress,
                config.rewardTokenAddress,
                amount
            );

            const transaction: Transaction = {
                id: txId,
                type: 'addRewards',
                signature,
                amount: rewardAmount,
                timestamp: Date.now(),
                status: 'success',
                user: publicKey.toBase58(),
            };

            storageService.addTransaction(transaction);
            toast.success('Rewards added successfully!');
            onSuccess();
            onClose();
            setRewardAmount('');
        } catch (error: any) {
            console.error('Add rewards error:', error);
            toast.error(error.message || 'Failed to add rewards');

            const transaction: Transaction = {
                id: txId,
                type: 'addRewards',
                signature: '',
                amount: rewardAmount,
                timestamp: Date.now(),
                status: 'failed',
                user: publicKey.toBase58(),
            };
            storageService.addTransaction(transaction);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add Rewards"
        >
            <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                    <p className="text-xs text-gray-400 mb-1">Your Wallet Balance</p>
                    <p className="text-lg font-bold text-white">
                        {formatTokenAmount(walletBalance)} Tokens
                    </p>
                </div>
                {rewardVaultBalance !== null && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-2">
                        <p className="text-xs text-gray-400 mb-1">Current Reward Vault Balance</p>
                        <p className="text-lg font-bold text-white">
                            {formatTokenAmount(rewardVaultBalance)} Tokens
                        </p>
                    </div>
                )}
                <Input
                    label="Reward Amount"
                    type="number"
                    placeholder="0.0"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    fullWidth
                />
                <Button fullWidth onClick={handleAddRewards} loading={loading}>
                    Add Rewards
                </Button>
            </div>
        </Modal>
    );
};

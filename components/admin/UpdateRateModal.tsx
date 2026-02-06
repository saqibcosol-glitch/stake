import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@/types';
import { getProgram, updateRewardRate } from '@/utils/program';
import { parseTokenAmount } from '@/utils/helpers';
import { storageService } from '@/utils/storage';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface UpdateRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const UpdateRateModal: React.FC<UpdateRateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [newRewardRate, setNewRewardRate] = useState('');

    const handleUpdateRate = async () => {
        if (!publicKey || !newRewardRate) {
            toast.error('Please enter new reward rate');
            return;
        }

        if (!signTransaction || !signAllTransactions) {
            toast.error('Wallet not properly connected');
            return;
        }

        setLoading(true);
        const txId = `updateRate-${Date.now()}`;

        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);
            const dailyRate = parseFloat(newRewardRate);
            const ratePerSecond = dailyRate / 86400;
            const rate = parseTokenAmount(ratePerSecond.toString());

            const signature = await updateRewardRate(program, wallet as any, config.tokenAddress, rate);

            const transaction: Transaction = {
                id: txId,
                type: 'updateRate',
                signature,
                timestamp: Date.now(),
                status: 'success',
                user: publicKey.toBase58(),
            };

            storageService.addTransaction(transaction);
            toast.success('Reward rate updated successfully!');
            onSuccess();
            onClose();
            setNewRewardRate('');
        } catch (error: any) {
            console.error('Update rate error:', error);
            toast.error(error.message || 'Failed to update reward rate');

            const transaction: Transaction = {
                id: txId,
                type: 'updateRate',
                signature: '',
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
            title="Update Reward Rate"
        >
            <div className="space-y-4">
                <Input
                    label="New Reward Rate (Tokens Per Day)"
                    type="number"
                    placeholder="0.0"
                    value={newRewardRate}
                    onChange={(e) => setNewRewardRate(e.target.value)}
                    fullWidth
                />
                <Button fullWidth onClick={handleUpdateRate} loading={loading}>
                    Update Rate
                </Button>
            </div>
        </Modal>
    );
};

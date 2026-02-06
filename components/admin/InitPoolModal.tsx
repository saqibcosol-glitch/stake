import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@/types';
import { getProgram, initializePool } from '@/utils/program';
import { parseTokenAmount } from '@/utils/helpers';
import { storageService } from '@/utils/storage';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface InitPoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const InitPoolModal: React.FC<InitPoolModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [initRewardRate, setInitRewardRate] = useState('');
    const [initEnableReferral, setInitEnableReferral] = useState(true);

    const handleInitialize = async () => {
        if (!publicKey || !initRewardRate) {
            toast.error('Please fill all fields');
            return;
        }

        if (!signTransaction || !signAllTransactions) {
            toast.error('Wallet not properly connected');
            return;
        }

        setLoading(true);
        const txId = `initialize-${Date.now()}`;

        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);
            const dailyRate = parseFloat(initRewardRate);
            const ratePerSecond = dailyRate / 86400;
            const rewardRate = parseTokenAmount(ratePerSecond.toString());

            const signature = await initializePool(
                program,
                wallet as any,
                config.tokenAddress,
                config.rewardTokenAddress,
                rewardRate,
                initEnableReferral
            );

            const transaction: Transaction = {
                id: txId,
                type: 'initialize',
                signature,
                timestamp: Date.now(),
                status: 'success',
                user: publicKey.toBase58(),
            };

            storageService.addTransaction(transaction);
            toast.success('Pool initialized successfully!');
            onSuccess();
            onClose();
            setInitRewardRate('');
        } catch (error: any) {
            console.error('Initialize error:', error);
            toast.error(error.message || 'Failed to initialize pool');

            const transaction: Transaction = {
                id: txId,
                type: 'initialize',
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
        <Modal isOpen={isOpen} onClose={onClose} title="Initialize Pool">
            <div className="space-y-4">
                <Input
                    label="Reward Rate (Tokens Per Day)"
                    type="number"
                    placeholder="e.g. 100"
                    value={initRewardRate}
                    onChange={(e) => setInitRewardRate(e.target.value)}
                    fullWidth
                />
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="enableReferral"
                        checked={initEnableReferral}
                        onChange={(e) => setInitEnableReferral(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <label htmlFor="enableReferral" className="text-sm text-gray-300">
                        Enable Referral System
                    </label>
                </div>
                <Button fullWidth onClick={handleInitialize} loading={loading}>
                    Initialize Pool
                </Button>
            </div>
        </Modal>
    );
};

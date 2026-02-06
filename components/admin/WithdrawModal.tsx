import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@/types';
import { getProgram, withdrawTokens } from '@/utils/program';
import { parseTokenAmount, formatTokenAmount } from '@/utils/helpers';
import { storageService } from '@/utils/storage';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    stakingVaultBalance: number | null;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onSuccess, stakingVaultBalance }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const handleWithdraw = async () => {
        if (!publicKey || !withdrawAmount) {
            toast.error('Please enter withdraw amount');
            return;
        }

        if (!signTransaction || !signAllTransactions) {
            toast.error('Wallet not properly connected');
            return;
        }

        setLoading(true);
        const txId = `withdraw-${Date.now()}`;

        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);
            const amount = parseTokenAmount(withdrawAmount);

            const signature = await withdrawTokens(program, wallet as any, config.tokenAddress, amount);

            const transaction: Transaction = {
                id: txId,
                type: 'withdraw',
                signature,
                amount: withdrawAmount,
                timestamp: Date.now(),
                status: 'success',
                user: publicKey.toBase58(),
            };

            storageService.addTransaction(transaction);
            toast.success('Tokens withdrawn successfully!');
            onSuccess();
            onClose();
            setWithdrawAmount('');
        } catch (error: any) {
            console.error('Withdraw error:', error);
            toast.error(error.message || 'Failed to withdraw tokens');

            const transaction: Transaction = {
                id: txId,
                type: 'withdraw',
                signature: '',
                amount: withdrawAmount,
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
            title="Withdraw Tokens"
        >
            <div className="space-y-4">
                {stakingVaultBalance !== null && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                        <p className="text-xs text-gray-400 mb-1">Available in Staking Vault</p>
                        <p className="text-lg font-bold text-white">
                            {formatTokenAmount(stakingVaultBalance)} Tokens
                        </p>
                    </div>
                )}
                <Input
                    label="Withdraw Amount"
                    type="number"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    fullWidth
                />
                <Button fullWidth variant="danger" onClick={handleWithdraw} loading={loading}>
                    Withdraw
                </Button>
            </div>
        </Modal>
    );
};

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getProgram, updateReferralRates } from '@/utils/program';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface ReferralRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ReferralRateModal: React.FC<ReferralRateModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [rateL1, setRateL1] = useState('10');
    const [rateL2, setRateL2] = useState('5');
    const [rateL3, setRateL3] = useState('3');

    const handleUpdateReferralRates = async () => {
        if (!publicKey) return;
        if (!signTransaction || !signAllTransactions) {
            toast.error('Wallet does not support signing');
            return;
        }

        const totalRate = parseInt(rateL1 || '0') + parseInt(rateL2 || '0') + parseInt(rateL3 || '0');
        if (totalRate > 25) {
            toast.error('Total referral rates cannot exceed 25%');
            return;
        }

        setLoading(true);
        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);

            const l1 = parseInt(rateL1) * 100;
            const l2 = parseInt(rateL2) * 100;
            const l3 = parseInt(rateL3) * 100;

            await updateReferralRates(program, wallet as any, config.tokenAddress, l1, l2, l3);

            toast.success('Referral rates updated successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update referral rates error:', error);
            toast.error(error.message || 'Failed to update referral rates');
        } finally {
            setLoading(false);
        }
    };

    const totalRate = parseInt(rateL1 || '0') + parseInt(rateL2 || '0') + parseInt(rateL3 || '0');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configure Referral Rates (%)">
            <div className="space-y-4">
                <Input label="Level 1 (%)" type="number" value={rateL1} onChange={(e) => setRateL1(e.target.value)} fullWidth />
                <Input label="Level 2 (%)" type="number" value={rateL2} onChange={(e) => setRateL2(e.target.value)} fullWidth />
                <Input label="Level 3 (%)" type="number" value={rateL3} onChange={(e) => setRateL3(e.target.value)} fullWidth />

                {totalRate > 25 && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p className="text-sm text-red-400">⚠️ Total rates cannot exceed 25% (current: {totalRate}%)</p>
                    </div>
                )}

                <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                    Total: {totalRate}% / 25% max
                </div>

                <Button
                    fullWidth
                    onClick={handleUpdateReferralRates}
                    loading={loading}
                    disabled={totalRate > 25}
                >
                    Update Rates
                </Button>
            </div>
        </Modal>
    );
};

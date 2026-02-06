import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { getProgram, updateLockDuration } from '@/utils/program';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface LockDurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const LockDurationModal: React.FC<LockDurationModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [lockDuration, setLockDuration] = useState('30');

    const handleUpdateLockDuration = async () => {
        if (!publicKey || !lockDuration) {
            toast.error('Please enter lock duration');
            return;
        }

        setLoading(true);
        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);

            const durationSeconds = Math.floor(parseFloat(lockDuration) * 86400);
            const duration = new anchor.BN(durationSeconds);

            await updateLockDuration(program, wallet as any, config.tokenAddress, duration);

            toast.success('Lock duration updated successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update lock duration error:', error);
            toast.error(error.message || 'Failed to update lock duration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Update Lock Duration">
            <div className="space-y-4">
                <Input
                    label="Lock Duration (Days)"
                    type="number"
                    value={lockDuration}
                    onChange={(e) => setLockDuration(e.target.value)}
                    fullWidth
                />
                <Button fullWidth onClick={handleUpdateLockDuration} loading={loading}>Update Duration</Button>
            </div>
        </Modal>
    );
};

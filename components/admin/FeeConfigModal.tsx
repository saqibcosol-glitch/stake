import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { getProgram, updateFees } from '@/utils/program';
import { getConfig } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface FeeConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const FeeConfigModal: React.FC<FeeConfigModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const config = getConfig();
    const [loading, setLoading] = useState(false);
    const [feeStake, setFeeStake] = useState('0.001');
    const [feeUnstake, setFeeUnstake] = useState('0.001');
    const [feeClaim, setFeeClaim] = useState('0.0001');
    const [feeReceiver, setFeeReceiver] = useState('');

    const handleUpdateFees = async () => {
        if (!publicKey || !feeReceiver) {
            toast.error('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            const wallet = { publicKey, signTransaction, signAllTransactions };
            const program = getProgram(connection, wallet as any);

            const fStake = new anchor.BN(parseFloat(feeStake) * 1e9);
            const fUnstake = new anchor.BN(parseFloat(feeUnstake) * 1e9);
            const fClaim = new anchor.BN(parseFloat(feeClaim) * 1e9);
            const receiverObj = new PublicKey(feeReceiver);

            await updateFees(program, wallet as any, config.tokenAddress, fStake, fUnstake, fClaim, receiverObj);

            toast.success('Fees updated successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update fees error:', error);
            toast.error(error.message || 'Failed to update fees');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configure Fees (SOL)">
            <div className="space-y-4">
                <Input label="Stake Fee" type="number" value={feeStake} onChange={(e) => setFeeStake(e.target.value)} fullWidth />
                <Input label="Unstake Fee" type="number" value={feeUnstake} onChange={(e) => setFeeUnstake(e.target.value)} fullWidth />
                <Input label="Claim Fee" type="number" value={feeClaim} onChange={(e) => setFeeClaim(e.target.value)} fullWidth />
                <Input label="Fee Receiver Address" type="text" value={feeReceiver} onChange={(e) => setFeeReceiver(e.target.value)} fullWidth placeholder="Wallet Address" />
                <Button fullWidth onClick={handleUpdateFees} loading={loading}>Update Fees</Button>
            </div>
        </Modal>
    );
};

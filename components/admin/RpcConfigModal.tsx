import React, { useState, useEffect } from 'react';
import { getRpcUrl } from '@/utils/config';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import toast from 'react-hot-toast';

interface RpcConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RpcConfigModal: React.FC<RpcConfigModalProps> = ({ isOpen, onClose }) => {
    const [customRpcUrl, setCustomRpcUrl] = useState('');

    useEffect(() => {
        const savedRpc = localStorage.getItem('custom_rpc_url');
        if (savedRpc) setCustomRpcUrl(savedRpc);
        else setCustomRpcUrl(getRpcUrl());
    }, [isOpen]);

    const handleSaveRpc = () => {
        if (!customRpcUrl) {
            toast.error('Please enter a valid RPC URL');
            return;
        }
        localStorage.setItem('custom_rpc_url', customRpcUrl);
        toast.success('RPC URL saved! Reloading...');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleResetRpc = () => {
        localStorage.removeItem('custom_rpc_url');
        setCustomRpcUrl(getRpcUrl());
        toast.success('RPC URL reset to default! Reloading...');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="RPC Configuration"
        >
            <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                    <p className="text-sm text-yellow-200">
                        <span className="font-bold">Note:</span> This setting is local to your browser. It helps you bypass congested public RPCs.
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Custom RPC URL
                    </label>
                    <Input
                        value={customRpcUrl}
                        onChange={(e) => setCustomRpcUrl(e.target.value)}
                        placeholder="https://..."
                    />
                </div>
                <div className="flex gap-3">
                    <Button fullWidth variant="secondary" onClick={handleResetRpc}>
                        Reset Default
                    </Button>
                    <Button fullWidth onClick={handleSaveRpc}>
                        Save & Reload
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

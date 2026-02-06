'use client';

import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { getConfig } from '@/utils/config';
import { copyToClipboard } from '@/utils/helpers';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import '@jup-ag/plugin/css';

export const BuyToken: React.FC = () => {
    const config = getConfig();
    const { publicKey } = useWallet();
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            import("@jup-ag/plugin").then((mod) => {
                const init = mod.init;
                init({
                    displayMode: "integrated",
                    integratedTargetId: "integrated-terminal",
                    formProps: {
                        initialOutputMint: config.tokenAddress || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        referralAccount: config.jupiterReferralAccount,
                        referralFee: 250,
                    },
                    branding: {
                        name: config.tokenName || "Token Swap",
                    },
                });
            });
        }
    }, [config.tokenAddress, config.jupiterReferralAccount, config.tokenName]);

    return (
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Content: Jupiter Terminal */}
            <div className="md:col-span-2">
                <Card title="Jupiter Terminal" glow className="h-full min-h-[600px] flex flex-col bg-solana-dark/90">
                    <div className="mb-6">
                        <p className="text-gray-400 text-sm">
                            An open-sourced, lite version of Jupiter that provides end-to-end swap flow.
                        </p>
                    </div>
                    {/* Integrated Terminal Container - Added min-width for desktop */}
                    <div
                        id="integrated-terminal"
                        className="flex-1 rounded-xl overflow-hidden min-h-[500px] bg-black/20 border border-white/5"
                    />
                </Card>
            </div>

            {/* Sidebar: Token Details & External Exchanges */}
            <div className="md:col-span-1 space-y-6">
                <Card title="Token Details" glow className="bg-solana-dark/80 backdrop-blur-md border-purple-500/20">
                    <div className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-sm">Token Address</label>
                            <div className="flex items-center gap-2 mt-1 bg-black/40 p-3 rounded-lg border border-white/5">
                                <code className="text-purple-300 text-sm truncate flex-1">
                                    {config.tokenAddress || 'Not Configured'}
                                </code>
                                <button
                                    onClick={async () => {
                                        await copyToClipboard(config.tokenAddress);
                                        setIsCopied(true);
                                        toast.success('Address copied!');
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                                >
                                    {isCopied ? (
                                        <span className="text-green-400 text-xs">Copied</span>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <h4 className="text-white font-semibold mb-3">Discount Benefits</h4>
                            <ul className="space-y-2 mb-4">
                                <li className="flex items-center gap-2 text-sm text-gray-300">
                                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    <span>Get <strong>30% OFF</strong> on our <a href="http://www.createonsol.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Token Creator Platform</a></span>
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-300">
                                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Premium verified status
                                </li>
                                <li className="flex items-center gap-2 text-sm text-gray-300">
                                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Access to exclusive creator tools
                                </li>
                            </ul>

                            <a
                                href="http://www.createonsol.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 px-6 bg-solana-gradient text-white font-bold rounded-lg hover:shadow-glow transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Token Creator Platform
                            </a>
                        </div>
                    </div>
                </Card>

                <Card title="External Exchanges" className="bg-solana-dark/80 backdrop-blur-md">
                    <div className="space-y-3">
                        <a
                            href={`https://jup.ag/swap/SOL-${config.tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">JUP</div>
                                <span className="text-white font-medium">Open in Jupiter</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a
                            href={`https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${config.tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">RAY</div>
                                <span className="text-white font-medium">Open in Raydium</span>
                            </div>
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    );
};

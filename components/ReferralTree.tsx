'use client';


import React from 'react';
import { Card } from './Card';
import { useWallet } from '@solana/wallet-adapter-react';

interface ReferralTreeProps {
    l1?: number;
    l2?: number;
    l3?: number;
}

export const ReferralTree: React.FC<ReferralTreeProps> = ({ l1 = 10, l2 = 5, l3 = 3 }) => {
    const { publicKey } = useWallet();

    if (!publicKey) return null;

    // In a real app with indexer, we would fetch the tree here.
    // For now, we visualize the concept to encourage users.

    return (
        <Card title="Your Referral Empire" className="mt-8" glow>
            <div className="flex flex-col items-center justify-center py-8 space-y-8">
                {/* You (Root) */}
                <div className="flex flex-col items-center animate-bounce-slow">
                    <div className="w-16 h-16 bg-solana-gradient rounded-full flex items-center justify-center shadow-glow border-2 border-white">
                        <span className="text-white font-bold text-xs">YOU</span>
                    </div>
                    <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-transparent"></div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-8 w-full max-w-2xl px-2 md:px-4">
                    {/* Level 1 */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 border border-blue-400 rounded-full flex items-center justify-center mb-2">
                            <span className="text-blue-300 font-bold text-sm md:text-base">L1</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400">Direct Referrals</p>
                        <p className="text-[10px] md:text-xs text-green-400 mt-1">Earn {l1}%</p>
                    </div>

                    {/* Level 2 */}
                    <div className="flex flex-col items-center text-center opacity-75">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/20 border border-purple-400 rounded-full flex items-center justify-center mb-2">
                            <span className="text-purple-300 font-bold text-sm md:text-base">L2</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400">Friends of Friends</p>
                        <p className="text-[10px] md:text-xs text-green-400 mt-1">Earn {l2}%</p>
                    </div>

                    {/* Level 3 */}
                    <div className="flex flex-col items-center text-center opacity-50">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-pink-500/20 border border-pink-400 rounded-full flex items-center justify-center mb-2">
                            <span className="text-pink-300 font-bold text-sm md:text-base">L3</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400">Network Growth</p>
                        <p className="text-[10px] md:text-xs text-green-400 mt-1">Earn {l3}%</p>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10 text-center max-w-sm">
                    <p className="text-gray-300 text-sm">
                        Share your link to grow your tree! <br />
                        <span className="text-solana-teal font-bold mt-2 block">
                            The more they stake, the more you make.
                        </span>
                    </p>
                </div>
            </div>
        </Card>
    );
};


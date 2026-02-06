'use client';

import React from 'react';
import { BuyToken } from '@/components/BuyToken';

export default function BuyPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
            <div className="mb-8 animate-fadeIn text-center">
                <h1 className="text-4xl font-bold text-white mb-2 glow-text">Buy {process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'Token'}</h1>
                <p className="text-gray-400">Purchase tokens directly via Jupiter Swap or external exchanges</p>
            </div>

            <div className="animate-slideUp">
                <BuyToken />
            </div>
        </div>
    );
}

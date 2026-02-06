import React from 'react';

export const Loader: React.FC<{ text?: string, className?: string }> = ({ text = 'Loading...', className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
            <div className="relative w-16 h-16 mb-4">
                {/* Outer glowing ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-b-purple-500 animate-[spin_1.5s_linear_infinite] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>

                {/* Inner spinning ring (reverse) */}
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-l-cyan-400 border-r-pink-400 animate-[spin_2s_linear_infinite_reverse]"></div>

                {/* Center pulsing core */}
                <div className="absolute inset-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 animate-pulse shadow-lg"></div>
            </div>

            {/* Text with shimmer effect */}
            <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-[shimmer_2s_linear_infinite] bg-[length:200%_auto]">
                {text}
            </h3>
        </div>
    );
};

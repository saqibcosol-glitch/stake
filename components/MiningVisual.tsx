'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MiningVisualProps {
    isMining?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const MiningVisual: React.FC<MiningVisualProps> = ({
    isMining = true,
    size = 'md',
    className = ''
}) => {
    const sizeMap = {
        sm: 'w-12 h-12',
        md: 'w-24 h-24',
        lg: 'w-48 h-48',
    };

    return (
        <div className={`relative flex items-center justify-center perspective-1000 ${sizeMap[size]} ${className}`}>
            {/* Container for the 3D object */}
            <motion.div
                animate={isMining ? {
                    rotateY: 360,
                    rotateX: [0, 10, 0, -10, 0],
                } : {}}
                transition={{
                    rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                    rotateX: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full"
            >
                {/* The Brand Logo / Mining Asset */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Brand Logo Image */}
                    <Image
                        src="/logo.png"
                        alt="Mining"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(20,241,149,0.5)]"
                        style={{ transform: 'translateZ(10px)' }}
                    />

                    {/* Core Glow */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute w-12 h-12 bg-solana-teal/30 rounded-full blur-xl -z-10"
                    />
                </div>
            </motion.div>

            {/* Orbiting particles */}
            {isMining && (
                <>
                    {/* Radial Orbiters */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={`orbit-${i}`}
                                className="absolute w-1 h-1 bg-solana-teal rounded-full"
                                animate={{
                                    rotate: 360,
                                    scale: [1, 1.5, 1],
                                    opacity: [0, 1, 0],
                                }}
                                transition={{
                                    duration: 2 + i,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.5
                                }}
                                style={{
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-0.125rem',
                                    marginLeft: '-0.125rem',
                                    transformOrigin: `${25 + i * 10}px center`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Left Data Stream (feeding in) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-20 -ml-20 flex items-center overflow-hidden pointer-events-none opacity-50">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={`stream-left-${i}`}
                                className="absolute w-4 h-1 bg-solana-teal/80 rounded-sm shadow-[0_0_5px_theme(colors.solana.teal)]"
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 160, opacity: [0, 1, 1, 0] }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.4,
                                    repeatDelay: 0.5
                                }}
                                style={{ top: `${20 + (i % 3) * 20}%` }}
                            />
                        ))}
                    </div>

                    {/* Right Data Stream (feeding in) */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-20 -mr-20 flex items-center justify-end overflow-hidden pointer-events-none opacity-50">
                        {[...Array(5)].map((_, i) => (
                            <motion.div
                                key={`stream-right-${i}`}
                                className="absolute w-4 h-1 bg-solana-purple/80 rounded-sm shadow-[0_0_5px_theme(colors.solana.purple)]"
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: -160, opacity: [0, 1, 1, 0] }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "linear",
                                    delay: i * 0.4,
                                    repeatDelay: 0.5
                                }}
                                style={{ top: `${20 + (i % 3) * 20}%` }}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Lighting / Reflection Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-full blur-2xl opacity-30"></div>
        </div>
    );
};

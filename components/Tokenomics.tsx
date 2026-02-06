'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { Card } from './Card';
import { motion, AnimatePresence } from 'framer-motion';

const data = [
  { name: 'Staking & Rewards', value: 40, amount: '400,000,000', purpose: 'The "Core" Engine. High APY for long-term holders. Refilled via Buybacks.', color: '#9945FF' }, // Solana Purple
  { name: 'DEX Liquidity', value: 30, amount: '300,000,000', purpose: 'Multi-Asset Pools (SOL, USDC, USDT) launched on Meteora DLMM first.', color: '#14F195' }, // Solana Teal
  { name: 'CEX Listings', value: 10, amount: '100,000,000', purpose: 'Reserved for Tier 1 Exchanges (Gate.io, Mexc) to boost volume later.', color: '#3B82F6' }, // Blue
  { name: 'Team & Dev', value: 10, amount: '100,000,000', purpose: 'Locked & Vested. Aligns team incentives with long-term success.', color: '#F97316' }, // Orange
  { name: 'Ecosystem & Partners', value: 7, amount: '70,000,000', purpose: 'Grants for influencers, strategic partners, and protocol integrations.', color: '#A855F7' }, // Purple-500
  { name: 'Airdrop & Bounty', value: 3, amount: '30,000,000', purpose: 'Viral marketing rewards for early community tasks (Twitter/Telegram).', color: '#EC4899' }, // Pink
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#fff" className="text-lg font-bold">
        {payload.value}%
      </text>
      <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#ccc" className="text-xs">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

export const Tokenomics = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <Card gradient glow className="overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Chart Section */}
        <div className="relative h-[300px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                // @ts-ignore
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                dataKey="value"
                onMouseEnter={onPieEnter}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Details Section */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white mb-2">Token Distribution</h3>
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data[activeIndex].color }} />
                    <h4 className="text-xl font-bold text-white">{data[activeIndex].name}</h4>
                  </div>
                  <span className="text-2xl font-bold text-solana-teal">{data[activeIndex].value}%</span>
                </div>

                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                  <span className="text-gray-400 text-sm">Amount:</span>
                  <span className="text-white font-mono">{data[activeIndex].amount} COSOL</span>
                </div>

                <p className="text-gray-300 italic heading-relaxed">
                  &quot;{data[activeIndex].purpose}&quot;
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Legend for Overview (Static) */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {data.map((item, index) => (
              <div
                key={item.name}
                className={`text-xs flex items-center gap-1 cursor-pointer transition-opacity ${index === activeIndex ? 'opacity-100 font-bold' : 'opacity-50 hover:opacity-100'}`}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate text-white">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

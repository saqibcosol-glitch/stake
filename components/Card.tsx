import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  glow?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  className = '',
  glow = false,
  gradient = false,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={cn(
        "rounded-2xl border transition-all duration-300",
        "glass-card", // Use the new glass utility
        gradient && "bg-gradient-to-br from-solana-darkGray/80 to-solana-dark/80 border-solana-purple/30",
        !gradient && "bg-solana-darkGray/60 border-gray-700/30",
        glow && "shadow-glow hover:shadow-glow-teal border-solana-purple/50",
        onClick && "cursor-pointer hover:border-solana-teal/50",
        className
      )}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-gray-700/30">
          {title && <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  );
};

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: React.ReactNode;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = '',
  loading = false,
}) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={cn(
        "glass-panel rounded-2xl p-5 border border-gray-700/30",
        "hover:border-solana-teal/30 transition-colors group",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-400 text-sm font-medium truncate pr-2">{title}</p>
        <div className="p-2 rounded-lg bg-solana-teal/10 text-solana-teal group-hover:bg-solana-teal/20 transition-colors">
          {icon}
        </div>
      </div>
      <div>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
            <div className="h-4 bg-white/5 rounded w-1/2"></div>
          </div>
        ) : (
          <>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</h3>
            {subtitle && <div className="text-xs sm:text-sm text-gray-500 mt-1 font-medium flex flex-wrap items-center gap-1">{subtitle}</div>}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs font-bold",
                trend.isPositive ? "text-solana-teal" : "text-red-400"
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

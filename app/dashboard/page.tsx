'use client';

import React from 'react';
import { UserDashboard } from '@/components/UserDashboard';
import { ReferralCard } from '@/components/ReferralCard';
import { TransactionHistory } from '@/components/TransactionHistory';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 text-center">
        <p className="text-gray-400 text-lg">Manage your staking, view rewards, and track your referrals</p>
      </div>

      <div className="space-y-8">
        {/* User Staking Dashboard */}
        <UserDashboard />

        {/* Referral Card */}
        <ReferralCard />

        {/* Transaction History */}
        <TransactionHistory />
      </div>
    </div>
  );
}

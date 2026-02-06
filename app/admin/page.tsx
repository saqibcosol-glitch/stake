'use client';

import React from 'react';
import { AdminDashboard } from '@/components/AdminDashboard';
import { TransactionHistory } from '@/components/TransactionHistory';

export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage the staking pool and configure platform settings</p>
      </div>

      <div className="space-y-8">
        {/* Admin Dashboard */}
        <AdminDashboard />

        {/* Transaction History */}
        <TransactionHistory />
      </div>
    </div>
  );
}

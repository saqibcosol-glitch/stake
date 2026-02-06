import { Transaction } from '@/types';

const TRANSACTIONS_KEY = 'solana_staking_transactions';
const USER_PREFERENCES_KEY = 'solana_staking_preferences';

export const storageService = {
  // Transaction History
  getTransactions: (userAddress?: string): Transaction[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(TRANSACTIONS_KEY);
      const allTransactions: Transaction[] = stored ? JSON.parse(stored) : [];

      if (userAddress) {
        return allTransactions.filter(tx => tx.user.toLowerCase() === userAddress.toLowerCase());
      }
      return allTransactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  addTransaction: (transaction: Transaction): void => {
    if (typeof window === 'undefined') return;
    try {
      const transactions = storageService.getTransactions();
      transactions.unshift(transaction); // Add to beginning

      // Keep only last 100 transactions
      if (transactions.length > 100) {
        transactions.splice(100);
      }

      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  },

  updateTransaction: (id: string, updates: Partial<Transaction>): void => {
    if (typeof window === 'undefined') return;
    try {
      const transactions = storageService.getTransactions();
      const index = transactions.findIndex(tx => tx.id === id);

      if (index !== -1) {
        transactions[index] = { ...transactions[index], ...updates };
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  },

  clearTransactions: (userAddress?: string): void => {
    if (typeof window === 'undefined') return;
    try {
      if (userAddress) {
        const transactions = storageService.getTransactions();
        const filtered = transactions.filter(
          tx => tx.user.toLowerCase() !== userAddress.toLowerCase()
        );
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(filtered));
      } else {
        localStorage.removeItem(TRANSACTIONS_KEY);
      }
    } catch (error) {
      console.error('Error clearing transactions:', error);
    }
  },

  // User Preferences
  getUserPreferences: () => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(USER_PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {};
    }
  },

  setUserPreference: (key: string, value: any): void => {
    if (typeof window === 'undefined') return;
    try {
      const preferences = storageService.getUserPreferences();
      preferences[key] = value;
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error setting preference:', error);
    }
  },

  // Referral Code Storage
  getReferralCode: (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('referral_code');
    } catch (error) {
      return null;
    }
  },

  setReferralCode: (code: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('referral_code', code);
    } catch (error) {
      console.error('Error setting referral code:', error);
    }
  },

  clearReferralCode: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('referral_code');
    } catch (error) {
      console.error('Error clearing referral code:', error);
    }
  },
};

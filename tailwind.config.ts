import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        solana: {
          purple: '#9945FF',
          teal: '#14F195',
          dark: '#0D0D11',
          darkGray: '#1A1A23',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'solana-gradient': 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0D0D11 0%, #1A1A23 100%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(153, 69, 255, 0.4)',
        'glow-teal': '0 0 20px rgba(20, 241, 149, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
    },
  },
  plugins: [],
}
export default config

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
    extend: {
      colors: {
        'stairs-dark': '#050A14',
        'stairs-blue': '#0052FF',
        'stairs-glow': '#3380FF',
        'stairs-dim': '#0A1628',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'gradient-drift': 'gradient-drift 15s ease infinite',
        'sparkle': 'sparkle 1.5s ease-out forwards',
        'dot-pulse': 'dot-pulse 1.5s ease-in-out infinite',
        'word-lock': 'word-lock 0.3s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 82, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 82, 255, 0.6)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'gradient-drift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'sparkle': {
          '0%': { opacity: '1', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
          '100%': { opacity: '0', transform: 'scale(0.5) rotate(360deg)' },
        },
        'dot-pulse': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(0, 82, 255, 0.4)' },
          '50%': { boxShadow: '0 0 12px rgba(0, 82, 255, 0.8)' },
        },
        'word-lock': {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

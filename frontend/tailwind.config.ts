import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        maki: {
          dark: '#1B3A2D',
          green: '#2D5A45',
          gold: '#D4842A',
          cream: '#F5E6C8',
          light: '#F8F4EF',
          white: '#FFFFFF',
          red: '#DC3545',
          blue: '#3B82F6',
          yellow: '#F59E0B',
          gray: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        'touch-sm': ['0.9375rem', { lineHeight: '1.375rem' }],
        'touch-base': ['1.0625rem', { lineHeight: '1.5rem' }],
        'touch-lg': ['1.1875rem', { lineHeight: '1.75rem' }],
        'touch-xl': ['1.375rem', { lineHeight: '1.875rem' }],
        'touch-2xl': ['1.625rem', { lineHeight: '2rem' }],
        'touch-3xl': ['2rem', { lineHeight: '2.375rem' }],
      },
      minHeight: {
        'touch': '3rem',
        'touch-lg': '3.5rem',
      },
      minWidth: {
        'touch': '3rem',
        'touch-lg': '3.5rem',
      },
      spacing: {
        'touch': '3rem',
        'touch-lg': '3.5rem',
      },
      borderRadius: {
        'touch': '0.875rem',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(27, 58, 45, 0.08)',
        'card-hover': '0 4px 16px rgba(27, 58, 45, 0.12)',
        'card-active': '0 1px 4px rgba(27, 58, 45, 0.1)',
        'elevated': '0 8px 32px rgba(27, 58, 45, 0.15)',
        'modal': '0 16px 48px rgba(27, 58, 45, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

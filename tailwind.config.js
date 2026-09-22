/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral / surface ramp (zinc-tinged dark)
        ink: {
          950: '#0a0a0c',
          900: '#0e0e11',
          850: '#131316',
          800: '#18181c',
          750: '#1d1d22',
          700: '#232329',
          650: '#2a2a31',
          600: '#32323a',
          500: '#3f3f48',
          400: '#56565f',
          300: '#71717a',
          200: '#9a9aa3',
          100: '#c2c2c9',
          50: '#e6e6ea',
        },
        // Primary (sky/cyan — crisp, AI-feeling, not purple)
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Accent (emerald — for success/active tool states)
        accent: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        success: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
        warning: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        error: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.20), 0 1px 3px 0 rgb(0 0 0 / 0.12)',
        panel: '0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 8px 32px -8px rgb(0 0 0 / 0.6)',
        glow: '0 0 0 1px rgb(34 211 238 / 0.18), 0 8px 30px -10px rgb(34 211 238 / 0.25)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.25s ease-out',
        'slide-in-left': 'slide-in-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.15s ease-out',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
        blink: 'blink 1.1s steps(2) infinite',
      },
    },
  },
  plugins: [],
};

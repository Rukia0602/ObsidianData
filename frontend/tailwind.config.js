/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        midnight: {
          DEFAULT: '#0A0C10',
          50: '#E8E9ED',
          100: '#C5C8D0',
          200: '#9DA1B0',
          300: '#757B8E',
          400: '#555B6E',
          500: '#3A3F50',
          600: '#2A2E3E',
          700: '#1E2230',
          800: '#151821',
          900: '#0A0C10',
        },
        nebula: {
          DEFAULT: '#6C8CFF',
          light: '#8FA8FF',
          dark: '#4A6ADB',
          subtle: 'rgba(108, 140, 255, 0.1)',
          10: 'rgba(108, 140, 255, 0.1)',
          20: 'rgba(108, 140, 255, 0.2)',
          30: 'rgba(108, 140, 255, 0.3)',
        },
        emerald: {
          DEFAULT: '#34D399',
          light: '#5EE0B0',
          dark: '#10B981',
          subtle: 'rgba(52, 211, 153, 0.1)',
          10: 'rgba(52, 211, 153, 0.1)',
          20: 'rgba(52, 211, 153, 0.2)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
          subtle: 'rgba(245, 158, 11, 0.1)',
          10: 'rgba(245, 158, 11, 0.1)',
          20: 'rgba(245, 158, 11, 0.2)',
        },
        ruby: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          subtle: 'rgba(239, 68, 68, 0.1)',
          10: 'rgba(239, 68, 68, 0.1)',
        },
        violet: {
          DEFAULT: '#A78BFA',
          light: '#C4B5FD',
          dark: '#8B5CF6',
          subtle: 'rgba(167, 139, 250, 0.1)',
          10: 'rgba(167, 139, 250, 0.1)',
          20: 'rgba(167, 139, 250, 0.2)',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          light: '#67E8F9',
          dark: '#06B6D4',
          subtle: 'rgba(34, 211, 238, 0.1)',
          10: 'rgba(34, 211, 238, 0.1)',
          20: 'rgba(34, 211, 238, 0.2)',
        },
        frost: {
          DEFAULT: '#E8E8ED',
          muted: '#B8BCC8',
          dim: '#9CA3B4',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
        'count-up': 'countUp 0.8s ease-out forwards',
        'aurora': 'aurora 18s ease infinite',
        'aurora-fast': 'aurora 12s ease infinite',
        'gradient-x': 'gradientX 6s ease infinite',
        'spin-slow': 'spin 3s linear infinite',
        'intro-grid': 'introGrid 1.2s ease-out forwards',
        'intro-logo': 'introLogo 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'intro-text': 'introText 0.6s ease-out forwards',
        'intro-bar': 'introBar 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'intro-fade-out': 'introFadeOut 0.6s ease-in forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(108, 140, 255, 0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(108, 140, 255, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aurora: {
          '0%, 100%': {
            transform: 'translate(0, 0) rotate(0deg) scale(1)',
            opacity: '0.5',
          },
          '33%': {
            transform: 'translate(8%, -6%) rotate(120deg) scale(1.15)',
            opacity: '0.8',
          },
          '66%': {
            transform: 'translate(-6%, 8%) rotate(240deg) scale(0.9)',
            opacity: '0.6',
          },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        introGrid: {
          '0%': { opacity: '0', transform: 'perspective(600px) rotateX(20deg) scale(1.1)' },
          '100%': { opacity: '1', transform: 'perspective(600px) rotateX(0) scale(1)' },
        },
        introLogo: {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-180deg)' },
          '60%': { opacity: '1', transform: 'scale(1.1) rotate(10deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
        introText: {
          '0%': { opacity: '0', transform: 'translateY(12px)', letterSpacing: '0.3em' },
          '100%': { opacity: '1', transform: 'translateY(0)', letterSpacing: '0' },
        },
        introBar: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        introFadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0', visibility: 'hidden' },
        },
      },
    },
  },
  plugins: [],
};

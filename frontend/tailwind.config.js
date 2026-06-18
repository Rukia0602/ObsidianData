/** @type {import('tailwindcss').Config} */

// All color tokens reference CSS variables defined in src/index.css :root.
// DESIGN.md is the source of truth — these variables mirror it 1:1.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        body: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Surfaces — luminance-stacking depth system
        canvas: 'var(--canvas)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          inset: 'var(--surface-inset)',
        },

        // Text — slate hierarchy, four tiers
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        quaternary: 'var(--text-quaternary)',

        // Borders — fine slate lines for spatial layering
        subtle: 'var(--border-subtle)',
        line: 'var(--border-default)',
        strong: 'var(--border-strong)',

        // Single accent — electric purple (Obsidian brand)
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          pressed: 'var(--accent-pressed)',
          subtle: 'var(--accent-subtle)',
        },

        // Semantic status — never decorative
        success: {
          DEFAULT: 'var(--status-success)',
          subtle: 'var(--status-success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--status-warning)',
          subtle: 'var(--status-warning-subtle)',
        },
        error: {
          DEFAULT: 'var(--status-error)',
          subtle: 'var(--status-error-subtle)',
        },
        info: {
          DEFAULT: 'var(--status-info)',
          subtle: 'var(--status-info-subtle)',
        },
      },
      borderRadius: {
        // Vary radius — tighter on inner, softer on containers
        control: '6px',
        inner: '8px',
        card: '10px',
        panel: '12px',
      },
      animation: {
        // Entry only — no animated gradients, no ambient motion
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fadeInDown 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite linear',
        // Intro loader — simplified, no flashy transforms
        'intro-bar': 'introBar 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'intro-fade-out': 'introFadeOut 0.5s ease-in 1.2s forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
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

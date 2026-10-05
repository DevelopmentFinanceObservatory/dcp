import type { Config } from 'tailwindcss';

/**
 * Tailwind v3 config. The DC Search 6-grey palette and the design tokens live
 * here (v3 uses a JS/TS config rather than v4's CSS `@theme`), so utilities like
 * bg-g6 / text-g4 / border-g2 / shadow-lift / animate-enter work as before.
 */

// Single source of truth for the palette — reference these anywhere in the config.
const palette = {
  g1: '#f5f5f5',
  g2: '#e5e5e5',
  g3: '#c7c7c7',
  g4: '#8f8f8f',
  g5: '#5a5a5a',
  g6: '#1f1f1f',
};

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: palette,
      boxShadow: {
        lift: '0 2px 4px rgba(31, 31, 31, 0.1), 0 12px 28px rgba(31, 31, 31, 0.16)',
        dark: `4px 4px 0px ${palette.g6}`,
        light: `4px 4px 0px ${palette.g3}`,
      },
      keyframes: {
        'ss-fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'ss-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'ss-flash': {
          from: { backgroundColor: '#e5e5e5' }, // g2
          to: { backgroundColor: 'transparent' },
        },
      },
      animation: {
        enter: 'ss-fade-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
        reveal: 'ss-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
        'pulse-soft': 'ss-pulse 1s ease-in-out infinite',
        flash: 'ss-flash 0.8s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;

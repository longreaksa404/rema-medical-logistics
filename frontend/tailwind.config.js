const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Noto Sans Khmer', 'ui-monospace', 'monospace'],
        // Inter for body/UI text (legible at small sizes, tabular figures);
        // Syne kept as the display face for page and card titles.
        sans: ['Inter', 'Noto Sans Khmer', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Syne', 'Noto Sans Khmer', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // REMA design system. Values live in index.css as RGB channels so the
        // light/dark themes can swap them and opacity modifiers (/10) still work.
        bg: {
          primary: v('bg-primary'),
          secondary: v('bg-secondary'),
          elevated: v('bg-elevated'),
          border: v('bg-border'),
          hover: v('bg-hover'),
          'border-strong': v('bg-border-strong'),
        },
        accent: {
          red: v('accent-red'),
          orange: v('accent-orange'),
          yellow: v('accent-yellow'),
          green: v('accent-green'),
          blue: v('accent-blue'),
          cyan: v('accent-cyan'),
          'blue-hover': v('accent-blue-hover'),
          'red-hover': v('accent-red-hover'),
        },
        text: {
          primary: v('text-primary'),
          secondary: v('text-secondary'),
          muted: v('text-muted'),
        },
        phase: {
          0: v('phase-0'),   // standby — muted
          1: v('accent-orange'),   // phase 1 — orange alert
          2: v('accent-red'),   // phase 2 — red active
        },
        band: {
          critical: v('accent-red'),
          high: v('accent-orange'),
          medium: v('accent-yellow'),
          standard: v('accent-green'),
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
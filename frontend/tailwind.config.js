/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
        // Inter for body/UI text (legible at small sizes, tabular figures);
        // Syne kept as the display face for page and card titles.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Syne', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // REMA design system — dark ops theme
        bg: {
          primary: '#0a0c0f',
          secondary: '#111418',
          elevated: '#161b22',
          border: '#262c36',
          hover: '#1c2129',
        },
        accent: {
          red: '#f85149',
          orange: '#f0883e',
          yellow: '#d29922',
          green: '#3fb950',
          blue: '#58a6ff',
          cyan: '#39d353',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#9da7b3',
          // was #484f58 (~2.3:1 on bg-primary, failed WCAG); now ~4.2:1
          muted: '#6e7681',
        },
        phase: {
          0: '#484f58',   // standby — muted
          1: '#f0883e',   // phase 1 — orange alert
          2: '#f85149',   // phase 2 — red active
        },
        band: {
          critical: '#f85149',
          high: '#f0883e',
          medium: '#d29922',
          standard: '#3fb950',
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
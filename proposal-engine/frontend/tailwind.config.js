/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        // Landscape orientation variant — used for compact mobile navbar/menu in landscape
        landscape: { raw: '(orientation: landscape)' },
      },
      colors: {
        primary: {
          50:  '#e8eaf0',
          100: '#c5cad8',
          200: '#9ea5bc',
          300: '#6b7594',
          400: '#3d4868',
          500: '#1e2848',
          600: '#0d1b3a',
          700: '#0a1530',
          800: '#080f22',
          900: '#050914',
        },
        secondary: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Mirror CRM: override indigo → brand navy so indigo-* classes work too
        indigo: {
          50:  '#e8eaf0',
          100: '#c5cad8',
          200: '#9ea5bc',
          300: '#6b7594',
          400: '#3d4868',
          500: '#1e2848',
          600: '#0d1b3a',
          700: '#0a1530',
          800: '#080f22',
          900: '#050914',
        },
        accent: {
          indigo:  '#0d1b3a',
          purple:  '#8b5cf6',
          pink:    '#ec4899',
          orange:  '#f97316',
          yellow:  '#f59e0b',
          cyan:    '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

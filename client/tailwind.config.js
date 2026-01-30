/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Rayenna Energy brand colors - #0d1b3a (R:13, G:27, B:58) and yellow theme
        primary: {
          50: '#e8eaf0',
          100: '#c5cad8',
          200: '#9ea5bc',
          300: '#6b7594',
          400: '#3d4868',
          500: '#1e2848',
          600: '#0d1b3a', // Brand color
          700: '#0a1530',
          800: '#080f22',
          900: '#050914',
        },
        secondary: {
          50: '#f8fafc',
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
        // Override Tailwind indigo so indigo-* classes use brand color #0d1b3a
        indigo: {
          50: '#e8eaf0',
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
          indigo: '#0d1b3a',
          purple: '#8b5cf6',
          pink: '#ec4899',
          orange: '#f97316',
          yellow: '#f59e0b',
          cyan: '#06b6d4',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

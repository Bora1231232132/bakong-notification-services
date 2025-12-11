/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        bakong: {
          blue: '#0F4AEA',
          dark: '#001346',
          light: '#FAFBFF',
          orange: '#FFF5E6',
          red: '#F24444',
        },
        custom: {
          purple: '#8B5CF6',
          green: '#10B981',
          orange: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        khmer: ['Battambang', 'IBM Plex Sans', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '32px',
      },
      backdropBlur: {
        64: '64px',
      },
    },
  },
  plugins: [],
}

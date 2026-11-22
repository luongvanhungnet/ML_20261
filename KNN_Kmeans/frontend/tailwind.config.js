/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#111827',
        border: '#1f2937',
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: '#06b6d4',
        cyber: {
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          purple: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}

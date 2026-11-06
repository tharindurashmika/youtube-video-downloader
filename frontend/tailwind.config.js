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
        tv: {
          dark: '#0b0f19',
          card: '#111827',
          border: '#1f2937',
          accent: '#38bdf8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          tvblue: '#2563eb'
        }
      }
    },
  },
  plugins: [],
}


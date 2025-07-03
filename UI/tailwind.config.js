/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'clx-primary': '#8A2BE2',
        'clx-secondary': '#9D4EDD',
        'clx-accent': '#C77DFF',
        'clx-dark': '#0D1117',
        'clx-darker': '#010409',
        'clx-border': '#30363D',
        'clx-text-primary': '#F0F6FC',
        'clx-text-secondary': '#8B949E',
        'clx-success': '#238636',
        'clx-warning': '#D29922',
        'clx-error': '#DA3633',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
} 
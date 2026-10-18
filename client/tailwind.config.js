/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        palm: {
          50: '#f2f9f3',
          100: '#e1f2e4',
          200: '#c3e5c9',
          300: '#94d1a0',
          400: '#5fb571',
          500: '#39994c',
          600: '#2b7c3c',
          700: '#246231',
          800: '#204e2a',
          900: '#1b4124',
          950: '#0a2311',
        },
        jaggery: {
          50: '#fdf8ee',
          100: '#f9eed7',
          200: '#f3daa9',
          300: '#ecc075',
          400: '#e4a142',
          500: '#db8421',
          600: '#bd6517',
          700: '#954916',
          800: '#793b18',
          900: '#643217',
          950: '#391708',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

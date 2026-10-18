/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep forest greens inspired by palmyrah groves
        forest: {
          50: '#F0F7F2',
          100: '#DCEEE1',
          200: '#BADEC3',
          300: '#8DC69B',
          400: '#5DA76F',
          500: '#3D8B51',
          600: '#2F6F3F',
          700: '#265733',
          800: '#1F452A',
          900: '#183822',
          950: '#0C1F13',
        },
        // Warm artisanal cream tones
        cream: {
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F3E9D2',
          300: '#EBDCB8',
          400: '#DEC593',
          500: '#D0AF6E',
          600: '#BC9651',
          700: '#9C783C',
          800: '#7E6032',
          900: '#674E2A',
          950: '#3A2A14',
        },
        // Rich warm brown & molasses tones
        earth: {
          50: '#F9F5F1',
          100: '#F1E9E0',
          200: '#E2D1BF',
          300: '#CEB299',
          400: '#B68E71',
          500: '#A07150',
          600: '#84573B',
          700: '#69432D',
          800: '#533525',
          900: '#432B1F',
          950: '#25160E',
        },
        // Muted gold accents
        gold: {
          50: '#FCF9EE',
          100: '#F7F0D4',
          200: '#EFE0A8',
          300: '#E5CC74',
          400: '#DCB848',
          500: '#CCA02C',
          600: '#AA7F20',
          700: '#855E1A',
          800: '#6E4C1A',
          900: '#5C3F1A',
          950: '#35210A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'warm': '0 4px 20px -2px rgba(67, 43, 31, 0.08), 0 2px 6px -1px rgba(67, 43, 31, 0.04)',
        'warm-lg': '0 10px 30px -4px rgba(67, 43, 31, 0.12), 0 4px 10px -2px rgba(67, 43, 31, 0.06)',
        'forest-sm': '0 2px 10px -1px rgba(24, 56, 34, 0.15)',
        'forest-lg': '0 12px 35px -5px rgba(24, 56, 34, 0.25)',
      },
    },
  },
  plugins: [],
}

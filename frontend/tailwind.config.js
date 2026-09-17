/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        alabaster: '#F9F8F6',
        charcoal: '#2C2C2C',
        gold: '#D4AF37',
        navy: '#1F3A5F',
        brand: {
          50: '#fdf9e9',
          100: '#faf0c3',
          200: '#f5e08a',
          300: '#ecc94b',
          400: '#D4AF37',
          500: '#b8941e',
          600: '#9a7816',
          700: '#7c5d12',
          800: '#664c14',
          900: '#573f17',
          950: '#32210a',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tiffany: '#81D8D0',
        'tiffany-light': '#B9E8E3',
        'tiffany-soft': '#DDF4F1',
        gold: '#C99A4A',
        pink: '#E2336B',
        cream: '#F8F4EE',
        petroleum: '#145A63',
      },
      fontFamily: {
        // Destaques em Playfair Display ExtraBold (800), corpo e UI em Manrope.
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 24px -8px rgba(20, 90, 99, 0.25)',
        glow: '0 0 0 1px rgba(201, 154, 74, 0.45), 0 10px 30px -12px rgba(201, 154, 74, 0.5)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shuffle: {
          '0%,100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-8px) rotate(1.5deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in .35s ease-out both',
        'pop-in': 'pop-in .4s cubic-bezier(.2,.9,.3,1.4) both',
        shuffle: 'shuffle .28s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

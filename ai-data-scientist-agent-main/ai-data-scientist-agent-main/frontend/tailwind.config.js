/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07131a',
          900: '#0d1b24',
          800: '#102633',
        },
        sun: {
          300: '#f7d794',
          400: '#f2c165',
        },
        sea: {
          300: '#77d5d4',
          400: '#4cb8b7',
          500: '#249a9a',
        },
        coral: '#f27d72',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 20px 60px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        haze: 'radial-gradient(circle at top left, rgba(119, 213, 212, 0.24), transparent 35%), radial-gradient(circle at top right, rgba(242, 193, 101, 0.18), transparent 30%), linear-gradient(135deg, #07131a 0%, #0d1b24 45%, #102633 100%)',
      },
      keyframes: {
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        floatUp: 'floatUp 650ms ease forwards',
      },
    },
  },
  plugins: [],
};

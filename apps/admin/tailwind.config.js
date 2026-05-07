/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0B0F',
        surface: '#15151B',
        surfaceMuted: '#1F1F26',
        border: '#2A2A33',
        gold: {
          DEFAULT: '#D4AF37',
          soft: '#E8C766',
          deep: '#A8851D',
        },
        text: {
          DEFAULT: '#F5F5F7',
          muted: '#A0A0A8',
          dim: '#6B6B75',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};

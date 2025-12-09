/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Tamaños de fuente más compactos para consistencia entre local y producción
    fontSize: {
      'xs': ['0.6rem', { lineHeight: '0.8rem' }],
      'sm': ['0.7rem', { lineHeight: '1rem' }],
      'base': ['0.8rem', { lineHeight: '1.2rem' }],
      'lg': ['0.9rem', { lineHeight: '1.35rem' }],
      'xl': ['1rem', { lineHeight: '1.5rem' }],
      '2xl': ['1.2rem', { lineHeight: '1.8rem' }],
      '3xl': ['1.5rem', { lineHeight: '2rem' }],
      '4xl': ['1.8rem', { lineHeight: '2.25rem' }],
      '5xl': ['2.4rem', { lineHeight: '2.5rem' }],
      '6xl': ['3rem', { lineHeight: '3rem' }],
    },
    // Espaciados más compactos
    spacing: {
      px: '1px',
      0: '0px',
      0.5: '0.1rem',
      1: '0.2rem',
      1.5: '0.3rem',
      2: '0.4rem',
      2.5: '0.5rem',
      3: '0.6rem',
      3.5: '0.7rem',
      4: '0.8rem',
      5: '1rem',
      6: '1.2rem',
      7: '1.4rem',
      8: '1.6rem',
      9: '1.8rem',
      10: '2rem',
      11: '2.2rem',
      12: '2.4rem',
      14: '2.8rem',
      16: '3.2rem',
      20: '4rem',
      24: '4.8rem',
      28: '5.6rem',
      32: '6.4rem',
      36: '7.2rem',
      40: '8rem',
      44: '8.8rem',
      48: '9.6rem',
      52: '10.4rem',
      56: '11.2rem',
      60: '12rem',
      64: '12.8rem',
      72: '14.4rem',
      80: '16rem',
      96: '19.2rem',
    },
    extend: {
      colors: {
        // GOOD Talent Official Color Palette
        'good-dark-teal': '#004C4C',
        'good-medium-teal': '#065C5C', 
        'good-light-teal': '#0A6A6A',
        'good-soft-white': '#E6F5F7',
        'good-light-cyan': '#87E0E0',
        'good-turquoise': '#5FD3D2',
        'good-cyan': '#58BFC2',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'float-delayed': 'float 3s ease-in-out infinite 1.5s',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
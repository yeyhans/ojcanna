/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        source: {
          cead:   '#2563eb',
          dpp:    '#7c3aed',
          pdi:    '#9333ea',
          embudo: '#059669',
        },
      },
    },
  },
  plugins: [],
}

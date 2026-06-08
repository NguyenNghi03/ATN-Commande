/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          navy: '#0C447C',
          gold: '#FAC775',
          sky: '#85B7EB',
          'gold-text': '#412402',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'btn-primary': '0 2px 8px rgba(37, 99, 235, 0.35)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};

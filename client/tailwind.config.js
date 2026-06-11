/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eaf6fd', 100: '#d2ecfb', 200: '#a9d9f6', 300: '#74c2f0',
          400: '#3aa6e6', 500: '#1487d6', 600: '#0a6bb8', 700: '#0c5694',
          800: '#114a78', 900: '#143f64',
        },
        teal: {
          400: '#22d3c5', 500: '#10b8ad', 600: '#0d958d',
        },
        ink: '#0c1b2a',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,40,70,0.04), 0 8px 24px rgba(16,40,70,0.06)',
        lift: '0 10px 40px rgba(16,40,70,0.12)',
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
    },
  },
  plugins: [],
};

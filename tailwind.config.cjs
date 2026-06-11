/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium palette
        primary: '#0ea5e9', // sky-500
        accent: '#a78bfa', // purple-400
        surface: 'hsl(210, 10%, 98%)',
        "surface-dark": 'hsl(210, 10%, 12%)',
      },
      boxShadow: {
        glass: '0 4px 30px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};

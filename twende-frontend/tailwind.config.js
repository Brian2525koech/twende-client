/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // This MUST be here for the toggle to work
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1D9E75',
          dark: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
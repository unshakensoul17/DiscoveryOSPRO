/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          350: '#b0b9c6',
          450: '#7e8b9e',
        }
      }
    },
  },
  plugins: [],
}

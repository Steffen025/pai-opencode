/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          bg: '#0d1117',
          card: '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          muted: '#8b949e',
          blue: '#58a6ff',
          green: '#3fb950',
          orange: '#d29922',
          red: '#f85149',
        }
      }
    },
  },
  plugins: [],
}

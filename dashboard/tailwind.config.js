/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#09090b",
        cardBg: "#18181b",
        accentPink: "#ec4899",
        accentRose: "#f43f5e",
        accentBlue: "#38bdf8",
      }
    },
  },
  plugins: [],
}

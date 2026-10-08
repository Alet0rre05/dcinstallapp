/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#b91c1c", dark: "#7f1d1d" },
        bordo: "#7a1f2b",
      },
    },
  },
  plugins: [],
};

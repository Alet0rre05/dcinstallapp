/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Celeste DC INSTALL. Contrastes (WCAG AA, texto normal ≥ 4.5:1):
        //   ink sobre brand 8.9:1 · blanco sobre brand-dark 6.1:1 · blanco sobre brand-darker 8.7:1
        //   brand-dark sobre blanco 6.1:1 · brand-dark sobre brand-light 5.6:1
        // El texto blanco NO se usa sobre brand (#64DCF4): no se lee.
        brand: {
          DEFAULT: "#64DCF4", // base: navbar, panel, acentos
          dark: "#0B6B87",    // botones llenos, links, foco
          darker: "#08526A",  // hover / active de botones
          light: "#E8FAFE",   // fondos suaves, hover
        },
        ink: "#0B2E3F",       // azul marino para texto sobre celeste y títulos
        page: "#F3FCFE",      // fondo general de la app
        bordo: "#7a1f2b",
      },
    },
  },
  plugins: [],
};

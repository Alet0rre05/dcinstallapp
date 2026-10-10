/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // se activa con la clase "dark" en <html> (ver src/lib/tema.jsx)
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
        // Acento de las funciones nuevas (dashboard, remito, notificaciones, tutoría): azul índigo,
        // análogo al celeste de la marca pero distinto de todos los colores ya usados en botones.
        //   blanco sobre acento 7.5:1 · blanco sobre acento-dark 10:1 · acento sobre blanco 7.5:1
        //   acento sobre acento-light 6.5:1 · acento-soft sobre slate-800 7.3:1 (modo oscuro)
        acento: {
          DEFAULT: "#3B4BB0",
          dark: "#2C3A8C",   // hover
          darker: "#222D6E", // active
          light: "#ECEEFB",  // fondos suaves
          soft: "#A5B4FC",   // texto / íconos sobre fondos oscuros
          deep: "#1E2A5A",   // fondo tenue en modo oscuro
          btn: "#4F5FD0",    // botón lleno en modo oscuro (blanco sobre btn 5.4:1)
        },
        ink: "#0B2E3F",       // azul marino para texto sobre celeste y títulos
        page: "#F3FCFE",      // fondo general de la app
        bordo: "#7a1f2b",
      },
    },
  },
  plugins: [],
};

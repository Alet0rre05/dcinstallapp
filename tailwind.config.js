/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // se activa con la clase "dark" en <html> (ver src/lib/tema.jsx)
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Celeste DC INSTALL, suavizado para que la navbar y los botones armonicen con el fondo (page).
        // Misma familia de color que el fondo, pero con un escalon mas de saturacion para que no se confundan.
        // Contrastes (WCAG AA, texto normal >= 4.5:1):
        //   ink sobre brand ~11:1 · blanco sobre brand-dark 4.7:1 · blanco sobre brand-darker 6.8:1
        // El texto blanco NO se usa sobre brand (#A8E6F5): no se lee.
        brand: {
          DEFAULT: "#A8E6F5", // base: navbar, panel, acentos (antes #64DCF4)
          dark: "#2E7D96",    // botones llenos, links, foco (antes #0B6B87)
          darker: "#226277",  // hover / active de botones (antes #08526A)
          light: "#E3F6FB",   // fondos suaves, hover (antes #E8FAFE)
        },
        // Acento de las funciones nuevas (dashboard, remito, notificaciones, tutoria): azul indigo,
        // analogo al celeste de la marca pero distinto de todos los colores ya usados en botones.
        //   blanco sobre acento 7.5:1 · blanco sobre acento-dark 10:1 · acento sobre blanco 7.5:1
        //   acento sobre acento-light 6.5:1 · acento-soft sobre slate-800 7.3:1 (modo oscuro)
        acento: {
          DEFAULT: "#3B4BB0",
          dark: "#2C3A8C",   // hover
          darker: "#222D6E", // active
          light: "#ECEEFB",  // fondos suaves
          soft: "#A5B4FC",   // texto / iconos sobre fondos oscuros
          deep: "#1E2A5A",   // fondo tenue en modo oscuro
          btn: "#4F5FD0",    // boton lleno en modo oscuro (blanco sobre btn 5.4:1)
        },
        ink: "#0B2E3F",       // azul marino para texto sobre celeste y titulos
        page: "#F3FCFE",      // fondo general de la app
        bordo: "#7a1f2b",
      },
    },
  },
  plugins: [],
};

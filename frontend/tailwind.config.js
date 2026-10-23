/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // se activa con la clase "dark" en <html> (ver src/lib/tema.jsx)
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ------------------------------------------------------------------------------------
        // PALETA ORIGINAL (no se toca: las pantallas actuales siguen usando estos tokens)
        // Celeste DC INSTALL. Contrastes (WCAG AA, texto normal ≥ 4.5:1):
        //   ink sobre brand 8.9:1 · blanco sobre brand-dark 6.1:1 · blanco sobre brand-darker 8.7:1
        //   brand-dark sobre blanco 6.1:1 · brand-dark sobre brand-light 5.6:1
        // El texto blanco NO se usa sobre brand (#5EDAF5): no se lee.
        brand: {
          DEFAULT: "#5EDAF5", // base: navbar, panel, acentos
          dark: "#0B6B87",    // botones llenos, links, foco
          darker: "#08526A",  // hover / active de botones
          light: "#E8FAFE",   // fondos suaves, hover
        },
        // Acento de las funciones v2.5 (dashboard, remito, notificaciones, tutoría): azul índigo.
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
        page: "#F1FBFD",      // fondo general modo claro (v3.3: antes #F3FCFE)
        bordo: "#7a1f2b",

        // ------------------------------------------------------------------------------------
        // v3.3 · SISTEMA VISUAL "órbita" (re-skin). Tokens NUEVOS: se suman a los de arriba.
        // Modo oscuro: fondo `noche`, tarjetas `noche-card`, acentos `cian` + `electrico`.
        // Contrastes calculados (WCAG 2.1; texto normal ≥ 4.5:1, texto grande/iconos ≥ 3:1):
        //   ink sobre page 13.5:1 · ink sobre blanco 14.2:1 · cian-oscuro sobre page 5.8:1
        //   noche-texto sobre noche 16.2:1 · sobre noche-card 14.4:1 · noche-tenue sobre noche-card 7.7:1
        //   cian sobre noche 10.5:1 · cian sobre noche-card 9.4:1 · noche sobre cian (botón) 10.5:1
        //   electrico-soft sobre noche-card 6.1:1 · blanco sobre electrico 5.0:1 · blanco sobre electrico-dark 7.9:1
        //   estado-taller (ámbar) sobre noche-card 9.3:1
        noche: {
          DEFAULT: "#061426", // fondo base modo oscuro (nunca negro puro)
          card: "#0B2036",    // tarjetas, tablas, formularios
          elevado: "#102B47", // menús, tooltips, paneles flotantes
          borde: "#17405F",   // bordes sutiles
          texto: "#E6F1FF",   // texto principal (blanco azulado)
          tenue: "#9DB4CC",   // texto secundario
        },
        cian: {
          DEFAULT: "#20D6F2", // acento luminoso (modo oscuro) / partículas
          claro: "#8EEBFA",   // halos y destellos
          borde: "#BDEEF7",   // bordes sutiles de tarjetas en modo claro
          oscuro: "#0B6B87",  // texto / botones sobre fondos claros (= brand-dark)
        },
        electrico: {
          DEFAULT: "#5B5CF0", // índigo eléctrico: botón lleno, acento secundario
          dark: "#4338CA",    // hover / active
          soft: "#8B93FF",    // texto e íconos sobre fondos oscuros
          deep: "#1B2150",    // fondo tenue sobre modo oscuro
        },
        // Estados de equipo: conservan su semántica (Apto = verde, Vencido = rojo, En taller = ámbar).
        // `*-soft` = fondo tenue + texto oscuro (modo claro); `*-glow` = versión luminosa (modo oscuro).
        estado: {
          apto: "#16A34A",
          "apto-soft": "#DCFCE7",
          "apto-glow": "#4ADE80",
          vencido: "#DC2626",
          "vencido-soft": "#FEE2E2",
          "vencido-glow": "#F87171",
          taller: "#D97706",
          "taller-soft": "#FEF3C7",
          "taller-glow": "#F5B83D",
        },
      },

      // Duraciones del sistema de motion (micro 120-220 ms · paneles y rutas 180-300 ms).
      // `motion` (JS) usa las mismas cifras desde src/lib/motionConfig.js (Fase 2).
      transitionDuration: {
        micro: "160ms",
        panel: "240ms",
        ruta: "280ms",
      },
      transitionTimingFunction: {
        suave: "cubic-bezier(0.22, 1, 0.36, 1)", // desacelera al final, sin rebote
      },

      boxShadow: {
        tarjeta: "0 1px 2px rgba(11, 46, 63, 0.06), 0 10px 28px -14px rgba(11, 46, 63, 0.22)",
        "tarjeta-noche": "0 1px 0 rgba(142, 235, 250, 0.04) inset, 0 14px 32px -16px rgba(2, 8, 18, 0.7)",
        "glow-cian": "0 0 0 1px rgba(32, 214, 242, 0.35), 0 0 24px rgba(32, 214, 242, 0.22)",
        "glow-electrico": "0 0 0 1px rgba(139, 147, 255, 0.4), 0 0 24px rgba(91, 92, 240, 0.28)",
      },

      // Fondo estático de respaldo: se ve cuando el canvas de partículas está apagado
      // (prefers-reduced-motion, pestaña inactiva o antes de que cargue el JS).
      backgroundImage: {
        "aurora-claro":
          "radial-gradient(60rem 38rem at 78% -8%, rgba(94, 218, 245, 0.30), transparent 60%), radial-gradient(44rem 30rem at 4% 108%, rgba(91, 92, 240, 0.10), transparent 60%)",
        "aurora-noche":
          "radial-gradient(60rem 38rem at 78% -8%, rgba(32, 214, 242, 0.20), transparent 60%), radial-gradient(44rem 30rem at 4% 108%, rgba(91, 92, 240, 0.22), transparent 60%)",
      },

      // Animaciones CSS livianas (feedback de estado). Todas se desactivan con `motion-reduce:animate-none`.
      keyframes: {
        "pulso-suave": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        destello: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        aparecer: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulso-suave": "pulso-suave 2s ease-in-out infinite",
        destello: "destello 1.6s ease-in-out infinite",
        aparecer: "aparecer 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

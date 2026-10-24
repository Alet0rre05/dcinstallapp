/**
 * Variables globales de animación (v3.3). Todo el motion de la app sale de acá para que las
 * duraciones y curvas sean consistentes. Las cifras coinciden con las de tailwind.config.js
 * (transitionDuration: micro / panel / ruta).
 *
 * Reglas:
 *  - micro (120-220 ms): hover, foco, toque, badges.
 *  - panel (180-300 ms): revelado de paneles, listas, tarjetas.
 *  - ruta  (180-300 ms): entrada de pantalla. Solo ENTRADA: nunca se espera una animación de
 *    salida para cambiar de pantalla.
 *  - Con `prefers-reduced-motion`, <MotionConfig reducedMotion="user"> (ver Layout.jsx) quita los
 *    movimientos de las animaciones de `motion`; quedan solo los cambios de opacidad.
 */
export const DUR = { micro: 0.16, panel: 0.24, ruta: 0.28 };
export const EASE = [0.22, 1, 0.36, 1]; // desacelera al final, sin rebote

/** Tope de elementos que escalonan: en listas largas el resto aparece junto con el último. */
export const MAX_ESCALON = 8;
export const PASO_ESCALON = 0.04;

export const transMicro = { duration: DUR.micro, ease: EASE };
export const transPanel = { duration: DUR.panel, ease: EASE };

/** Entrada de pantalla (sin salida). */
export const paginaVariants = {
  oculto: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.ruta, ease: EASE } },
};

/** Elementos de una lista: `custom` es el índice (se usa para escalonar con tope). */
export const itemVariants = {
  oculto: { opacity: 0, y: 10 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.panel, ease: EASE, delay: Math.min(i, MAX_ESCALON) * PASO_ESCALON },
  }),
};

/** Paneles que se abren y cierran (desplegables, editores). La salida es corta a propósito. */
export const panelVariants = {
  oculto: { opacity: 0, y: -6, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.panel, ease: EASE } },
  salida: { opacity: 0, y: -4, transition: { duration: 0.12, ease: EASE } },
};

/** Feedback táctil de botones y tarjetas pulsables: no mueve el layout (solo transform). */
export const toque = { scale: 0.98, transition: { duration: 0.12 } };
export const elevar = { y: -2, transition: transMicro };

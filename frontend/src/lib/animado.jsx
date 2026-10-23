import { motion } from "motion/react";
import { itemVariants, paginaVariants, panelVariants, toque } from "./motionConfig.js";

/**
 * Piezas de animación reutilizables (envuelven a `motion`). Ninguna bloquea la interacción:
 * solo animan la entrada y no demoran cambios de pantalla ni avisos de error.
 */

/** Entrada de una pantalla completa. Se usa una vez, en App.jsx, con `key={pathname}`. */
export function Pagina({ children }) {
  return (
    <motion.div variants={paginaVariants} initial="oculto" animate="visible">
      {children}
    </motion.div>
  );
}

/** Elemento de lista/grilla que aparece escalonado. `i` = posición (el retraso tiene tope). */
export function Item({ i = 0, as = "div", children, className = "", ...resto }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} variants={itemVariants} custom={i} initial="oculto" animate="visible" {...resto}>
      {children}
    </Tag>
  );
}

/** Panel que se revela (para desplegables). Para animar la salida, envolverlo en <AnimatePresence>. */
export function Panel({ as = "div", children, className = "", ...resto }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} variants={panelVariants} initial="oculto" animate="visible" exit="salida" {...resto}>
      {children}
    </Tag>
  );
}

/** Botón/tarjeta con feedback de toque (sin desplazar el DOM). */
export const Tocable = motion.button;
export { toque };

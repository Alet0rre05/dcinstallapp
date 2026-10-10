/** Vibración corta como confirmación en acciones críticas (si el dispositivo la soporta). */
export function vibrar(patron = 40) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(patron);
  } catch {
    /* sin vibración: no pasa nada */
  }
}

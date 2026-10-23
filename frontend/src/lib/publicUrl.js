// Dominio público que va codificado en los QR impresos.
// Se define al compilar con VITE_PUBLIC_BASE_URL (ej. https://app.midominio.com). Sin barra final.
const CONFIGURADA = (import.meta.env.VITE_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");

/** false => se está usando window.location.origin: los QR impresos NO son definitivos. */
export const baseUrlConfigurada = CONFIGURADA !== "";
export const baseUrlPublica = CONFIGURADA || window.location.origin;

/** URL que abre el QR de un equipo (la misma en pantalla y en las etiquetas). */
export const urlQR = (token) => `${baseUrlPublica}/qr/${token}`;

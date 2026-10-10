// Geometría de las hojas de etiquetas. TODO lo que cambia entre formatos vive en un objeto
// de configuración (ver PRESETS); nada de medidas sueltas en los componentes.
//
// Config: columnas, filas, anchoMm, altoMm (etiqueta) · margenSuperiorMm, margenIzquierdoMm (hoja)
//         · separacionXMm, separacionYMm (entre etiquetas)
// Ajuste (aparte, no es del formato): desplazamientoXMm, desplazamientoYMm, bordes

export const HOJA_A4 = { anchoMm: 210, altoMm: 297 };
export const QR_MIN_MM = 30;

export const PRESETS = {
  "3x7": {
    nombre: "3 × 7 · 63,5 × 38,1 mm (21 por hoja)",
    columnas: 3, filas: 7, anchoMm: 63.5, altoMm: 38.1,
    margenSuperiorMm: 15.15, margenIzquierdoMm: 7.2, separacionXMm: 2.5, separacionYMm: 0,
  },
  "2x4": {
    nombre: "2 × 4 · 99,1 × 67,7 mm (8 por hoja)",
    columnas: 2, filas: 4, anchoMm: 99.1, altoMm: 67.7,
    margenSuperiorMm: 13.1, margenIzquierdoMm: 4.65, separacionXMm: 2.5, separacionYMm: 0,
  },
  personalizado: {
    nombre: "Personalizado",
    columnas: 3, filas: 7, anchoMm: 63.5, altoMm: 38.1,
    margenSuperiorMm: 15.15, margenIzquierdoMm: 7.2, separacionXMm: 2.5, separacionYMm: 0,
  },
};
export const PRESET_POR_DEFECTO = "3x7";
export const AJUSTE_INICIAL = { desplazamientoXMm: 0, desplazamientoYMm: 0, bordes: false };

export const CAMPOS_GEOMETRIA = [
  ["columnas", "Columnas", 1], ["filas", "Filas", 1],
  ["anchoMm", "Ancho etiqueta (mm)", 0.1], ["altoMm", "Alto etiqueta (mm)", 0.1],
  ["margenSuperiorMm", "Margen superior (mm)", 0.1], ["margenIzquierdoMm", "Margen izquierdo (mm)", 0.1],
  ["separacionXMm", "Separación horizontal (mm)", 0.1], ["separacionYMm", "Separación vertical (mm)", 0.1],
];

export const porHoja = (g) => g.columnas * g.filas;
const redondear = (n) => Math.round(n * 1000) / 1000;

/** Posiciones (mm, desde la esquina superior izquierda de la hoja) de las `cantidad` etiquetas, agrupadas por hoja. */
export function distribuir(g, ajuste, cantidad) {
  const pp = porHoja(g);
  const paginas = [];
  for (let i = 0; i < cantidad; i++) {
    const pagina = Math.floor(i / pp);
    const k = i % pp;
    const fila = Math.floor(k / g.columnas);
    const col = k % g.columnas;
    (paginas[pagina] ||= []).push({
      leftMm: redondear(g.margenIzquierdoMm + col * (g.anchoMm + g.separacionXMm) + ajuste.desplazamientoXMm),
      topMm: redondear(g.margenSuperiorMm + fila * (g.altoMm + g.separacionYMm) + ajuste.desplazamientoYMm),
    });
  }
  return paginas;
}

/** Medidas internas de una etiqueta: el QR ocupa el alto disponible (mínimo QR_MIN_MM si la etiqueta lo permite). */
export function medidasEtiqueta(g) {
  const padMm = Math.max(0.5, Math.min(3, (g.altoMm - QR_MIN_MM) / 2));
  const qrMm = redondear(Math.max(0, Math.min(g.altoMm - 2 * padMm, g.anchoMm * 0.55)));
  const textoMm = redondear(Math.max(0, g.anchoMm - qrMm - 3 * padMm));
  return { padMm, qrMm, textoMm };
}

/** Tamaño de letra (mm) del n° de serie: lo más grande que entre en el ancho, entre 3,2 y 9 mm. */
export const fuenteSerieMm = (serie, textoMm) =>
  redondear(Math.max(3.2, Math.min(9, textoMm / (Math.max(serie.length, 1) * 0.58))));

/** Avisos de configuración (no bloquean: la persona decide). */
export function avisos(g, ajuste) {
  const out = [];
  if (![g.columnas, g.filas, g.anchoMm, g.altoMm].every((n) => n > 0)) out.push("Revisá las medidas: columnas, filas, ancho y alto deben ser mayores que cero.");
  const ancho = g.margenIzquierdoMm + g.columnas * g.anchoMm + (g.columnas - 1) * g.separacionXMm;
  const alto = g.margenSuperiorMm + g.filas * g.altoMm + (g.filas - 1) * g.separacionYMm;
  if (ancho + Math.max(0, ajuste.desplazamientoXMm) > HOJA_A4.anchoMm + 0.01) out.push(`La grilla mide ${redondear(ancho)} mm de ancho y la hoja A4 tiene 210 mm: se va a cortar.`);
  if (alto + Math.max(0, ajuste.desplazamientoYMm) > HOJA_A4.altoMm + 0.01) out.push(`La grilla mide ${redondear(alto)} mm de alto y la hoja A4 tiene 297 mm: se va a cortar.`);
  if (g.margenIzquierdoMm + ajuste.desplazamientoXMm < 0 || g.margenSuperiorMm + ajuste.desplazamientoYMm < 0) out.push("Con este desplazamiento la primera etiqueta queda fuera de la hoja.");
  const { qrMm } = medidasEtiqueta(g);
  if (g.altoMm > 0 && qrMm < QR_MIN_MM) out.push(`El QR queda de ${qrMm} mm (menos de ${QR_MIN_MM} mm): puede costar escanearlo.`);
  return out;
}

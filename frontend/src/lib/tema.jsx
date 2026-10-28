import { useSyncExternalStore } from "react";

/**
 * Tema claro / oscuro centralizado (v3.3).
 *  - Fuente de verdad: este módulo (no un estado por componente). Cualquier componente puede leerlo
 *    con `useTema()`; el canvas de fondo lo sigue observando la clase "dark" de <html>.
 *  - Se guarda en localStorage ("dci_tema"); sin elección guardada sigue la preferencia del sistema
 *    y la acompaña si cambia.
 *  - El script de index.html aplica la clase antes de pintar para evitar el parpadeo.
 */
const KEY = "dci_tema"; // "dark" | "light"
const COLOR_BARRA = { light: "#5EDAF5", dark: "#111827" }; // <meta name="theme-color">

const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : null;
const oyentes = new Set();

function guardado() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null; // storage bloqueado
  }
}

const delSistema = () => (mq?.matches ? "dark" : "light");
let tema = guardado() || "dark";

function aplicar(valor, animar) {
  const html = document.documentElement;
  if (animar) {
    // Transición suave de colores solo al cambiar a mano; se quita enseguida para no frenar el resto
    html.classList.add("cambiando-tema");
    window.setTimeout(() => html.classList.remove("cambiando-tema"), 320);
  }
  html.classList.toggle("dark", valor === "dark");
  html.style.colorScheme = valor;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR_BARRA[valor]);
}

function cambiar(valor, { persistir = true, animar = true } = {}) {
  if (valor === tema) return;
  tema = valor;
  if (persistir) {
    try { localStorage.setItem(KEY, valor); } catch { /* idem */ }
  }
  aplicar(valor, animar);
  oyentes.forEach((f) => f());
}

if (typeof document !== "undefined") {
  aplicar(tema, false);
  // Sin elección guardada, acompaña al sistema
  mq?.addEventListener?.("change", () => {
    if (!guardado()) cambiar(delSistema(), { persistir: false });
  });
}

const suscribir = (f) => { oyentes.add(f); return () => oyentes.delete(f); };
const leer = () => tema;

/** { tema: "light" | "dark", oscuro: boolean, alternar() } */
export function useTema() {
  const actual = useSyncExternalStore(suscribir, leer, () => "light");
  return { tema: actual, oscuro: actual === "dark", alternar: () => cambiar(actual === "dark" ? "light" : "dark") };
}

/** Botón de la barra superior para alternar claro / oscuro. */
export default function BotonTema() {
  const { oscuro, alternar } = useTema();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oscuro}
      aria-label="Modo oscuro"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-ink text-ink transition-colors duration-micro hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-ink active:scale-95"
    >
      {oscuro ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

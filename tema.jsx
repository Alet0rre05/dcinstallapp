import { useEffect, useState } from "react";

const KEY = "dci_tema"; // "dark" | "light"; sin valor = sigue la preferencia del sistema

function temaInicial() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "dark" || t === "light") return t;
  } catch { /* storage bloqueado */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Botón de la barra superior para alternar claro / oscuro. */
export default function BotonTema() {
  const [tema, setTema] = useState(temaInicial);
  const oscuro = tema === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", oscuro);
  }, [oscuro]);

  const alternar = () => {
    const nuevo = oscuro ? "light" : "dark";
    setTema(nuevo);
    try { localStorage.setItem(KEY, nuevo); } catch { /* idem */ }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oscuro}
      aria-label="Modo oscuro"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-ink text-ink transition-colors duration-200 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-ink"
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api.js";
import EstadoVacio from "./EstadoVacio.jsx";
import { ListaSkeleton } from "./Skeleton.jsx";
import { vibrar } from "./haptico.js";

const CADA_MS = 60_000; // el contador es liviano; se consulta una vez por minuto

const fechaCorta = (iso) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  });

function Icono({ tipo }) {
  const props = { "aria-hidden": "true", viewBox: "0 0 24 24", className: "h-5 w-5 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (tipo === "VENCIMIENTOS") {
    return <svg {...props}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.01" /></svg>;
  }
  if (tipo === "TICKET_CERRADO") {
    return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg>;
  }
  if (tipo === "TICKET_REABIERTO") {
    return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>;
  }
  return <svg {...props}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
}

/** Campana de la barra superior: contador de avisos no leídos + panel con la lista. */
export default function Notificaciones() {
  const navigate = useNavigate();
  const raiz = useRef(null);
  const boton = useRef(null);
  const anterior = useRef(null); // contador previo (para vibrar solo cuando sube)

  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState(null);
  const [error, setError] = useState("");
  const [sinRed, setSinRed] = useState(false);

  // -- Contador: si falla la red se conserva el último valor, sin molestar -------------------
  const actualizarContador = useCallback(async () => {
    try {
      const { no_leidas } = await api("/notificaciones/contador/");
      setSinRed(false);
      setNoLeidas(no_leidas);
      if (anterior.current !== null && no_leidas > anterior.current) vibrar([60, 40, 60]);
      anterior.current = no_leidas;
    } catch {
      setSinRed(true);
    }
  }, []);

  useEffect(() => {
    actualizarContador();
    const id = setInterval(() => { if (!document.hidden) actualizarContador(); }, CADA_MS);
    const alVolver = () => { if (!document.hidden) actualizarContador(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", alVolver); };
  }, [actualizarContador]);

  // -- Lista ----------------------------------------------------------------------------------
  const cargarLista = useCallback(async () => {
    setError("");
    try {
      const data = await api("/notificaciones/");
      setLista(data.results);
      setNoLeidas(data.no_leidas);
      anterior.current = data.no_leidas;
    } catch (err) {
      setError(err.message || "No pudimos cargar los avisos.");
    }
  }, []);

  useEffect(() => { if (abierto) cargarLista(); }, [abierto, cargarLista]);

  // -- Cerrar con Esc o al tocar afuera ---------------------------------------------------------
  useEffect(() => {
    if (!abierto) return undefined;
    const esc = (e) => { if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); } };
    const afuera = (e) => { if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("keydown", esc);
    document.addEventListener("mousedown", afuera);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("mousedown", afuera); };
  }, [abierto]);

  const marcar = async (cuerpo) => {
    try {
      const { no_leidas } = await api("/notificaciones/leer/", { method: "POST", body: cuerpo });
      setNoLeidas(no_leidas);
      anterior.current = no_leidas;
      return true;
    } catch {
      setError("No pudimos marcar el aviso como leído. Probá de nuevo.");
      return false;
    }
  };

  const abrirAviso = async (n) => {
    if (!n.leida) {
      const ok = await marcar({ ids: [n.id] });
      if (ok) setLista((l) => l && l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    }
    setAbierto(false);
    if (n.enlace) navigate(n.enlace);
  };

  const marcarTodas = async () => {
    if (await marcar({ todas: true })) setLista((l) => l && l.map((x) => ({ ...x, leida: true })));
  };

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls="panel-avisos"
        aria-label={noLeidas > 0 ? `Avisos: ${noLeidas} sin leer` : "Avisos"}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-ink text-ink transition-colors duration-200 hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-ink"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {noLeidas > 0 && (
          <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-acento px-1 text-xs font-bold text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <section
          id="panel-avisos"
          aria-label="Avisos"
          className="absolute right-0 z-40 mt-2 w-[min(92vw,24rem)] rounded-lg border border-slate-200 bg-white p-3 text-ink shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="mb-2 flex items-center gap-2">
            <h2 className="mr-auto text-lg font-bold text-ink">Avisos</h2>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={noLeidas === 0}
              className="btn-acento-sec min-h-[44px]"
            >
              Marcar todos como leídos
            </button>
          </div>

          <p aria-live="polite" className="sr-only">{noLeidas} avisos sin leer</p>
          {sinRed && (
            <p role="status" className="mb-2 rounded-md bg-slate-100 p-2 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              Sin conexión: mostramos lo último que pudimos cargar.
            </p>
          )}
          {error && (
            <p role="alert" className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-red-100 p-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-300">
              {error}
              <button type="button" className="btn-acento-sec min-h-[44px]" onClick={cargarLista}>Reintentar</button>
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {!lista && !error && <ListaSkeleton filas={3} alto="h-14" />}
            {lista && lista.length === 0 && (
              <EstadoVacio titulo="No tenés avisos" icono="🔔">
                Acá vas a ver los mensajes de tus tickets, los cierres de soporte y el resumen semanal de vencimientos.
              </EstadoVacio>
            )}
            {lista && lista.length > 0 && (
              <ul className="space-y-2">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => abrirAviso(n)}
                      className={`flex min-h-[56px] w-full items-start gap-3 rounded-md border p-3 text-left transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-acento ${
                        n.leida
                          ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          : "border-acento/40 bg-acento-light hover:bg-acento-light/70 dark:border-acento-soft/40 dark:bg-acento-deep dark:hover:bg-acento-deep/70"
                      }`}
                    >
                      <span className={n.leida ? "text-slate-500 dark:text-slate-400" : "text-acento dark:text-acento-soft"}>
                        <Icono tipo={n.tipo} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-ink">
                          {!n.leida && <span className="mr-1 text-sm font-bold text-acento dark:text-acento-soft">NUEVO ·</span>}
                          {n.titulo}
                        </span>
                        {n.mensaje && <span className="block break-words text-sm text-slate-600">{n.mensaje}</span>}
                        <span className="block text-xs text-slate-500">{fechaCorta(n.creada)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

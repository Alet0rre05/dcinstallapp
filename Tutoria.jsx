import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { vibrar } from "../lib/haptico.js";
import { GUIAS, ROL_TEXTO } from "../lib/tutoriaContenido.js";

// Progreso guardado solo en este navegador (por usuario). Si el storage falla, la página igual funciona.
const clave = (user) => `dcinstall.tutoria.${user ? user.id : "anon"}`;
const leer = (k) => {
  try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; }
};
const guardar = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin storage: no pasa nada */ }
};

/** Rol efectivo para filtrar guías: sin sesión o sin rol = PUBLICO. */
const nivelDe = (user) => user?.rol || "PUBLICO";
const puedeVer = (guia, nivel) => guia.roles.includes("PUBLICO") || guia.roles.includes(nivel);

function Insignia({ guia }) {
  const texto = guia.roles.includes("PUBLICO")
    ? ROL_TEXTO.PUBLICO
    : guia.roles.length === 3 ? "Todos los roles" : guia.roles.map((r) => ROL_TEXTO[r]).join(" y ");
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-acento-light px-2 py-0.5 text-sm font-semibold text-acento-dark dark:bg-acento-deep dark:text-acento-soft">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
      {texto}
    </span>
  );
}

function Guia({ guia, hechos, onToggle, onCerrar, onReiniciar, puede }) {
  const [paso, setPaso] = useState(() => {
    const primero = guia.pasos.findIndex((_, i) => !hechos.includes(i));
    return primero === -1 ? 0 : primero;
  });
  const total = guia.pasos.length;
  const completos = hechos.filter((i) => i < total).length;
  const actual = guia.pasos[paso];
  const hecho = hechos.includes(paso);

  const marcarYSeguir = () => {
    if (!hecho) onToggle(paso);
    if (paso < total - 1) setPaso(paso + 1);
  };

  return (
    <section className="card space-y-4" aria-label={guia.titulo}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-ink">{guia.titulo}</h2>
          <p className="text-base text-slate-600">{guia.resumen}</p>
        </div>
        <button className="btn-acento-sec" onClick={onCerrar}>← Todas las guías</button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-base font-semibold text-ink">
          <span>Paso {paso + 1} de {total}</span>
          <span>{completos} de {total} hechos</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completos}
          aria-label="Progreso de la guía"
        >
          <div className="h-full rounded-full bg-acento transition-all duration-200 dark:bg-acento-soft" style={{ width: `${(completos / total) * 100}%` }} />
        </div>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Pasos">
        {guia.pasos.map((p, i) => (
          <li key={i}>
            <button
              onClick={() => setPaso(i)}
              aria-current={i === paso ? "step" : undefined}
              aria-label={`Paso ${i + 1}: ${p.t}${hechos.includes(i) ? " (hecho)" : ""}`}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border-2 text-base font-bold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-acento ${
                i === paso
                  ? "border-acento-darker bg-acento-darker text-white dark:border-acento-soft dark:bg-acento-soft dark:text-acento-deep"
                  : hechos.includes(i)
                    ? "border-acento bg-acento text-white dark:border-acento-btn dark:bg-acento-btn"
                    : "border-slate-300 bg-white text-ink hover:border-acento dark:border-slate-500 dark:bg-slate-800 dark:hover:border-acento-soft"
              }`}
            >
              {hechos.includes(i) && i !== paso ? "✓" : i + 1}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-acento/30 bg-acento-light p-4 dark:border-acento-soft/30 dark:bg-acento-deep" aria-live="polite">
        <h3 className="mb-1 text-lg font-bold text-acento-darker dark:text-acento-soft">{paso + 1}. {actual.t}</h3>
        <p className="text-base text-slate-800 dark:text-slate-100">{actual.d}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="btn-acento-sec" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>← Anterior</button>
        {paso < total - 1 ? (
          <button className="btn-acento" onClick={marcarYSeguir}>{hecho ? "Siguiente →" : "Hecho, siguiente →"}</button>
        ) : (
          <button className="btn-acento" onClick={() => { if (!hecho) { onToggle(paso); vibrar(40); } }} disabled={hecho}>
            {hecho ? "✓ Guía completa" : "Marcar como hecho"}
          </button>
        )}
        {hecho && paso < total - 1 && (
          <button className="btn-acento-sec" onClick={() => onToggle(paso)}>Desmarcar paso</button>
        )}
      </div>

      {guia.ruta && puede && (
        <p className="text-base">
          <Link className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-acento underline underline-offset-2 hover:text-acento-dark dark:text-acento-soft dark:hover:text-white" to={guia.ruta}>{guia.rutaTexto || "Ir a la pantalla"} ›</Link>
        </p>
      )}
      {!puede && (
        <p role="note" className="rounded-md border border-yellow-300 bg-yellow-100 p-3 text-base font-semibold text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
          Esta guía es para el rol: {guia.roles.map((r) => ROL_TEXTO[r]).join(", ")}. Con tu cuenta actual no vas a poder hacerlo, pero podés leerla.
        </p>
      )}

      {completos > 0 && (
        <button className="inline-flex min-h-[44px] items-center text-base font-semibold text-acento underline underline-offset-2 dark:text-acento-soft" onClick={onReiniciar}>Reiniciar progreso de esta guía</button>
      )}
    </section>
  );
}

/** Tutoría: guías paso a paso de todo lo que se puede hacer en la app, filtradas por el rol del usuario. */
export default function Tutoria() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const nivel = nivelDe(user);
  const k = clave(user);

  const [progreso, setProgreso] = useState(() => leer(k));
  const [verTodas, setVerTodas] = useState(false);
  useEffect(() => { setProgreso(leer(k)); }, [k]);

  const abierta = GUIAS.find((g) => g.id === params.get("guia")) || null;

  const visibles = useMemo(
    () => GUIAS.filter((g) => verTodas || puedeVer(g, nivel)),
    [verTodas, nivel]
  );

  const cambiar = (id, lista) => {
    const nuevo = { ...progreso, [id]: lista };
    setProgreso(nuevo);
    guardar(k, nuevo);
  };
  const toggle = (id, i) => {
    const hechos = progreso[id] || [];
    cambiar(id, hechos.includes(i) ? hechos.filter((x) => x !== i) : [...hechos, i]);
  };

  if (abierta) {
    return (
      <Guia
        key={abierta.id}
        guia={abierta}
        hechos={progreso[abierta.id] || []}
        puede={puedeVer(abierta, nivel)}
        onToggle={(i) => toggle(abierta.id, i)}
        onReiniciar={() => cambiar(abierta.id, [])}
        onCerrar={() => setParams({})}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-acento p-4 text-white shadow-sm dark:bg-acento-deep dark:text-acento-soft">
        <h1 className="text-2xl font-bold">Tutoría</h1>
        <p className="text-base">
          Guías paso a paso de todo lo que podés hacer en DC INSTALL.
          {user && user.rol ? ` Mostramos las de tu rol (${ROL_TEXTO[user.rol]}).` : " Mostramos las que no requieren rol."}
        </p>
      </div>

      <label className="flex min-h-[44px] items-center gap-2 text-base">
        <input type="checkbox" className="h-5 w-5" checked={verTodas} onChange={(e) => setVerTodas(e.target.checked)} />
        Ver también las guías de otros roles
      </label>

      <ul className="grid gap-3 sm:grid-cols-2">
        {visibles.map((g) => {
          const hechos = (progreso[g.id] || []).filter((i) => i < g.pasos.length).length;
          const completa = hechos === g.pasos.length;
          return (
            <li key={g.id}>
              <button
                onClick={() => setParams({ guia: g.id })}
                className="card flex h-full min-h-[96px] w-full flex-col items-start gap-1 rounded-lg text-left transition-colors duration-200 hover:border-acento hover:bg-acento-light focus-visible:ring-2 focus-visible:ring-acento dark:hover:border-acento-soft dark:hover:bg-acento-deep"
              >
                <span className="text-lg font-semibold text-ink">{g.titulo}</span>
                <span className="text-base text-slate-600">{g.resumen}</span>
                <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <Insignia guia={g} />
                  <span className={`text-sm font-semibold ${completa ? "text-acento dark:text-acento-soft" : "text-slate-600"}`}>
                    {completa ? "✓ Completa" : hechos > 0 ? `${hechos} de ${g.pasos.length} pasos` : `${g.pasos.length} pasos`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

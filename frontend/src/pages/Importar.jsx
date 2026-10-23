import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Item, Panel } from "../lib/animado.jsx";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

const MAX_MB = 5;

/** Importar matafuegos desde Excel/CSV (solo staff): cliente → plantilla → archivo → vista previa → confirmar. */
export default function Importar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputArchivo = useRef(null);
  const [clienteId, setClienteId] = useState(user.clientes.length === 1 ? String(user.clientes[0].id) : "");
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(null); // respuesta de dry_run
  const [hecho, setHecho] = useState(null); // respuesta final (201)
  const [error, setError] = useState("");
  const [erroresFinal, setErroresFinal] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cliente = user.clientes.find((c) => String(c.id) === clienteId);

  const reiniciar = () => {
    setArchivo(null); setVista(null); setHecho(null); setError(""); setErroresFinal(null);
    if (inputArchivo.current) inputArchivo.current.value = "";
  };

  const descargarPlantilla = async () => {
    setError("");
    try {
      const blob = await api("/matafuegos/plantilla-importacion/", { blob: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "plantilla_matafuegos.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const [arrastrando, setArrastrando] = useState(false);

  const tomarArchivo = (f) => {
    setVista(null); setError(""); setErroresFinal(null);
    if (f && !/\.(xlsx|csv)$/i.test(f.name)) { setArchivo(null); setError("Solo se aceptan archivos .xlsx o .csv."); return; }
    if (f && f.size > MAX_MB * 1024 * 1024) { setArchivo(null); setError(`El archivo supera el máximo de ${MAX_MB} MB.`); return; }
    setArchivo(f);
  };

  const elegirArchivo = (e) => tomarArchivo(e.target.files?.[0] || null);

  // Soltar un archivo: mismas validaciones que el selector; se sincroniza el input para que el estado coincida.
  const soltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer?.files?.[0] || null;
    if (!f) return;
    if (inputArchivo.current) {
      try { const dt = new DataTransfer(); dt.items.add(f); inputArchivo.current.files = dt.files; } catch { /* navegadores sin DataTransfer: igual se usa el archivo */ }
    }
    tomarArchivo(f);
  };

  const enviar = async (dryRun) => {
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("cliente", clienteId);
    form.append("dry_run", dryRun ? "true" : "false");
    setEnviando(true); setError("");
    try {
      const data = await api("/matafuegos/importar/", { method: "POST", body: form });
      if (dryRun) setVista(data); else setHecho(data);
    } catch (err) {
      setError(err.status === 413 ? `El archivo supera el máximo de ${MAX_MB} MB.` : err.message);
      if (!dryRun && err.data?.errores) setErroresFinal(err.data); // no se guardó nada
    } finally {
      setEnviando(false);
    }
  };

  // -- Éxito --------------------------------------------------------------------
  if (hecho) {
    return (
      <Item className="card space-y-3">
        <h1 className="text-xl font-bold">✅ Importación lista</h1>
        <p className="text-base">Se cargaron <b>{hecho.creados}</b> equipos para <b>{cliente?.nombre}</b>.</p>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn min-h-[44px]"
            onClick={() => navigate("/etiquetas", { state: { cliente: hecho.cliente, ids: hecho.ids } })}
          >
            Imprimir etiquetas de estos equipos
          </button>
          <button className="btn-sec min-h-[44px]" onClick={reiniciar}>Importar otro archivo</button>
        </div>
      </Item>
    );
  }

  const conErrores = vista && vista.con_error > 0;
  const detalle = erroresFinal || vista;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Importar desde Excel</h1>

      <section className="card space-y-2">
        <h2 className="text-base font-semibold">1. Elegí el cliente</h2>
        <select
          className="input min-h-[44px]"
          value={clienteId}
          onChange={(e) => { setClienteId(e.target.value); setVista(null); setErroresFinal(null); }}
        >
          <option value="">— Elegí un cliente —</option>
          {user.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </section>

      <section className="card space-y-2">
        <h2 className="text-base font-semibold">2. Descargá la plantilla</h2>
        <p className="text-sm text-slate-600">Es la misma planilla de extintores que se descarga en Planillas, en blanco. Completá una fila por matafuego desde la fila 4.</p>
        <button className="btn-sec min-h-[44px]" onClick={descargarPlantilla}>Descargar plantilla (.xlsx)</button>
      </section>

      <section className="card space-y-2">
        <h2 className="text-base font-semibold">3. Subí el archivo</h2>
        <div
          onDragEnter={(e) => { e.preventDefault(); setArrastrando(true); }}
          onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false); }}
          onDrop={soltar}
          className={`rounded-lg border-2 border-dashed p-3 transition-colors duration-micro ${
            arrastrando ? "border-cian bg-cian/10 shadow-glow-cian" : "border-cian-borde"
          }`}
        >
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">
            {arrastrando ? "Soltá el archivo acá" : archivo ? `Archivo elegido: ${archivo.name}` : "Arrastrá un .xlsx o .csv hasta acá, o elegilo:"}
          </p>
          <input
            ref={inputArchivo}
            type="file"
            accept=".xlsx,.csv"
            className="input min-h-[44px]"
            onChange={elegirArchivo}
          />
        </div>
        <button
          className="btn min-h-[44px]"
          disabled={!clienteId || !archivo || enviando}
          onClick={() => enviar(true)}
        >
          {enviando && !vista ? "Revisando…" : "Revisar archivo"}
        </button>
        {enviando && (
          <div role="status" className="space-y-1">
            <span className="block h-1.5 overflow-hidden rounded-full bg-cian/20">
              {/* indeterminada a propósito: no se conoce el avance real del servidor */}
              <motion.span
                className="block h-full w-1/3 rounded-full bg-cian"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
              />
            </span>
            <span className="text-sm text-slate-600">{vista ? "Importando…" : "Revisando el archivo…"}</span>
          </div>
        )}
        {!clienteId && <p className="text-sm text-slate-500">Primero elegí un cliente.</p>}
      </section>

      {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-base text-red-700">{error}</p>}

      {detalle && (
        <Panel as="section" className="card space-y-3" aria-label="Vista previa">
          <h2 className="text-base font-semibold">4. Vista previa — {detalle.archivo}</h2>
          <p className="text-base">
            {detalle.total_filas} filas · <b className="text-green-700">{detalle.validas} válidas</b> ·{" "}
            <b className={detalle.con_error ? "text-red-700" : ""}>{detalle.con_error} con error</b>
          </p>

          {detalle.errores.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold text-red-700">Corregí esto en el archivo y volvé a subirlo:</p>
              <ul className="max-h-72 space-y-1 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-sm">
                {detalle.errores.map((er, i) => <li key={i}>{er.texto}</li>)}
              </ul>
              {detalle.errores_truncados && (
                <p className="mt-1 text-xs text-slate-500">Se muestran los primeros {detalle.errores.length} de {detalle.errores_totales} errores.</p>
              )}
            </div>
          )}

          {detalle.muestra?.length > 0 && (
            <div className="overflow-x-auto">
              <p className="mb-1 text-sm text-slate-600">Primeras filas válidas:</p>
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b"><th className="pr-3">N° de serie</th><th className="pr-3">Clase</th><th className="pr-3">Ubicación</th><th className="pr-3">Carga</th><th>PH</th></tr></thead>
                <tbody>
                  {detalle.muestra.map((f, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="pr-3 font-semibold">{f.numero_serie}</td><td className="pr-3">{f.clase || "—"}</td>
                      <td className="pr-3">{f.ubicacion || "—"}</td><td className="pr-3">{f.vencimiento_carga || "—"}</td><td>{f.vencimiento_ph || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {conErrores || erroresFinal ? (
            <div className="space-y-2">
              <p className="text-base font-semibold">No se guardó nada: con un solo error se cancela toda la carga.</p>
              <button className="btn-sec min-h-[44px]" onClick={reiniciar}>Elegir otro archivo</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn min-h-[44px]" disabled={enviando} onClick={() => enviar(false)}>
                {enviando ? "Importando…" : `Confirmar e importar ${vista.validas} equipos`}
              </button>
              <button className="btn-sec min-h-[44px]" disabled={enviando} onClick={reiniciar}>Cancelar</button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

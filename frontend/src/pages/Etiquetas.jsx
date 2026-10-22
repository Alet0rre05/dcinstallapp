import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import QRMatafuego from "../lib/QRMatafuego.jsx";
import { baseUrlConfigurada, baseUrlPublica } from "../lib/publicUrl.js";
import {
  AJUSTE_INICIAL, CAMPOS_GEOMETRIA, HOJA_A4, PRESETS, PRESET_POR_DEFECTO,
  avisos, distribuir, fuenteSerieMm, medidasEtiqueta, porHoja,
} from "../lib/etiquetas.js";

const GUARDADO = "dci_etiquetas"; // el calibrado de la impresora se recuerda en este navegador
const PX_POR_MM = 96 / 25.4;

const cargarGuardado = () => {
  try { return JSON.parse(localStorage.getItem(GUARDADO)) || {}; } catch { return {}; }
};

async function cargarEquiposActivos(clienteId) {
  let todos = [];
  for (let page = 1; page <= 50; page++) {
    const data = await api(`/matafuegos/?cliente=${clienteId}&page_size=500&page=${page}`);
    todos = todos.concat(data.results);
    if (!data.next) break;
  }
  return todos.sort((a, b) => a.numero_serie.localeCompare(b.numero_serie, "es", { numeric: true }));
}

/** CSS de impresión: vive solo mientras esta pantalla está montada (así @page no afecta al resto de la app). */
const CSS_IMPRESION = `
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
  /* margin: el space-y-4 del contenedor le pondría 16 px arriba aunque el panel esté oculto: correría TODAS las etiquetas */
  .etq-visor { background: #fff !important; padding: 0 !important; margin: 0 !important; gap: 0 !important; display: block !important; }
  .etq-marco { width: ${HOJA_A4.anchoMm}mm !important; height: 296.5mm !important; margin: 0 !important;
    box-shadow: none !important; overflow: hidden; break-after: page; page-break-after: always; }
  .etq-marco:last-child { break-after: auto; page-break-after: auto; }
  .etq-hoja { transform: none !important; }
}`;

/**
 * Campo numérico en mm. Es de TEXTO a propósito: en un <input type="number"> controlado, al tipear "-"
 * el navegador informa valor vacío y se borra lo escrito (no se podrían cargar desplazamientos negativos).
 * Con `pasos` agrega botones − / + (en iOS el teclado decimal no trae el signo menos).
 */
function CampoMm({ label, value, onChange, pasos = 0, negativo = false }) {
  const id = useId();
  const num = parseFloat(String(value).replace(",", ".")) || 0;
  const mover = (d) => onChange(String(Math.round((num + d) * 100) / 100));
  const valido = negativo ? /^-?\d*[.,]?\d*$/ : /^\d*[.,]?\d*$/;
  return (
    <div className="text-xs">
      <label htmlFor={id}>{label}</label>
      <div className="flex gap-1">
        {pasos > 0 && <button type="button" className="btn-sec min-h-[44px] min-w-[44px]" aria-label={`Restar ${pasos} mm a ${label}`} onClick={() => mover(-pasos)}>−</button>}
        <input
          id={id}
          type="text"
          inputMode={negativo ? "text" : "decimal"}
          autoComplete="off"
          className="input min-h-[44px]"
          value={value}
          // Tocar el campo selecciona todo (se reemplaza el valor al tipear). Un frame después: en táctil el
          // navegador ubica el cursor DESPUÉS del evento de foco y pisaría la selección.
          onFocus={(e) => { const el = e.target; requestAnimationFrame(() => el.select()); }}
          onMouseUp={(e) => e.preventDefault()}
          onChange={(e) => valido.test(e.target.value) && onChange(e.target.value)}
        />
        {pasos > 0 && <button type="button" className="btn-sec min-h-[44px] min-w-[44px]" aria-label={`Sumar ${pasos} mm a ${label}`} onClick={() => mover(pasos)}>+</button>}
      </div>
    </div>
  );
}

function Etiqueta({ m, pos, g, bordes }) {
  const { padMm, qrMm, textoMm } = medidasEtiqueta(g);
  const fuente = fuenteSerieMm(m.numero_serie, textoMm);
  return (
    <div
      className="etq-etiqueta"
      style={{
        position: "absolute", left: `${pos.leftMm}mm`, top: `${pos.topMm}mm`,
        width: `${g.anchoMm}mm`, height: `${g.altoMm}mm`, boxSizing: "border-box",
        padding: `${padMm}mm`, display: "flex", alignItems: "center", gap: `${padMm}mm`,
        overflow: "hidden", background: "#fff", color: "#000",
        outline: bordes ? "0.2mm dashed #64748b" : "none", outlineOffset: "-0.2mm",
      }}
    >
      <div style={{ width: `${qrMm}mm`, height: `${qrMm}mm`, flex: "none" }}>
        <QRMatafuego token={m.token_qr} size={256} marginSize={1} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div style={{ width: `${textoMm}mm`, minWidth: 0, textAlign: "center", lineHeight: 1.1 }}>
        <div style={{ fontSize: `${fuente}mm`, fontWeight: 800, wordBreak: "break-all", fontFamily: "Arial, Helvetica, sans-serif" }}>
          {m.numero_serie}
        </div>
        <div style={{ fontSize: "2.5mm", marginTop: "1.2mm", fontFamily: "Arial, Helvetica, sans-serif" }}>
          Escaneá para ver el estado
        </div>
      </div>
    </div>
  );
}

export default function Etiquetas() {
  const { user } = useAuth();
  const { state } = useLocation(); // viene de Importar: { cliente, ids }
  const guardado = useMemo(cargarGuardado, []);

  const [clienteId, setClienteId] = useState(
    state?.cliente ? String(state.cliente) : user.clientes.length === 1 ? String(user.clientes[0].id) : ""
  );
  const [equipos, setEquipos] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [error, setError] = useState("");
  const [presetKey, setPresetKey] = useState(PRESETS[guardado.preset] ? guardado.preset : PRESET_POR_DEFECTO);
  const [custom, setCustom] = useState({ ...PRESETS.personalizado, ...(guardado.custom || {}) });
  const [ajuste, setAjuste] = useState({ ...AJUSTE_INICIAL, ...(guardado.ajuste || {}) });
  const preseleccion = useRef(state?.ids ? new Set(state.ids) : null);

  // Geometría efectiva: un preset fijo, o los valores editados (texto -> número).
  const g = useMemo(() => {
    if (presetKey !== "personalizado") return PRESETS[presetKey];
    const out = {};
    for (const [k] of CAMPOS_GEOMETRIA) out[k] = parseFloat(String(custom[k]).replace(",", ".")) || 0;
    out.columnas = Math.max(0, Math.floor(out.columnas));
    out.filas = Math.max(0, Math.floor(out.filas));
    return out;
  }, [presetKey, custom]);
  const aj = useMemo(() => ({
    ...ajuste,
    desplazamientoXMm: parseFloat(String(ajuste.desplazamientoXMm).replace(",", ".")) || 0,
    desplazamientoYMm: parseFloat(String(ajuste.desplazamientoYMm).replace(",", ".")) || 0,
  }), [ajuste]);

  useEffect(() => {
    try { localStorage.setItem(GUARDADO, JSON.stringify({ preset: presetKey, custom, ajuste })); } catch { /* sin almacenamiento */ }
  }, [presetKey, custom, ajuste]);

  useEffect(() => {
    setEquipos(null); setError("");
    if (!clienteId) return;
    let vigente = true;
    cargarEquiposActivos(clienteId)
      .then((lista) => {
        if (!vigente) return;
        setEquipos(lista);
        const pre = preseleccion.current;
        setSel(new Set(pre ? lista.filter((m) => pre.has(m.id)).map((m) => m.id) : []));
        preseleccion.current = null; // la preselección vale solo para la primera carga
      })
      .catch((err) => vigente && setError(err.message));
    return () => { vigente = false; };
  }, [clienteId]);

  const elegidos = useMemo(() => (equipos || []).filter((m) => sel.has(m.id)), [equipos, sel]);
  const paginas = useMemo(() => distribuir(g, aj, elegidos.length), [g, aj, elegidos.length]);
  const lista_avisos = avisos(g, aj);
  const valida = lista_avisos.every((a) => !a.startsWith("Revisá")) && porHoja(g) > 0;

  // Escala de la vista previa: la hoja A4 se achica para entrar en el ancho de la pantalla.
  const visor = useRef(null);
  const [esc, setEsc] = useState(1);
  useEffect(() => {
    if (!visor.current) return;
    const medir = () => setEsc(Math.min(1, Math.max(0.2, (visor.current.clientWidth - 24) / (HOJA_A4.anchoMm * PX_POR_MM))));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(visor.current);
    return () => ro.disconnect();
  }, [elegidos.length > 0]);

  const alternar = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todos = equipos && equipos.length > 0 && sel.size === equipos.length;
  const setGeom = (k, v) => setCustom((c) => ({ ...c, [k]: v }));

  return (
    <div className="space-y-4">
      <style>{CSS_IMPRESION}</style>

      <div className="space-y-4 print:hidden">
        <h1 className="text-xl font-bold">Imprimir etiquetas</h1>

        {!baseUrlConfigurada && (
          <p role="alert" className="rounded border-2 border-red-600 bg-red-50 p-3 text-base font-bold text-red-800">
            ⚠ Dominio definitivo sin configurar: no imprimas etiquetas finales.
            <span className="mt-1 block text-sm font-normal">Los QR apuntan a <code>{baseUrlPublica}</code>, que no es el dominio definitivo (falta la variable VITE_PUBLIC_BASE_URL).</span>
          </p>
        )}
        {baseUrlConfigurada && <p className="text-sm text-slate-500">Los QR apuntan a <code>{baseUrlPublica}</code></p>}

        <section className="card space-y-2">
          <h2 className="text-base font-semibold">1. Cliente</h2>
          <select className="input min-h-[44px]" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">— Elegí un cliente —</option>
            {user.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </section>

        {clienteId && (
          <section className="card space-y-2">
            <h2 className="text-base font-semibold">2. Equipos</h2>
            {error && <p className="text-red-600">{error}</p>}
            {!equipos && !error && <p>Cargando equipos…</p>}
            {equipos?.length === 0 && <p className="text-slate-500">Este cliente no tiene equipos activos.</p>}
            {equipos?.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex min-h-[44px] items-center gap-2 text-base font-semibold">
                    <input type="checkbox" className="h-5 w-5" checked={!!todos} onChange={() => setSel(todos ? new Set() : new Set(equipos.map((m) => m.id)))} />
                    Seleccionar todos
                  </label>
                  <span className="text-sm text-slate-600">{sel.size} de {equipos.length} seleccionados</span>
                </div>
                <ul className="max-h-72 overflow-auto rounded border border-slate-200">
                  {equipos.map((m) => (
                    <li key={m.id} className="border-b border-slate-100 last:border-b-0">
                      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-2 text-base">
                        <input type="checkbox" className="h-5 w-5" checked={sel.has(m.id)} onChange={() => alternar(m.id)} />
                        <span className="font-semibold">N° {m.numero_serie}</span>
                        <span className="truncate text-sm text-slate-500">{m.ubicacion}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section className="card space-y-3">
          <h2 className="text-base font-semibold">3. Formato de la hoja (A4 adhesiva)</h2>
          <select className="input min-h-[44px]" value={presetKey} onChange={(e) => setPresetKey(e.target.value)} aria-label="Formato de etiquetas">
            {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.nombre}</option>)}
          </select>
          {presetKey === "personalizado" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CAMPOS_GEOMETRIA.map(([k, label]) => (
                <CampoMm key={k} label={label} value={custom[k]} onChange={(v) => setGeom(k, v)} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CampoMm label="Desplazar → X (mm)" negativo pasos={0.1} value={ajuste.desplazamientoXMm} onChange={(v) => setAjuste({ ...ajuste, desplazamientoXMm: v })} />
            <CampoMm label="Desplazar ↓ Y (mm)" negativo pasos={0.1} value={ajuste.desplazamientoYMm} onChange={(v) => setAjuste({ ...ajuste, desplazamientoYMm: v })} />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-base">
            <input type="checkbox" className="h-5 w-5" checked={ajuste.bordes} onChange={(e) => setAjuste({ ...ajuste, bordes: e.target.checked })} />
            Mostrar bordes (para probar en papel común)
          </label>
          {lista_avisos.map((a) => <p key={a} role="alert" className="text-sm font-semibold text-red-700">⚠ {a}</p>)}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn min-h-[44px]" disabled={elegidos.length === 0 || !valida} onClick={() => window.print()}>
            Imprimir
          </button>
          <span className="text-sm text-slate-600">
            {elegidos.length} {elegidos.length === 1 ? "etiqueta" : "etiquetas"} · {paginas.length} {paginas.length === 1 ? "hoja" : "hojas"}
          </span>
          {elegidos.length === 0 && <span className="text-sm text-slate-500">Elegí al menos un equipo.</span>}
        </div>
        <p className="text-xs text-slate-500">Al imprimir elegí tamaño A4, escala 100 % (sin «ajustar a la página») y márgenes ninguno.</p>
      </div>

      {elegidos.length > 0 && valida && (
        <div ref={visor} className="etq-visor flex flex-col items-center gap-3 rounded bg-slate-200 p-3" aria-label="Vista previa de la hoja">
          {paginas.map((etiquetas, p) => (
            <div key={p} className="etq-marco bg-white shadow" style={{ width: `${HOJA_A4.anchoMm * esc}mm`, height: `${HOJA_A4.altoMm * esc}mm` }}>
              <div className="etq-hoja" style={{ position: "relative", width: `${HOJA_A4.anchoMm}mm`, height: `${HOJA_A4.altoMm}mm`, transform: `scale(${esc})`, transformOrigin: "top left" }}>
                {etiquetas.map((pos, i) => (
                  <Etiqueta key={i} m={elegidos[p * porHoja(g) + i]} pos={pos} g={g} bordes={aj.bordes} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

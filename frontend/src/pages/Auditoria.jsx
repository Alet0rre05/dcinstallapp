import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import EstadoVacio from "../lib/EstadoVacio.jsx";
import { ListaSkeleton } from "../lib/Skeleton.jsx";
import { fechaHora } from "../lib/fmt.js";

const ACCIONES = [
  "REGISTRO", "LOGIN", "CAMBIO_PERFIL", "ASIGNACION_ROL", "REVOCACION_ROL", "ASIGNACION_CLIENTES",
  "CREACION", "MODIFICACION", "BAJA", "RESTAURACION", "MENSAJE", "CIERRE", "REAPERTURA", "IMPORTACION",
];

const valor = (v) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));

function Cambios({ antes, despues }) {
  const claves = [...new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])];
  if (claves.length === 0) return null;
  return (
    <table className="mt-2 w-full text-xs">
      <thead><tr className="text-left text-slate-500"><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
      <tbody>
        {claves.map((k) => (
          <tr key={k} className={valor(antes?.[k]) !== valor(despues?.[k]) ? "font-semibold" : ""}>
            <td className="pr-3">{k}</td><td className="pr-3">{valor(antes?.[k])}</td><td>{valor(despues?.[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Auditoria() {
  const [f, setF] = useState({ accion: "", usuario: "", desde: "", hasta: "" });
  const [pagina, setPagina] = useState(1);
  const [data, setData] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const qs = new URLSearchParams({ page: pagina });
    Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
    try {
      setData(await api(`/auditoria/?${qs}`));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [f, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (k) => (e) => { setPagina(1); setF({ ...f, [k]: e.target.value }); };

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        <select className="input" value={f.accion} onChange={set("accion")}>
          <option value="">Todas las acciones</option>
          {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input className="input" placeholder="Usuario" value={f.usuario} onChange={set("usuario")} />
        <input className="input" type="date" value={f.desde} onChange={set("desde")} aria-label="Desde" />
        <input className="input" type="date" value={f.hasta} onChange={set("hasta")} aria-label="Hasta" />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {!data ? <ListaSkeleton filas={4} alto="h-12" /> : (
        <>
          {data.results.length === 0 && <EstadoVacio titulo="No hay eventos para mostrar">Probá cambiar o limpiar los filtros.</EstadoVacio>}
          <ul className="space-y-2">
            {data.results.map((e) => (
              <li key={e.id} className="card cursor-pointer text-sm" onClick={() => setAbierto(abierto === e.id ? null : e.id)}>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-mono text-xs">{fechaHora(e.fecha)}</span>
                  <span><b>{e.usuario_nombre || "—"}</b> <span className="text-xs text-slate-500">({e.rol || "—"})</span></span>
                  <span className="rounded bg-slate-100 px-2 text-xs font-semibold">{e.accion}</span>
                  <span>{e.objeto} {e.objeto_repr && `· ${e.objeto_repr}`}</span>
                </div>
                {abierto === e.id && (
                  <div>
                    <p className="mt-1 text-xs text-slate-500">ID #{e.id} · IP {e.ip || "—"} · {e.objeto} #{e.objeto_id || "—"}</p>
                    <Cambios antes={e.antes} despues={e.despues} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button className="btn-sec" disabled={!data.previous} onClick={() => setPagina(pagina - 1)}>← Anterior</button>
            <span className="text-sm text-slate-500">Página {pagina} · {data.count} eventos</span>
            <button className="btn-sec" disabled={!data.next} onClick={() => setPagina(pagina + 1)}>Siguiente →</button>
          </div>
        </>
      )}
    </div>
  );
}

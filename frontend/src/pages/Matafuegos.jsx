import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import Combobox from "../lib/Combobox.jsx";
import EstadoBadge from "../lib/EstadoBadge.jsx";
import FichaMatafuego from "../lib/FichaMatafuego.jsx";

// FormControl vive ahora en lib/; se re-exporta para no romper imports viejos.
export { FormControl } from "../lib/FormControl.jsx";

// Más urgente primero. GRIS (sin datos / nunca controlado) va antes que VERDE.
const URGENCIA = { BORDO: 0, ROJO: 1, AMARILLO: 2, GRIS: 3, VERDE: 4 };

const ordenar = (lista) =>
  [...lista].sort(
    (a, b) =>
      (a.activo === b.activo ? 0 : a.activo ? -1 : 1) ||
      URGENCIA[a.estado_color] - URGENCIA[b.estado_color] ||
      a.numero_serie.localeCompare(b.numero_serie, "es", { numeric: true })
  );

/** Trae TODOS los equipos del cliente recorriendo las páginas (data.next). */
async function cargarEquiposDeCliente(clienteId, incluirBajas) {
  let todos = [];
  for (let page = 1; page <= 50; page++) {
    const q = `cliente=${clienteId}&page_size=500&page=${page}${incluirBajas ? "&incluir_inactivos=1" : ""}`;
    const data = await api(`/matafuegos/?${q}`);
    todos = todos.concat(data.results);
    if (!data.next) break;
  }
  return todos;
}

function FormMatafuego({ clientes, clienteInicial, onDone }) {
  const [f, setF] = useState({ cliente: clienteInicial || clientes[0]?.id || "", numero_serie: "", clase: "", ubicacion: "", vencimiento_carga: "", vencimiento_ph: "" });
  const [error, setError] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    const body = { ...f };
    ["vencimiento_carga", "vencimiento_ph"].forEach((k) => !body[k] && delete body[k]);
    try {
      await api("/matafuegos/", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={enviar} className="card mb-4 grid gap-2 sm:grid-cols-3">
      <select className="input min-h-[44px]" value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} required>
        {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <input className="input min-h-[44px]" placeholder="N° de serie" value={f.numero_serie} onChange={(e) => setF({ ...f, numero_serie: e.target.value })} required />
      <input className="input min-h-[44px]" placeholder="Clase (ABC, BC…)" value={f.clase} onChange={(e) => setF({ ...f, clase: e.target.value })} />
      <input className="input min-h-[44px] sm:col-span-3" placeholder="Ubicación" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
      <label className="text-xs">Venc. carga<input className="input min-h-[44px]" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label>
      <label className="text-xs">Venc. PH<input className="input min-h-[44px]" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label>
      <button className="btn min-h-[44px] self-end">Agregar matafuego</button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}

function TarjetaCliente({ c, onAbrir }) {
  return (
    <li>
      <button
        onClick={() => onAbrir(c.id)}
        className="card flex min-h-[72px] w-full items-center gap-3 text-left hover:bg-slate-50"
      >
        <span className="mr-auto">
          <span className="block text-lg font-semibold">{c.nombre}</span>
          <span className="block text-base text-slate-600">{c.total} {c.total === 1 ? "equipo" : "equipos"}</span>
          {c.vencidos_criticos > 0 && (
            <span className="mt-1 block text-base font-semibold text-red-700">
              ⚠ {c.vencidos_criticos} {c.vencidos_criticos === 1 ? "vencido o crítico" : "vencidos o críticos"}
            </span>
          )}
          {c.por_vencer > 0 && (
            <span className="block text-base font-semibold text-yellow-700">
              ● {c.por_vencer} por vencer
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-2xl text-slate-400">›</span>
      </button>
    </li>
  );
}

export default function Matafuegos() {
  const { user, esStaff, esCampo } = useAuth();
  const [params, setParams] = useSearchParams();
  const clienteParam = params.get("cliente");
  const equipoParam = params.get("equipo");

  const [resumen, setResumen] = useState(null);
  const [equipos, setEquipos] = useState(null);
  const [error, setError] = useState("");
  const [verBajas, setVerBajas] = useState(false);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const pedido = useRef(0); // descarta respuestas viejas si se cambia rápido de cliente

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await api("/clientes/resumen/"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  // Cliente abierto: solo si realmente está entre los del usuario.
  const cliente = useMemo(
    () => resumen?.find((c) => String(c.id) === clienteParam) || null,
    [resumen, clienteParam]
  );
  const clienteId = cliente?.id;

  const cargarEquipos = useCallback(async () => {
    if (!clienteId) return;
    const n = ++pedido.current;
    try {
      const todos = await cargarEquiposDeCliente(clienteId, verBajas);
      if (n === pedido.current) { setEquipos(ordenar(todos)); setError(""); }
    } catch (err) {
      if (n === pedido.current) setError(err.message);
    }
  }, [clienteId, verBajas]);

  useEffect(() => {
    setEquipos(null);
    cargarEquipos();
  }, [cargarEquipos]);

  // Refresca equipos + contadores del cliente abierto, sin tocar la selección.
  const refrescar = () => { cargarEquipos(); cargarResumen(); };

  const abrirCliente = (id) => { setMostrarAlta(false); setParams({ cliente: String(id) }); };
  const volver = () => { setVerBajas(false); setMostrarAlta(false); setParams({}); };
  const elegirEquipo = (m) => setParams({ cliente: String(clienteId), equipo: String(m.id) }, { replace: true });

  const elegido = equipos?.find((m) => String(m.id) === equipoParam) || null;

  const baja = async (m) => {
    if (!confirm(`¿Dar de baja el matafuego ${m.numero_serie}?`)) return;
    await api(`/matafuegos/${m.id}/`, { method: "DELETE" });
    refrescar();
  };

  const restaurar = async (m) => {
    await api(`/matafuegos/${m.id}/restaurar/`, { method: "POST" });
    refrescar();
  };

  if (error && !resumen) {
    return (
      <div className="space-y-2">
        <p className="text-red-600">{error}</p>
        <button className="btn min-h-[44px]" onClick={cargarResumen}>Reintentar</button>
      </div>
    );
  }
  if (!resumen) return <p>Cargando…</p>;

  // -- Paso 1: lista de clientes -------------------------------------------
  if (!cliente) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-bold">Elegí un cliente</h1>
        <p className="mb-3 text-base text-slate-600">Tocá el cliente para ver sus matafuegos.</p>
        {resumen.length === 0 && (
          <p className="text-slate-500">Todavía no tenés clientes asignados. Pedile a la oficina que te asigne uno.</p>
        )}
        <ul className="space-y-3">
          {resumen.map((c) => <TarjetaCliente key={c.id} c={c} onAbrir={abrirCliente} />)}
        </ul>
      </div>
    );
  }

  // -- Pasos 2 y 3: equipos del cliente y ficha ---------------------------------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-sec min-h-[44px]" onClick={volver}>← Clientes</button>
        <h1 className="mr-auto text-xl font-bold">{cliente.nombre}</h1>
        {esStaff && (
          <label className="flex min-h-[44px] items-center gap-2 text-base">
            <input type="checkbox" className="h-5 w-5" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver bajas
          </label>
        )}
      </div>

      {esStaff && (
        <>
          <button className="btn-sec min-h-[44px]" onClick={() => setMostrarAlta(!mostrarAlta)}>
            {mostrarAlta ? "Cerrar alta" : "+ Agregar matafuego"}
          </button>
          {mostrarAlta && (
            <FormMatafuego
              clientes={user.clientes}
              clienteInicial={cliente.id}
              onDone={() => { setMostrarAlta(false); refrescar(); }}
            />
          )}
        </>
      )}

      {error && (
        <p className="text-red-600">
          {error} <button className="underline" onClick={refrescar}>Reintentar</button>
        </p>
      )}
      {!equipos && !error && <p>Cargando equipos…</p>}
      {equipos && equipos.length === 0 && (
        <p className="text-slate-500">Este cliente todavía no tiene matafuegos cargados.</p>
      )}
      {equipos && equipos.length > 0 && (
        <Combobox
          label={`Elegí un matafuego (${equipos.length})`}
          placeholder="Buscá por n° de serie o ubicación"
          vacio="No hay ningún matafuego con ese dato"
          items={equipos}
          selected={elegido}
          getKey={(m) => m.id}
          searchText={(m) => `${m.numero_serie} ${m.ubicacion} ${m.clase}`}
          inputLabel={(m) => `N° ${m.numero_serie}${m.ubicacion ? ` · ${m.ubicacion}` : ""}`}
          onSelect={elegirEquipo}
          renderItem={(m) => (
            <span className="flex items-center gap-3">
              <span className="mr-auto min-w-0">
                <span className="block text-base font-semibold">
                  N° {m.numero_serie} {!m.activo && <span className="rounded bg-slate-200 px-1 text-xs font-normal">BAJA</span>}
                </span>
                <span className="block truncate text-sm text-slate-600">{m.ubicacion || "Sin ubicación"}</span>
              </span>
              <EstadoBadge estado={m.estado_color} />
            </span>
          )}
        />
      )}

      {elegido && (
        <FichaMatafuego
          key={elegido.id}
          m={elegido}
          esStaff={esStaff}
          esCampo={esCampo}
          onBaja={baja}
          onRestaurar={restaurar}
          onControlado={refrescar}
        />
      )}
    </div>
  );
}

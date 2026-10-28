import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import Combobox from "../lib/Combobox.jsx";
import EstadoVacio from "../lib/EstadoVacio.jsx";
import { vibrar } from "../lib/haptico.js";
import { ListaSkeleton } from "../lib/Skeleton.jsx";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** Planilla de extintores de un cliente (.xlsx con el formato de la planilla de referencia). Solo staff. */
export default function Planillas() {
  const { user } = useAuth();
  const hoy = new Date();
  const clientes = useMemo(
    () => [...user.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [user.clientes],
  );
  const [cliente, setCliente] = useState(clientes.length === 1 ? clientes[0] : null);
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState("");

  const anios = useMemo(() => {
    const a = hoy.getFullYear();
    return [a - 2, a - 1, a, a + 1];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setResumen(null); setError(""); setHecho("");
    if (!cliente) return undefined;
    let vigente = true;
    setCargando(true);
    api(`/clientes/${cliente.id}/exportar-planilla/resumen/`)
      .then((d) => { if (vigente) setResumen(d); })
      .catch((err) => { if (vigente) setError(err.message); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [cliente]);

  const descargar = async () => {
    setDescargando(true); setError(""); setHecho("");
    try {
      const { blob, nombre } = await api(`/clientes/${cliente.id}/exportar-planilla/?mes=${mes}&anio=${anio}`, { blob: true, conNombre: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre || `Extintores_${MESES[mes - 1].toUpperCase()}_${anio}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      vibrar(40); // confirmación háptica: la descarga arrancó
      setHecho(`Listo: se descargó la planilla de ${cliente.nombre} (${MESES[mes - 1]} ${anio}).`);
    } catch (err) {
      setError(err.message || "No se pudo generar la planilla. Probá de nuevo en un rato.");
    } finally {
      setDescargando(false);
    }
  };

  const sinEquipos = resumen && resumen.equipos === 0;

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-ink">Planillas de extintores</h1>
        <p className="text-base text-slate-600">
          Descargá la planilla de un cliente en Excel, con el formato de la planilla de control periódico. Abre directo en Excel y en Google Sheets.
        </p>
      </header>

      <div className="card space-y-4">
        <Combobox
          label="Cliente"
          placeholder="Buscá un cliente…"
          vacio="No hay clientes con ese nombre"
          items={clientes}
          selected={cliente}
          getKey={(c) => c.id}
          searchText={(c) => c.nombre}
          inputLabel={(c) => c.nombre}
          renderItem={(c) => <span className="block text-base">{c.nombre}</span>}
          onSelect={setCliente}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-base font-semibold">
            Mes
            <select className="input mt-1 min-h-[44px] text-base" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="block text-base font-semibold">
            Año
            <select className="input mt-1 min-h-[44px] text-base" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </div>

      {!cliente && <EstadoVacio titulo="Elegí un cliente">Cuando lo elijas, ves un resumen de sus equipos y podés descargar la planilla.</EstadoVacio>}

      {cliente && cargando && <ListaSkeleton filas={1} alto="h-24" />}

      {cliente && resumen && !sinEquipos && (
        <div className="card space-y-2" aria-live="polite">
          <p className="text-base font-semibold text-ink">
            {resumen.equipos} {resumen.equipos === 1 ? "equipo activo" : "equipos activos"} · {resumen.incompletos} con datos incompletos · {resumen.sin_control} sin ningún control
          </p>
          {resumen.incompletos > 0 && (
            <p role="status" className="rounded border border-yellow-400 bg-yellow-50 p-2 text-base text-yellow-900">
              <span aria-hidden="true">⚠ </span>
              {resumen.incompletos === 1 ? "Un equipo no tiene" : `${resumen.incompletos} equipos no tienen`} marca, año, agente o capacidad: esas celdas van a salir vacías. Podés descargar igual y completarlas a mano.
            </p>
          )}
        </div>
      )}

      {cliente && sinEquipos && (
        <EstadoVacio titulo="Este cliente no tiene equipos activos">Cargá o importá equipos primero y después descargá la planilla.</EstadoVacio>
      )}

      {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-base text-red-800">{error}</p>}
      {hecho && <p role="status" className="rounded border border-green-300 bg-green-50 p-3 text-base text-green-900">{hecho}</p>}

      <button
        type="button"
        className="btn-acento min-h-[44px] w-full sm:w-auto"
        disabled={!cliente || cargando || descargando || sinEquipos}
        onClick={descargar}
      >
        {descargando ? "Generando planilla…" : "Descargar planilla (.xlsx)"}
      </button>
    </section>
  );
}

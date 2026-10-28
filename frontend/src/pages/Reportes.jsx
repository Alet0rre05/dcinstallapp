import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function Reportes() {
  const hoy = new Date();
  const [mes, setMes] = useState(String(hoy.getMonth() + 1));
  const [anio, setAnio] = useState(String(hoy.getFullYear()));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { setData(null); setError(""); api(`/reportes/cumplimiento/?mes=${mes}&anio=${anio}`).then(setData).catch(e => setError(e.message)); }, [mes, anio]);
  async function descargar() {
    try {
      const blob = await api(`/reportes/vencimientos.pdf?mes=${mes}&anio=${anio}`, { blob: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `vencimientos-${anio}-${mes.padStart(2, "0")}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  }
  const max = Math.max(1, data?.target || 0);
  return <div className="space-y-4">
    <section className="card"><h1 className="text-2xl font-bold">Reportes y análisis</h1><p className="mt-1 text-slate-600">Vencimientos mensuales y cumplimiento de controles.</p></section>
    <section className="card grid gap-3 sm:grid-cols-3 items-end">
      <label className="font-semibold">Mes<select className="input mt-1" value={mes} onChange={e => setMes(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Intl.DateTimeFormat("es-AR",{month:"long"}).format(new Date(2024,i,1))}</option>)}</select></label>
      <label className="font-semibold">Año<input className="input mt-1" type="number" min="2000" max="2100" value={anio} onChange={e => setAnio(e.target.value)} /></label>
      <button className="btn-acento min-h-[44px]" onClick={descargar}>Descargar vencimientos PDF</button>
    </section>
    {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</p>}
    <section className="card space-y-3"><h2 className="text-xl font-bold">Controles del mes vs. target</h2>
      {!data ? <p>Cargando métricas…</p> : <>
        <div className="flex items-end gap-4"><strong className="text-4xl">{data.controlados}</strong><span className="pb-1">de {data.target} equipos activos controlados</span></div>
        <div className="h-5 overflow-hidden rounded bg-slate-200" role="img" aria-label={`${data.controlados} de ${data.target} equipos controlados`}><div className="h-full bg-acento" style={{width:`${Math.min(100, data.controlados / max * 100)}%`}} /></div>
        <h3 className="font-bold">Histórico de cumplimiento por operario</h3>
        {data.por_operario.length ? <ul className="divide-y">{data.por_operario.map(o=><li className="flex justify-between py-2" key={o.usuario_id}><span>{o.usuario__username}</span><strong>{o.controles} controles</strong></li>)}</ul> : <p className="text-slate-600">No hay controles registrados en este período.</p>}
      </>}
    </section>
  </div>;
}

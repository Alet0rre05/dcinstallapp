import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import EstadoBadge from "../lib/EstadoBadge.jsx";

const fecha = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

export function FormControl({ matafuego, onDone }) {
  const [f, setF] = useState({
    presion: "NORMAL", senalizacion: true, chapa_baliza: true, accesible: true,
    observaciones: "", ubicacion: "", vencimiento_carga: "", vencimiento_ph: "",
  });
  const [error, setError] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    const body = { ...f, matafuego: matafuego.id };
    ["vencimiento_carga", "vencimiento_ph"].forEach((k) => !body[k] && delete body[k]);
    try {
      await api("/controles/", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  const check = (k, label) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}
    </label>
  );

  return (
    <form onSubmit={enviar} className="mt-3 space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold">Nuevo control (inmutable una vez guardado)</p>
      <select className="input" value={f.presion} onChange={(e) => setF({ ...f, presion: e.target.value })}>
        <option value="BAJA">Presión baja</option>
        <option value="NORMAL">Presión normal</option>
        <option value="ALTA">Presión alta</option>
      </select>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {check("senalizacion", "Señalización OK")}
        {check("chapa_baliza", "Chapa/baliza OK")}
        {check("accesible", "Accesible")}
      </div>
      <input className="input" placeholder="Ubicación actual (opcional)" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Nuevo venc. carga<input className="input" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label>
        <label className="text-xs">Nuevo venc. PH<input className="input" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label>
      </div>
      <textarea className="input" placeholder="Observaciones" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn">Guardar control</button>
    </form>
  );
}

function FormMatafuego({ clientes, onDone }) {
  const [f, setF] = useState({ cliente: clientes[0]?.id || "", numero_serie: "", clase: "", ubicacion: "", vencimiento_carga: "", vencimiento_ph: "" });
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
      <select className="input" value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} required>
        {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <input className="input" placeholder="N° de serie" value={f.numero_serie} onChange={(e) => setF({ ...f, numero_serie: e.target.value })} required />
      <input className="input" placeholder="Clase (ABC, BC…)" value={f.clase} onChange={(e) => setF({ ...f, clase: e.target.value })} />
      <input className="input sm:col-span-3" placeholder="Ubicación" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
      <label className="text-xs">Venc. carga<input className="input" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label>
      <label className="text-xs">Venc. PH<input className="input" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label>
      <button className="btn self-end">Agregar matafuego</button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}

export default function Matafuegos() {
  const { user, esStaff, esCampo } = useAuth();
  const [lista, setLista] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [control, setControl] = useState(null);
  const [error, setError] = useState("");
  const [verBajas, setVerBajas] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await api(`/matafuegos/${verBajas ? "?incluir_inactivos=1" : ""}`);
      setLista(data.results);
    } catch (err) {
      setError(err.message);
    }
  }, [verBajas]);

  useEffect(() => { cargar(); }, [cargar]);

  const baja = async (m) => {
    if (!confirm(`¿Dar de baja el matafuego ${m.numero_serie}?`)) return;
    await api(`/matafuegos/${m.id}/`, { method: "DELETE" });
    cargar();
  };

  const restaurar = async (m) => {
    await api(`/matafuegos/${m.id}/restaurar/`, { method: "POST" });
    cargar();
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!lista) return <p>Cargando…</p>;

  const urlQR = (m) => `${window.location.origin}/qr/${m.token_qr}`;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="mr-auto text-xl font-bold">Matafuegos</h1>
        {esStaff && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={verBajas} onChange={(e) => setVerBajas(e.target.checked)} /> Ver bajas
          </label>
        )}
      </div>
      {esStaff && user.clientes.length > 0 && <FormMatafuego clientes={user.clientes} onDone={cargar} />}
      {lista.length === 0 && <p className="text-slate-500">No hay matafuegos para mostrar. Si tu cuenta es nueva, pedile a la oficina que te asigne un cliente.</p>}
      <ul className="space-y-3">
        {lista.map((m) => (
          <li key={m.id} className="card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <p className="font-semibold">{m.numero_serie} {!m.activo && <span className="rounded bg-slate-200 px-1 text-xs">BAJA</span>} <span className="text-sm font-normal text-slate-500">· {m.cliente_nombre}</span></p>
                <p className="text-sm text-slate-500">{m.clase || "—"} · {m.ubicacion || "Sin ubicación"}</p>
                <p className="text-xs text-slate-500">Carga: {fecha(m.vencimiento_carga)} · PH: {fecha(m.vencimiento_ph)}</p>
              </div>
              <EstadoBadge estado={m.estado_color} />
              <button className="btn-sec" onClick={() => setAbierto(abierto === m.id ? null : m.id)}>QR</button>
              {esCampo && m.activo && <button className="btn-sec" onClick={() => setControl(control === m.id ? null : m.id)}>Controlar</button>}
              {esStaff && m.activo && <button className="btn-sec text-red-700" onClick={() => baja(m)}>Baja</button>}
              {esStaff && !m.activo && <button className="btn-sec" onClick={() => restaurar(m)}>Restaurar</button>}
            </div>
            {m.problemas.length > 0 && <p className="mt-2 text-xs text-red-700">⚠ {m.problemas.join(" · ")}</p>}
            {abierto === m.id && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <QRCodeSVG value={urlQR(m)} size={160} />
                <a className="break-all text-xs text-brand underline" href={urlQR(m)} target="_blank" rel="noreferrer">{urlQR(m)}</a>
              </div>
            )}
            {control === m.id && <FormControl matafuego={m} onDone={() => { setControl(null); cargar(); }} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

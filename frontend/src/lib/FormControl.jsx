import { useState } from "react";
import { api } from "./api.js";

/** Formulario "Nuevo control". Lo usan la ficha de Matafuegos y el escaneo de QR (ScanQR). */
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
    <label className="flex min-h-[44px] items-center gap-3 text-base">
      <input type="checkbox" className="h-5 w-5" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}
    </label>
  );

  return (
    <form onSubmit={enviar} className="mt-3 space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold">Nuevo control (inmutable una vez guardado)</p>
      <select className="input min-h-[44px]" value={f.presion} onChange={(e) => setF({ ...f, presion: e.target.value })}>
        <option value="BAJA">Presión baja</option>
        <option value="NORMAL">Presión normal</option>
        <option value="ALTA">Presión alta</option>
      </select>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {check("senalizacion", "Señalización OK")}
        {check("chapa_baliza", "Chapa/baliza OK")}
        {check("accesible", "Accesible")}
      </div>
      <input className="input min-h-[44px]" placeholder="Ubicación actual (opcional)" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Nuevo venc. carga<input className="input min-h-[44px]" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label>
        <label className="text-xs">Nuevo venc. PH<input className="input min-h-[44px]" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label>
      </div>
      <textarea className="input" placeholder="Observaciones" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn min-h-[44px] w-full sm:w-auto">Guardar control</button>
    </form>
  );
}

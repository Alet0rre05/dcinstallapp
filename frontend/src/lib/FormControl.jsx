import { useRef, useState } from "react";
import { api } from "./api.js";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { vibrar } from "./haptico.js";

function prepararFoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function capturarGps() {
  try {
    if (Capacitor.isNativePlatform()) {
      let permiso = await Geolocation.checkPermissions();
      if (permiso.location !== "granted") permiso = await Geolocation.requestPermissions();
      if (permiso.location !== "granted") return { gps_latitud: null, gps_longitud: null };
      const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
      return { gps_latitud: p.coords.latitude.toFixed(6), gps_longitud: p.coords.longitude.toFixed(6) };
    }
    return await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ gps_latitud: null, gps_longitud: null });
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ gps_latitud: p.coords.latitude.toFixed(6), gps_longitud: p.coords.longitude.toFixed(6) }),
        () => resolve({ gps_latitud: null, gps_longitud: null }),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    });
  } catch { return { gps_latitud: null, gps_longitud: null }; }
}
/** Control inmutable con evidencias. Los envíos sin red quedan en la cola local. */
export function FormControl({ matafuego, onDone }) {
  const [f, setF] = useState({ presion: "NORMAL", precinto: true, senalizacion: true, chapa_baliza: true, accesible: true, observaciones: "", ubicacion: "", vencimiento_carga: "", vencimiento_ph: "" });
  const [foto, setFoto] = useState("");
  const [firmaOk, setFirmaOk] = useState(false);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const canvasRef = useRef(null);
  const pointer = useRef(null);

  const mesesBloqueo = matafuego.control_bloqueo_meses || 6;
  const limite = new Date();
  const diaLimite = limite.getDate();
  limite.setDate(1);
  limite.setMonth(limite.getMonth() - mesesBloqueo);
  limite.setDate(Math.min(diaLimite, new Date(limite.getFullYear(), limite.getMonth() + 1, 0).getDate()));
  const bloqueado = [matafuego.vencimiento_carga, matafuego.vencimiento_ph].some((v) => v && new Date(`${v}T00:00:00`) < limite);

  function coords(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvasRef.current.width / r.width, y: (e.clientY - r.top) * canvasRef.current.height / r.height };
  }
  function iniciarFirma(e) {
    const c = canvasRef.current; c.setPointerCapture(e.pointerId); pointer.current = e.pointerId;
    const p = coords(e); const ctx = c.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }
  function dibujarFirma(e) {
    if (pointer.current !== e.pointerId) return;
    const p = coords(e); const ctx = canvasRef.current.getContext("2d"); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#17324d"; ctx.lineTo(p.x, p.y); ctx.stroke(); setFirmaOk(true);
  }
  function limpiarFirma() { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setFirmaOk(false); }

  const enviar = async (e) => {
    e.preventDefault(); setError("");
    if (bloqueado) { setError("Control rechazado: un vencimiento supera el límite configurado."); return; }
    if (!foto) { setError("Adjuntá una foto del matafuego para guardar el control."); return; }
    if (!firmaOk) { setError("Solicitá la firma del operario en el recuadro."); return; }
    setGuardando(true);
    try {
      const gps = await capturarGps();
      const body = { ...f, matafuego: matafuego.id, foto_data: foto, firma_data: canvasRef.current.toDataURL("image/png"), idempotency_key: crypto.randomUUID(), ...gps };
      ["vencimiento_carga", "vencimiento_ph"].forEach((k) => !body[k] && delete body[k]);
      const result = await api("/controles/", { method: "POST", body });
      vibrar(40);
      onDone({ offline_pending: !!result?.offline_pending });
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const check = (k, label) => <label className="flex min-h-[44px] items-center gap-3 text-base"><input type="checkbox" className="h-5 w-5" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} /> {label}</label>;

  return <form onSubmit={enviar} className="mt-3 space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
    <p className="text-sm font-semibold">Nuevo control · foto, firma y GPS cuando está disponible</p>
    {bloqueado && <p role="alert" className="rounded bg-red-100 p-2 text-sm font-semibold text-red-800">No se puede marcar controlado: carga o PH vencida más allá del límite configurado.</p>}
    <select className="input min-h-[44px]" value={f.presion} onChange={(e) => setF({ ...f, presion: e.target.value })}><option value="BAJA">Presión baja</option><option value="NORMAL">Presión normal</option><option value="ALTA">Presión alta</option></select>
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{check("precinto", "Precinto OK")}{check("senalizacion", "Señalización OK")}{check("chapa_baliza", "Chapa/baliza OK")}{check("accesible", "Accesible")}</div>
    <label className="block text-sm font-semibold">Foto del matafuego<input className="input mt-1" type="file" accept="image/*" capture="environment" required onChange={async (e) => { try { setFoto(await prepararFoto(e.target.files?.[0])); } catch { setError("No pudimos leer la foto."); } }} /></label>
    {foto && <img src={foto} alt="Vista previa del matafuego" className="max-h-48 rounded border object-contain" />}
    <div><div className="mb-1 flex items-center justify-between"><label className="text-sm font-semibold">Firma del operario (obligatoria)</label><button type="button" className="link" onClick={limpiarFirma}>Borrar firma</button></div><canvas ref={canvasRef} width="720" height="180" className="h-36 w-full touch-none rounded border-2 border-slate-300 bg-white" onPointerDown={iniciarFirma} onPointerMove={dibujarFirma} onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }} aria-label="Área para firmar" /></div>
    <p className="text-xs text-slate-600">La ubicación GPS se guarda como evidencia si el dispositivo autoriza el acceso. El control de zona requiere coordenadas configuradas para cada sede.</p>
    <input className="input min-h-[44px]" placeholder="Ubicación actual (opcional)" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
    <div className="grid grid-cols-2 gap-2"><label className="text-xs">Nuevo venc. carga<input className="input min-h-[44px]" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label><label className="text-xs">Nuevo venc. PH<input className="input min-h-[44px]" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label></div>
    <textarea className="input" placeholder="Observaciones" value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={guardando || bloqueado} className="btn min-h-[44px] w-full disabled:opacity-50 sm:w-auto">{guardando ? "Guardando…" : "Guardar control"}</button>
  </form>;
}




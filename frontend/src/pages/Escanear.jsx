import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint, CapacitorBarcodeScannerCameraDirection } from "@capacitor/barcode-scanner";
import { api } from "../lib/api.js";
import { cacheRead } from "../lib/offline.js";

export default function Escanear() {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const navegar = useNavigate();
  async function resolver(valor) {
    const valorLimpio = String(valor || "").trim();
    const urlToken = valorLimpio.match(/\/qr\/([0-9a-f-]{36})/i);
    const token = urlToken?.[1] || (/^[0-9a-f-]{36}$/i.test(valorLimpio) ? valorLimpio : null);
    if (token) { navegar(`/qr/${token}`); return; }
    let dataset = await cacheRead("/mobile/offline-dataset/").catch(() => null);
    if (!dataset && navigator.onLine) dataset = await api("/mobile/offline-dataset/");
    const equipo = dataset?.equipos?.find((x) => x.numero_serie.toLowerCase() === valorLimpio.toLowerCase() || String(x.token_qr).toLowerCase() === valorLimpio.toLowerCase());
    if (equipo) { navegar(`/qr/${equipo.token_qr}`); return; }
    throw new Error("No encontramos ese QR o código entre los equipos descargados.");
  }
  async function escanear() {
    setError(""); setOcupado(true);
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({ hint: CapacitorBarcodeScannerTypeHint.ALL, scanInstructions: "Apuntá al QR o código de barras del matafuego", cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK, scanButton: true });
      await resolver(result.ScanResult);
    } catch (e) { if (e?.message) setError(e.message); }
    finally { setOcupado(false); }
  }
  async function buscar(e) { e.preventDefault(); try { await resolver(codigo); } catch (err) { setError(err.message); } }
  return <section className="card mx-auto max-w-xl space-y-4">
    <div><h1 className="text-2xl font-bold">Escanear equipo</h1><p className="text-slate-600">Leé un QR o código de barras; los equipos descargados se reconocen sin internet.</p></div>
    <button className="btn min-h-[52px] w-full" onClick={escanear} disabled={ocupado}>{ocupado ? "Abriendo cámara…" : "Abrir cámara"}</button>
    <form className="space-y-2" onSubmit={buscar}><label className="font-semibold">O ingresá el código manualmente<input className="input mt-1" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" /></label><button className="btn-sec min-h-[44px] w-full">Buscar</button></form>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
  </section>;
}


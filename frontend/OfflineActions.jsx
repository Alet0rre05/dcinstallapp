import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "./api.js";
import { pendientes, syncPendingControls } from "./offline.js";

export default function OfflineActions() {
  const [online, setOnline] = useState(navigator.onLine);
  const [count, setCount] = useState(0);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const refrescar = useCallback(async () => setCount((await pendientes()).length), []);
  const sincronizar = useCallback(async (silencioso = false) => {
    if (!navigator.onLine) { setMessage("Sin conexión: los controles quedan guardados en el teléfono."); return; }
    setWorking(true);
    try {
      const result = await syncPendingControls((body) => api("/controles/", { method: "POST", body }));
      await refrescar();
      if (!silencioso && result.synced) setMessage(`Se sincronizaron ${result.synced} control${result.synced === 1 ? "" : "es"}.`);
    } finally { setWorking(false); }
  }, [refrescar]);
  const descargar = useCallback(async () => {
    setWorking(true); setMessage("");
    try {
      const clientes = await api("/clientes/resumen/");
      const conjunto = await api("/mobile/offline-dataset/");
      for (const c of clientes) {
        for (let page = 1; ; page++) {
          const data = await api(`/matafuegos/?cliente=${c.id}&page_size=500&page=${page}`);
          if (!data.next) break;
        }
      }
      localStorage.setItem("dci_offline_downloaded_at", new Date().toISOString());
      setMessage(`${conjunto.equipos.length} equipos de ${conjunto.clientes.length} clientes listos para usar offline.`);
      await refrescar();
    } catch (e) { setMessage(e.message || "No se pudieron descargar los datos."); }
    finally { setWorking(false); }
  }, [refrescar]);
  useEffect(() => {
    const onlineOn = () => { setOnline(true); sincronizar(true); };
    const onlineOff = () => setOnline(false);
    const queueOn = () => refrescar();
    window.addEventListener("online", onlineOn); window.addEventListener("offline", onlineOff);
    window.addEventListener("dci-sync-updated", queueOn); refrescar(); if (navigator.onLine) sincronizar(true);
    return () => { window.removeEventListener("online", onlineOn); window.removeEventListener("offline", onlineOff); window.removeEventListener("dci-sync-updated", queueOn); };
  }, [refrescar, sincronizar]);
  return <aside className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/90 p-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/90" aria-label="Herramientas offline">
    <span className={`font-semibold ${online ? "text-emerald-700" : "text-amber-800"}`}>{online ? "● Conectado" : "● Sin conexión"}</span>
    <span>{count} pendiente{count === 1 ? "" : "s"}</span>
    <Link className="btn-sec min-h-[40px] px-3" to="/escanear">Escanear</Link>
    <button type="button" className="btn-sec min-h-[40px] px-3" disabled={working} onClick={descargar}>{working ? "Procesando…" : "Preparar offline"}</button>
    <button type="button" className="btn min-h-[40px] px-3" disabled={!online || !count || working} onClick={() => sincronizar(false)}>{working ? "Sincronizando…" : "Sincronizar"}</button>
    {message && <span role="status" className="w-full text-slate-600">{message}</span>}
  </aside>;
}


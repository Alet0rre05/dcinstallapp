import { useState } from "react";
import { Item, Panel } from "./animado.jsx";
import EstadoBadge from "./EstadoBadge.jsx";
import RevisionBadge from "./RevisionBadge.jsx";
import { FormControl } from "./FormControl.jsx";
import QRMatafuego, { urlQR } from "./QRMatafuego.jsx";
import { fechaHora } from "./fmt.js";
import { api } from "./api.js";

const fecha = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

/**
 * Ficha completa de un matafuego: estado, vencimientos, problemas, QR y formulario "Controlar".
 *  - onControlado(): se llama al guardar un control (el padre refresca los datos)
 *  - onBaja(m) / onRestaurar(m): acciones de staff; si no se pasan, no se muestran
 */
export default function FichaMatafuego({ m, esStaff, esCampo, onBaja, onRestaurar, onControlado }) {
  const [verQR, setVerQR] = useState(false);
  const [controlando, setControlando] = useState(false);
  const [controles, setControles] = useState(null);
  const [evidencia, setEvidencia] = useState({});
  const [errorHistorial, setErrorHistorial] = useState("");

  async function cargarControles() {
    try { setControles(await api(`/matafuegos/${m.id}/controles/`)); setErrorHistorial(""); }
    catch (e) { setErrorHistorial(e.message); }
  }
  async function verEvidencia(id) {
    try { setEvidencia({ ...evidencia, [id]: await api(`/controles/${id}/evidencia/`) }); }
    catch (e) { setErrorHistorial(e.message); }
  }

  return (
    <Item as="section" className="card space-y-3" aria-label={`Ficha del matafuego ${m.numero_serie}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto min-w-0">
          <h2 className="text-2xl font-bold text-ink">
            N° {m.numero_serie}{" "}
            {!m.activo && <span className="rounded bg-slate-200 px-1 text-xs font-normal">BAJA</span>}
          </h2>
          <p className="text-base text-slate-600">{m.clase || "—"} · {m.ubicacion || "Sin ubicación"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RevisionBadge revisado={m.revisado_mes} />
          <EstadoBadge estado={m.estado_color} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-y-1 text-base">
        <dt className="text-slate-500">Venc. carga</dt><dd className="font-medium">{fecha(m.vencimiento_carga)}</dd>
        <dt className="text-slate-500">Venc. PH</dt><dd>{fecha(m.vencimiento_ph)}</dd>
        <dt className="text-slate-500">Último control</dt><dd>{fechaHora(m.ultimo_control)}</dd>
        {(m.marca || m.anio_fabricacion || m.agente || m.capacidad) && (
          <>
            <dt className="text-slate-500">Marca / año</dt><dd>{[m.marca, m.anio_fabricacion].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-slate-500">Agente / capacidad</dt><dd>{[m.agente, m.capacidad].filter(Boolean).join(" · ") || "—"}</dd>
          </>
        )}
      </dl>

      {m.problemas.length > 0 && (
        <p className="text-base font-semibold text-red-700">⚠ {m.problemas.join(" · ")}</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {esCampo && m.activo && (
          <button className="btn min-h-[44px]" onClick={() => setControlando(!controlando)}>Controlar</button>
        )}
        <button className="btn-sec min-h-[44px]" onClick={() => setVerQR(!verQR)}>{verQR ? "Ocultar QR" : "Ver QR"}</button>
        {esStaff && m.activo && onBaja && (
          <button className="btn-sec min-h-[44px] text-red-700" onClick={() => onBaja(m)}>Dar de baja</button>
        )}
        {esStaff && !m.activo && onRestaurar && (
          <button className="btn-sec min-h-[44px]" onClick={() => onRestaurar(m)}>Restaurar</button>
        )}
      </div>

      {verQR && (
        <Panel className="flex flex-col items-center gap-1">
          <QRMatafuego token={m.token_qr} />
          <a className="link break-all text-sm" href={urlQR(m.token_qr)} target="_blank" rel="noreferrer">{urlQR(m.token_qr)}</a>
        </Panel>
      )}
      <div>
        <button className="link min-h-[44px]" onClick={() => controles === null ? cargarControles() : setControles(null)}>{controles === null ? "Ver historial de controles" : "Ocultar historial"}</button>
        {errorHistorial && <p role="alert" className="text-sm text-red-700">{errorHistorial}</p>}
        {controles && <ul className="space-y-2">{controles.map((c) => <li key={c.id} className="rounded border border-slate-200 p-3 text-sm"><p className="font-semibold">{fechaHora(c.fecha)} · {c.usuario_nombre || "Operario"}</p><p>{c.presion} · {c.observaciones || "Sin observaciones"}</p>{(c.foto_adjunto || c.firma_capturada || c.gps_latitud) && <button className="link min-h-[40px]" onClick={() => verEvidencia(c.id)}>Ver foto, firma y GPS</button>}{evidencia[c.id] && <div className="mt-2 grid gap-2">{evidencia[c.id].foto_data && <img src={evidencia[c.id].foto_data} alt={`Foto de control ${c.id}`} className="max-h-64 rounded object-contain" />}{evidencia[c.id].firma_data && <img src={evidencia[c.id].firma_data} alt={`Firma del operario en control ${c.id}`} className="max-h-32 rounded border bg-white object-contain" />}{evidencia[c.id].gps_latitud && <p>GPS: {evidencia[c.id].gps_latitud}, {evidencia[c.id].gps_longitud}</p>}</div>}</li>)}</ul>}
      </div>
      {controlando && (
        <Panel><FormControl matafuego={m} onDone={() => { setControlando(false); onControlado?.(); }} /></Panel>
      )}
    </Item>
  );
}


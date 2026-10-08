import { useState } from "react";
import EstadoBadge from "./EstadoBadge.jsx";
import { FormControl } from "./FormControl.jsx";
import QRMatafuego, { urlQR } from "./QRMatafuego.jsx";
import { fechaHora } from "./fmt.js";

const fecha = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

/**
 * Ficha completa de un matafuego: estado, vencimientos, problemas, QR y formulario "Controlar".
 *  - onControlado(): se llama al guardar un control (el padre refresca los datos)
 *  - onBaja(m) / onRestaurar(m): acciones de staff; si no se pasan, no se muestran
 */
export default function FichaMatafuego({ m, esStaff, esCampo, onBaja, onRestaurar, onControlado }) {
  const [verQR, setVerQR] = useState(false);
  const [controlando, setControlando] = useState(false);

  return (
    <section className="card space-y-3" aria-label={`Ficha del matafuego ${m.numero_serie}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-bold">
            N° {m.numero_serie}{" "}
            {!m.activo && <span className="rounded bg-slate-200 px-1 text-xs font-normal">BAJA</span>}
          </h2>
          <p className="text-base text-slate-600">{m.clase || "—"} · {m.ubicacion || "Sin ubicación"}</p>
        </div>
        <EstadoBadge estado={m.estado_color} />
      </div>

      <dl className="grid grid-cols-2 gap-y-1 text-base">
        <dt className="text-slate-500">Venc. carga</dt><dd>{fecha(m.vencimiento_carga)}</dd>
        <dt className="text-slate-500">Venc. PH</dt><dd>{fecha(m.vencimiento_ph)}</dd>
        <dt className="text-slate-500">Último control</dt><dd>{fechaHora(m.ultimo_control)}</dd>
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
        <div className="flex flex-col items-center gap-1">
          <QRMatafuego token={m.token_qr} />
          <a className="break-all text-xs text-brand underline" href={urlQR(m.token_qr)} target="_blank" rel="noreferrer">{urlQR(m.token_qr)}</a>
        </div>
      )}
      {controlando && (
        <FormControl matafuego={m} onDone={() => { setControlando(false); onControlado?.(); }} />
      )}
    </section>
  );
}

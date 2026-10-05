import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import EstadoBadge from "../lib/EstadoBadge.jsx";
import { fechaHora } from "../lib/fmt.js";
import { FormControl } from "./Matafuegos.jsx";

const fecha = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-AR") : "—");

function FormEditar({ m, onDone }) {
  const [f, setF] = useState({
    clase: m.clase || "", ubicacion: m.ubicacion || "",
    vencimiento_carga: m.vencimiento_carga || "", vencimiento_ph: m.vencimiento_ph || "",
  });
  const [error, setError] = useState("");
  const enviar = async (e) => {
    e.preventDefault();
    const body = { ...f, vencimiento_carga: f.vencimiento_carga || null, vencimiento_ph: f.vencimiento_ph || null };
    try {
      await api(`/matafuegos/${m.id}/`, { method: "PATCH", body });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form onSubmit={enviar} className="mt-3 space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold">Editar ficha</p>
      <input className="input" placeholder="Clase" value={f.clase} onChange={(e) => setF({ ...f, clase: e.target.value })} />
      <input className="input" placeholder="Ubicación" value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">Venc. carga<input className="input" type="date" value={f.vencimiento_carga} onChange={(e) => setF({ ...f, vencimiento_carga: e.target.value })} /></label>
        <label className="text-xs">Venc. PH<input className="input" type="date" value={f.vencimiento_ph} onChange={(e) => setF({ ...f, vencimiento_ph: e.target.value })} /></label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn">Guardar cambios</button>
    </form>
  );
}

/**
 * /qr/<uuid>
 *  - Sin sesión / sin rol / cliente no asignado -> vista pública reducida.
 *  - Con rol y cliente asignado -> misma planilla con botones según permisos
 *    (Nuevo control: ADMIN/OFICINA/OPERARIO · Editar ficha: ADMIN/OFICINA).
 */
export default function ScanQR() {
  const { token } = useParams();
  const { user, loading, tieneRol, esStaff, esCampo } = useAuth();
  const [pub, setPub] = useState(null);
  const [priv, setPriv] = useState(null);
  const [error, setError] = useState("");
  const [modo, setModo] = useState(null); // "control" | "editar"

  const cargar = useCallback(async () => {
    try {
      setPub(await api(`/public/qr/${token}/`, { auth: false }));
    } catch {
      setError("Matafuego no encontrado o dado de baja.");
      return;
    }
    if (tieneRol) {
      try {
        setPriv(await api(`/matafuegos/qr/${token}/`));
      } catch {
        setPriv(null); // sin permisos sobre este cliente: se queda la vista pública
      }
    } else {
      setPriv(null);
    }
  }, [token, tieneRol]);

  useEffect(() => { if (!loading) cargar(); }, [loading, cargar]);

  if (error) return <p className="card mt-6 text-red-600">{error}</p>;
  if (!pub) return <p className="p-6">Cargando…</p>;

  const m = priv || pub;
  const hecho = () => { setModo(null); cargar(); };

  return (
    <div className="card mx-auto mt-6 max-w-md space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Matafuego {m.numero_serie}</h1>
        <EstadoBadge estado={m.estado_color} />
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-slate-500">Cliente</dt><dd>{priv ? priv.cliente_nombre : pub.cliente}</dd>
        <dt className="text-slate-500">Clase</dt><dd>{m.clase || "—"}</dd>
        <dt className="text-slate-500">Ubicación</dt><dd>{m.ubicacion || "—"}</dd>
        <dt className="text-slate-500">Venc. carga</dt><dd>{fecha(m.vencimiento_carga)}</dd>
        <dt className="text-slate-500">Venc. PH</dt><dd>{fecha(m.vencimiento_ph)}</dd>
        <dt className="text-slate-500">Último control</dt><dd>{fechaHora(m.ultimo_control)}</dd>
      </dl>
      {priv?.problemas?.length > 0 && <p className="text-xs text-red-700">⚠ {priv.problemas.join(" · ")}</p>}

      {priv && esCampo && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button className="btn" onClick={() => setModo(modo === "control" ? null : "control")}>Nuevo control</button>
          {esStaff && <button className="btn-sec" onClick={() => setModo(modo === "editar" ? null : "editar")}>Editar ficha</button>}
        </div>
      )}
      {priv && modo === "control" && <FormControl matafuego={priv} onDone={hecho} />}
      {priv && modo === "editar" && esStaff && <FormEditar m={priv} onDone={hecho} />}

      {!user && (
        <p className="pt-2 text-xs text-slate-500">
          ¿Sos del equipo? <Link className="text-brand underline" to="/login" state={{ volverA: `/qr/${token}` }}>Ingresá</Link> para controlar o editar.
        </p>
      )}
      {user && !tieneRol && (
        <p className="pt-2 text-xs text-slate-500">Tu cuenta no tiene rol asignado, por eso ves solo la información pública.</p>
      )}
    </div>
  );
}

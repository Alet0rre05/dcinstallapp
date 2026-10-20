import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import EstadoVacio from "../lib/EstadoVacio.jsx";
import { ListaSkeleton } from "../lib/Skeleton.jsx";
import { vibrar } from "../lib/haptico.js";

function Chat({ ticket, onChange }) {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const data = await api(`/tickets/${ticket.id}/mensajes/`);
    setMensajes(data.results);
  }, [ticket.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(`/tickets/${ticket.id}/mensajes/`, { method: "POST", body: { texto } });
      setTexto("");
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const cambiarEstado = async (accion) => {
    await api(`/tickets/${ticket.id}/${accion}/`, { method: "POST" });
    if (accion === "cerrar") vibrar([40, 30, 40]); // confirmación háptica al completar el ticket
    onChange();
  };

  // Remito en PDF (solo tickets cerrados): se descarga como archivo
  const [bajando, setBajando] = useState(false);
  const descargarRemito = async () => {
    setBajando(true);
    setError("");
    try {
      const blob = await api(`/tickets/${ticket.id}/remito/`, { blob: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remito-R-${String(ticket.id).padStart(6, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      vibrar(40);
    } catch (err) {
      setError(err.message || "No pudimos generar el remito. Probá de nuevo.");
    } finally {
      setBajando(false);
    }
  };

  const cerrado = ticket.estado === "CERRADO";

  return (
    <div className="mt-3 border-t pt-3">
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {mensajes.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded px-3 py-2 text-sm ${m.es_soporte ? "bg-slate-100" : "ml-auto bg-red-50"}`}>
            <p className="text-xs text-slate-500">{m.autor_nombre}{m.es_soporte ? " (soporte)" : ""} · {new Date(m.fecha).toLocaleString("es-AR")}</p>
            <p className="whitespace-pre-wrap">{m.texto}</p>
          </div>
        ))}
        {mensajes.length === 0 && <p className="text-sm text-slate-500">Todavía no hay mensajes.</p>}
      </div>
      {!cerrado && (
        <form onSubmit={enviar} className="mt-3 flex gap-2">
          <textarea className="input" rows={2} maxLength={3000} placeholder="Escribí tu mensaje…" value={texto} onChange={(e) => setTexto(e.target.value)} required />
          <button className="btn self-end">Enviar</button>
        </form>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2">
        {cerrado ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-acento" onClick={descargarRemito} disabled={bajando}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
              </svg>
              {bajando ? "Generando remito…" : "Descargar remito (PDF)"}
            </button>
            <button className="btn-sec min-h-[44px]" onClick={() => cambiarEstado("reabrir")}>Reabrir</button>
          </div>
        ) : (
          <button className="btn-sec min-h-[44px]" onClick={() => cambiarEstado("cerrar")}>Cerrar ticket</button>
        )}
        <span className="ml-3 text-xs text-slate-500">{user.rol === "OPERARIO" ? "Máx. 3 mensajes seguidos" : "Máx. 10 mensajes seguidos"}</span>
      </div>
    </div>
  );
}

export default function Tickets() {
  const { user } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [data, setData] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [nuevo, setNuevo] = useState({ titulo: "", cliente: user.clientes[0]?.id || "", mensaje: "" });
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setData(await api(`/tickets/?page=${pagina}`));
  }, [pagina]);

  useEffect(() => { cargar().catch((e) => setError(e.message)); }, [cargar]);

  const crear = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = { ...nuevo };
      if (!body.mensaje) delete body.mensaje;
      if (!body.cliente) delete body.cliente;
      await api("/tickets/", { method: "POST", body });
      setNuevo({ ...nuevo, titulo: "", mensaje: "" });
      setPagina(1);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const total = data ? Math.max(1, Math.ceil(data.count / 5)) : 1;

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Soporte</h1>
      <form onSubmit={crear} className="card mb-4 space-y-2">
        <input className="input" maxLength={32} placeholder="Título (máx. 32 caracteres)" value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} required />
        {user.clientes.length > 1 && (
          <select className="input" value={nuevo.cliente} onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })}>
            {user.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
        <textarea className="input" maxLength={3000} placeholder="Primer mensaje (opcional)" value={nuevo.mensaje} onChange={(e) => setNuevo({ ...nuevo, mensaje: e.target.value })} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn">Crear ticket</button>
      </form>

      {!data ? <ListaSkeleton filas={3} alto="h-14" /> : (
        <>
          <ul className="space-y-3">
            {data.results.map((t) => (
              <li key={t.id} className="card">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setAbierto(abierto === t.id ? null : t.id)}>
                  <span className="mr-auto font-semibold">#{t.id} {t.titulo}</span>
                  <span className="text-xs text-slate-500">{t.cliente_nombre}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs text-white ${t.estado === "ABIERTO" ? "bg-green-600" : "bg-slate-500"}`}>{t.estado}</span>
                </button>
                {abierto === t.id && <Chat ticket={t} onChange={cargar} />}
              </li>
            ))}
            {data.results.length === 0 && <EstadoVacio titulo="No hay tickets">Cuando abras un pedido de soporte lo vas a ver acá.</EstadoVacio>}
          </ul>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button className="btn-sec" disabled={!data.previous} onClick={() => setPagina(pagina - 1)}>Anterior</button>
            <span>Página {pagina} de {total}</span>
            <button className="btn-sec" disabled={!data.next} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  );
}

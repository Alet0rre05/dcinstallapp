import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { ListaSkeleton } from "../lib/Skeleton.jsx";
import { useAuth } from "../lib/auth.jsx";
import { rolLabel } from "../lib/fmt.js";

const ROLES = ["ADMIN", "OFICINA", "OPERARIO"];

function AsignarForm({ clientes, onDone }) {
  const [f, setF] = useState({ email: "", rol: "OPERARIO", clientes: [] });
  const [msg, setMsg] = useState({ ok: false, text: "" });

  const toggle = (id) =>
    setF((p) => ({ ...p, clientes: p.clientes.includes(id) ? p.clientes.filter((c) => c !== id) : [...p.clientes, id] }));

  const enviar = async (e) => {
    e.preventDefault();
    try {
      const u = await api("/equipo/asignar-rol/", { method: "POST", body: f });
      setMsg({ ok: true, text: `${u.email} ahora es ${u.rol}.` });
      setF({ ...f, email: "" });
      onDone();
    } catch (err) {
      // 404: el email no está registrado -> no se crea la cuenta
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <form onSubmit={enviar} className="card mb-4 space-y-2">
      <p className="font-semibold">Asignar rol por email</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="input sm:col-span-2" type="email" placeholder="email@ejemplo.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <select className="input" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {clientes.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-slate-500">Clientes asignados:</span>
          {clientes.map((c) => (
            <label key={c.id} className="flex items-center gap-1">
              <input type="checkbox" checked={f.clientes.includes(c.id)} onChange={() => toggle(c.id)} /> {c.nombre}
            </label>
          ))}
        </div>
      )}
      {msg.text && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button className="btn">Asignar rol</button>
    </form>
  );
}

function ClientesEditor({ usuario, clientes, onDone }) {
  const [sel, setSel] = useState(usuario.clientes.map((c) => c.id));
  const toggle = (id) => setSel((p) => (p.includes(id) ? p.filter((c) => c !== id) : [...p, id]));
  const guardar = async () => {
    await api("/equipo/asignar-clientes/", { method: "POST", body: { user_id: usuario.id, clientes: sel } });
    onDone();
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded bg-slate-50 p-2 text-sm">
      {clientes.map((c) => (
        <label key={c.id} className="flex items-center gap-1">
          <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} /> {c.nombre}
        </label>
      ))}
      {clientes.length === 0 && <span className="text-slate-500">Todavía no hay clientes creados.</span>}
      <button className="btn-sec" onClick={guardar}>Guardar clientes</button>
    </div>
  );
}

export default function Equipo() {
  const { user: yo } = useAuth();
  const [usuarios, setUsuarios] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [u, c] = await Promise.all([
        api(`/equipo/usuarios/?q=${encodeURIComponent(q)}`),
        api("/clientes/"),
      ]);
      setUsuarios(u.results);
      setClientes(c.results);
      setEditando(null);
    } catch (err) {
      setError(err.message);
    }
  }, [q]);

  useEffect(() => { cargar(); }, [cargar]);

  const revocar = async (u) => {
    if (!confirm(`¿Revocar el rol ${u.rol} de ${u.email}? La cuenta no se elimina; pasa a PÚBLICO y pierde todos los permisos.`)) return;
    try {
      await api("/equipo/revocar-rol/", { method: "POST", body: { user_id: u.id } });
      cargar();
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <AsignarForm clientes={clientes} onDone={cargar} />
      <input className="input mb-3" placeholder="Buscar por nombre, usuario o email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!usuarios ? <ListaSkeleton filas={3} alto="h-16" /> : (
        <ul className="space-y-2">
          {usuarios.map((u) => (
            <li key={u.id} className="card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <p className="font-semibold">{u.nombre}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  {u.rol && <p className="text-xs text-slate-500">Clientes: {u.clientes.map((c) => c.nombre).join(", ") || "ninguno"}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.rol ? "bg-brand-dark text-white" : "bg-slate-200"}`}>{rolLabel(u.rol)}</span>
                {u.rol && !u.is_superuser && (
                  <button className="btn-sec" onClick={() => setEditando(editando === u.id ? null : u.id)}>Clientes</button>
                )}
                {u.rol && !u.is_superuser && u.id !== yo.id && (
                  <button className="btn-sec font-bold text-red-700" title="Revocar rol" aria-label={`Revocar rol de ${u.email}`} onClick={() => revocar(u)}>✕</button>
                )}
              </div>
              {editando === u.id && <ClientesEditor usuario={u} clientes={clientes} onDone={cargar} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

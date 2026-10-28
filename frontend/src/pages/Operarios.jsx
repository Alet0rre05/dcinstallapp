import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import EstadoVacio from "../lib/EstadoVacio.jsx";
import { ListaSkeleton } from "../lib/Skeleton.jsx";
import { useAuth } from "../lib/auth.jsx";

/** Editor de clientes de UN operario. Solo muestra los clientes del alcance de la oficina (`clientes`). */
function ClientesEditor({ operario, clientes, onDone }) {
  const [sel, setSel] = useState(operario.clientes.map((c) => c.id));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const toggle = (id) => setSel((p) => (p.includes(id) ? p.filter((c) => c !== id) : [...p, id]));

  const guardar = async () => {
    setError("");
    setGuardando(true);
    try {
      // El servidor conserva los clientes del operario que están fuera de tu cartera.
      await api("/equipo/operarios/asignar-clientes/", {
        method: "POST",
        body: { user_id: operario.id, clientes: sel },
      });
      onDone();
    } catch (err) {
      setError(err.message || "No pudimos guardar los clientes.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded bg-slate-50 p-3 text-sm">
      {clientes.length === 0 ? (
        <p className="text-slate-600">No tenés clientes asignados, así que no hay nada para asignar.</p>
      ) : (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
          <legend className="mb-1 font-semibold">Clientes de tu cartera para {operario.nombre}</legend>
          {clientes.map((c) => (
            <label key={c.id} className="flex min-h-[44px] items-center gap-2 text-base">
              <input type="checkbox" className="h-5 w-5" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.nombre}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-xs text-slate-500">Los clientes de otras oficinas no se modifican.</p>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button className="btn-sec min-h-[44px]" onClick={guardar} disabled={guardando || clientes.length === 0}>
        {guardando ? "Guardando…" : "Guardar clientes"}
      </button>
    </div>
  );
}

/** Pestaña "Operarios" del Panel (solo OFICINA): asigna SUS clientes a los operarios. */
export default function Operarios() {
  const { user } = useAuth();
  const [operarios, setOperarios] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const [o, c] = await Promise.all([
        api(`/equipo/operarios/?q=${encodeURIComponent(q)}`),
        api("/clientes/"), // ya devuelve solo los clientes asignados a la oficina
      ]);
      setOperarios(o.results);
      setClientes(c.results);
      setEditando(null);
    } catch (err) {
      setError(err.message || "No pudimos cargar los operarios.");
    }
  }, [q]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Operarios</h2>
        <p className="text-base text-slate-600">
          Asigná a cada operario los clientes de tu cartera ({user.clientes.length}). Los operarios solo ven los clientes que tienen asignados.
        </p>
      </div>

      <input className="input" placeholder="Buscar por nombre, usuario o email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar operario" />

      {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      {!operarios && !error && <ListaSkeleton filas={3} alto="h-16" />}

      {operarios && operarios.length === 0 && (
        <EstadoVacio titulo="No hay operarios todavía">
          Cuando un administrador les asigne el rol de operario, aparecen acá. Si ya te registraron, pedile a un administrador que los habilite.
        </EstadoVacio>
      )}

      {operarios && operarios.length > 0 && (
        <ul className="space-y-2">
          {operarios.map((o) => (
            <li key={o.id} className="card">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                  <p className="font-semibold">{o.nombre}</p>
                  <p className="text-sm text-slate-500">{o.email}</p>
                  <p className="text-xs text-slate-500">
                    Clientes en tu cartera: {o.clientes.map((c) => c.nombre).join(", ") || "ninguno"}
                  </p>
                </div>
                <button
                  className="btn-sec min-h-[44px]"
                  aria-expanded={editando === o.id}
                  onClick={() => setEditando(editando === o.id ? null : o.id)}
                >
                  Clientes
                </button>
              </div>
              {editando === o.id && <ClientesEditor operario={o} clientes={clientes} onDone={cargar} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

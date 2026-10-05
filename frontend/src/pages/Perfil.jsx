import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Perfil() {
  const { user, recargar } = useAuth();
  const [f, setF] = useState({ first_name: user.first_name, email: user.email, new_password: "", current_password: "" });
  const [msg, setMsg] = useState({ ok: false, text: "" });

  const enviar = async (e) => {
    e.preventDefault();
    const body = { current_password: f.current_password, first_name: f.first_name, email: f.email };
    if (f.new_password) body.new_password = f.new_password;
    try {
      await api("/auth/me/", { method: "PATCH", body });
      await recargar();
      setF({ ...f, new_password: "", current_password: "" });
      setMsg({ ok: true, text: "Datos actualizados." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  };

  return (
    <form onSubmit={enviar} className="card max-w-md space-y-3">
      <h1 className="text-xl font-bold">Mi perfil</h1>
      <p className="text-sm text-slate-500">Rol: {user.rol} · Clientes: {user.clientes.map((c) => c.nombre).join(", ") || "ninguno asignado"}</p>
      <input className="input" placeholder="Nombre" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} />
      <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="input" type="password" placeholder="Nueva contraseña (opcional)" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} />
      <input className="input" type="password" placeholder="Contraseña actual (obligatoria)" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} required />
      {msg.text && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <button className="btn">Guardar cambios</button>
    </form>
  );
}

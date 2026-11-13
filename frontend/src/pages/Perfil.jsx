import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Perfil() {
  const { user, recargar } = useAuth();
  const [f, setF] = useState({ first_name: user.first_name, email: user.email, new_password: "", current_password: "" });
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const nombre = user.first_name || user.username;
  const palabras = nombre.trim().split(/\s+/);
  const iniciales = (palabras.length > 1 ? palabras[0][0] + palabras.at(-1)[0] : nombre.slice(0, 2)).toUpperCase();
  const largo = f.new_password.length >= 15;
  const sinTriples = !/(.)\1\1/.test(f.new_password);
  const passwordOk = !f.new_password || (largo && sinTriples);
  const actualizar = (e) => setF({ ...f, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    if (!passwordOk || guardando) return;
    setGuardando(true);
    setMsg(null);
    const { new_password, ...body } = f;
    if (new_password) body.new_password = new_password;
    try {
      await api("/auth/me/", { method: "PATCH", body });
      await recargar();
      setF({ ...f, current_password: "", new_password: "" });
      setVisible(false);
      setMsg({ ok: true, text: "Datos actualizados." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setGuardando(false);
    }
  }

  function campo(name, label, type, autoComplete, required = true) {
    return <label className="block space-y-1 text-sm font-semibold">{label}
      <input className="input" name={name} type={type} value={f[name]} onChange={actualizar}
        autoComplete={autoComplete} required={required} disabled={guardando} />
    </label>;
  }

  return <section className="dci-page-shell dci-feature-page dci-profile-page space-y-6">
    <header><p className="dci-eyebrow">Cuenta &amp; Seguridad</p><h1 className="dci-title">Mi perfil</h1>
      <p className="dci-subtitle">Consultá tus accesos y actualizá los datos que usás para ingresar.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <aside className="dci-glass-card space-y-4 lg:col-span-5">
        <div aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-2xl border border-cian/40 bg-noche text-xl font-bold text-cian shadow-glow-cian">{iniciales}</div>
        <div><h2 className="text-xl font-bold">{nombre}</h2><p className="break-all">{user.email}</p></div>
        <div className="flex flex-wrap gap-2"><span className="dci-status-badge !text-brand-dark dark:!text-cian">{user.rol}</span>
          {user.tenant_slug && <span className="rounded-full bg-cian/10 px-3 py-1 text-xs">{user.tenant_slug}</span>}</div>
        <div className="space-y-2 border-t border-slate-400/30 pt-4"><h3 className="font-semibold">Clientes asignados ({user.clientes.length})</h3>
          {user.clientes.length ? <ul className="flex flex-wrap gap-2">{user.clientes.map(c => <li className="rounded-full border border-slate-400/40 px-3 py-1 text-sm" key={c.id}>{c.nombre}</li>)}</ul>
            : <p>{user.global_access ? "Acceso global a los clientes de la plataforma." : "Sin clientes asignados."}</p>}</div>
      </aside>
      <form className="card space-y-6 p-6 lg:col-span-7" onSubmit={enviar}>
        <section className="space-y-3"><h2 className="text-lg font-bold">Datos personales</h2>
          <div className="grid gap-3 sm:grid-cols-2">{campo("first_name", "Nombre completo", "text", "name", false)}{campo("email", "Correo electrónico", "email", "email")}</div></section>
        <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Cambiar contraseña</h2><button className="link text-sm" type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar claves" : "Mostrar claves"}</button></div>
          {campo("new_password", "Nueva contraseña (opcional)", visible ? "text" : "password", "new-password", false)}
          {f.new_password && <ul aria-live="polite" className="rounded-xl border border-slate-400/30 p-3 text-sm">
            {[[largo, `Mínimo 15 caracteres (${f.new_password.length}/15)`], [sinTriples, "Sin caracteres repetidos 3 veces seguidas (ej. aaa)"]].map(([ok, label]) =>
              <li key={label.split(" (")[0]} className={ok ? "text-emerald-700 dark:text-emerald-300" : ""}>{ok ? "✓" : "○"} {label}</li>)}</ul>}</section>
        <div className="space-y-3 rounded-xl border border-cian/40 bg-cian/5 p-4">
          {campo("current_password", "Confirmá con tu contraseña actual", visible ? "text" : "password", "current-password")}
          {msg && <p role="alert" className={msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>{msg.text}</p>}
          <button className="btn" disabled={!passwordOk || guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></div>
      </form></div>
  </section>;
}

import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import Logo from "../lib/Logo.jsx";
import Turnstile from "../lib/Turnstile.jsx";

export default function Registro() {
  const { registro } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: "", username: "", email: "", password: "" });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t) => setToken(t), []);

  const enviar = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await registro({ ...f, turnstile_token: token });
      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const campo = (k, ph, type = "text") => (
    <input className="input min-h-[44px]" type={type} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required />
  );

  return (
    <div className="mx-auto mt-4 max-w-sm sm:mt-10">
    <Logo className="mx-auto mb-5 h-12 w-auto" />
    <form onSubmit={enviar} className="card space-y-3">
      <h1 className="text-2xl font-bold text-ink">Crear cuenta</h1>
      {campo("first_name", "Nombre")}
      {campo("username", "Usuario")}
      {campo("email", "Email", "email")}
      {campo("password", "Contraseña", "password")}
      <Turnstile onToken={onToken} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn min-h-[44px] w-full" disabled={busy || !token}>{busy ? "Creando…" : "Registrarme"}</button>
      <p className="text-sm text-slate-600">Tu cuenta se crea sin rol: no tendrá acceso al panel hasta que un administrador te asigne uno.</p>
      <p className="text-base">¿Ya tenés cuenta? <Link className="link" to="/login">Ingresá</Link></p>
    </form>
    </div>
  );
}

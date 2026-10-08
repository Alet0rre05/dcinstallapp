import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
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
    <input className="input" type={type} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required />
  );

  return (
    <form onSubmit={enviar} className="card mx-auto mt-10 max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Crear cuenta</h1>
      {campo("first_name", "Nombre")}
      {campo("username", "Usuario")}
      {campo("email", "Email", "email")}
      {campo("password", "Contraseña", "password")}
      <Turnstile onToken={onToken} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={busy || !token}>{busy ? "Creando…" : "Registrarme"}</button>
      <p className="text-xs text-slate-500">Tu cuenta se crea sin rol: no tendrá acceso al panel hasta que un administrador te asigne uno.</p>
      <p className="text-sm">¿Ya tenés cuenta? <Link className="text-brand underline" to="/login">Ingresá</Link></p>
    </form>
  );
}

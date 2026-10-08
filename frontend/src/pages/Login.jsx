import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import Logo from "../lib/Logo.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(f.username, f.password);
      nav(state?.volverA || "/");
    } catch (err) {
      setError(
        err.status === 403
          ? "Demasiados intentos fallidos. Tu IP fue bloqueada por 30 minutos."
          : "Usuario o contraseña incorrectos."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-4 max-w-sm sm:mt-10">
    <Logo className="mx-auto mb-5 h-12 w-auto" />
    <form onSubmit={enviar} className="card space-y-3">
      <h1 className="text-2xl font-bold text-ink">Ingresar</h1>
      <input className="input min-h-[44px]" autoComplete="username" placeholder="Usuario" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
      <input className="input min-h-[44px]" autoComplete="current-password" type="password" placeholder="Contraseña" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn min-h-[44px] w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      <p className="text-base">¿No tenés cuenta? <Link className="link" to="/registro">Registrate</Link></p>
    </form>
    </div>
  );
}

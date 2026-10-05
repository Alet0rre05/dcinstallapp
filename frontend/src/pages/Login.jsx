import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

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
    <form onSubmit={enviar} className="card mx-auto mt-10 max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Ingresar</h1>
      <input className="input" placeholder="Usuario" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
      <input className="input" type="password" placeholder="Contraseña" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
      <p className="text-sm">¿No tenés cuenta? <Link className="text-brand underline" to="/registro">Registrate</Link></p>
    </form>
  );
}

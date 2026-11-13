import { useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Arrepentimiento() {
  const { user } = useAuth();
  const [email, setEmail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [constancia, setConstancia] = useState(null);
  const [copia, setCopia] = useState("");

  async function enviar(e) {
    e.preventDefault();
    if (busy) return;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      setConstancia(await api("/repentance/", { method: "POST", body, auth: !!user }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(constancia.codigo);
      setCopia("Código copiado.");
    } catch {
      setCopia("Seleccioná el código y copialo manualmente.");
    }
  }

  return <section className="dci-page-shell mx-auto max-w-2xl space-y-5">
    <header><p className="dci-eyebrow">Contratación a distancia</p><h1 className="dci-title">Botón de arrepentimiento</h1>
      <p className="dci-subtitle">Si contrataste como consumidor, podés revocar la aceptación dentro de los 10 días corridos desde la contratación o la entrega del bien, lo que ocurra último (art. 34, Ley 24.240). Podés hacer la solicitud sin iniciar sesión.</p></header>
    {constancia ? <div className="dci-glass-card space-y-3" role="status">
      <h2 className="text-xl font-bold">Solicitud recibida</h2><p>Guardá esta constancia para consultar tu trámite.</p>
      <p className="select-all break-all font-mono text-xl">{constancia.codigo}</p>
      <time dateTime={constancia.requested_at}>{new Date(constancia.requested_at).toLocaleString("es-AR")}</time>
      <div><button type="button" className="btn-sec" onClick={copiar}>Copiar código</button></div><p>{copia}</p>
    </div> : <form className="dci-glass-card space-y-4" onSubmit={enviar}>
      <label className="block">Correo electrónico registrado<input className="input" type="email" name="email" maxLength={254} autoComplete="email" required value={email ?? user?.email ?? ""} onChange={e => setEmail(e.target.value)} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Nombre (opcional)<input className="input" name="nombre" maxLength={150} autoComplete="name" /></label>
        <label>Empresa (opcional)<input className="input" name="empresa" maxLength={160} autoComplete="organization" /></label></div>
      <label className="block">Motivo o detalle de la contratación (opcional)<textarea className="input" name="reason" rows={4} maxLength={4000} /></label>
      {error && <p role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
    </form>}
  </section>;
}

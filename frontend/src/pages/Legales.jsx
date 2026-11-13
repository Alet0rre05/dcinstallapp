import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function Legales() {
  const [docs, setDocs] = useState([]); const [error, setError] = useState("");
  useEffect(() => { api("/legal/").then(setDocs).catch((e) => setError(e.message)); }, []);
  return <section className="dci-page-shell space-y-5"><header><p className="dci-eyebrow">DC INSTALL · JUPITER</p><h1 className="dci-title">Marco legal</h1><p className="dci-subtitle">Documentos versionados y trazables de la plataforma.</p></header>
    {error && <p className="text-red-500">{error}</p>}{docs.length ? docs.map((d) => <article className="dci-glass-card" key={`${d.type}-${d.version}`}><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{d.type.replace("_", " ")}</h2><span className="dci-status-badge">v{d.version}</span></div><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-600 dark:text-slate-300">{d.content}</pre></article>) : <div className="dci-glass-card text-sm text-slate-500">No hay documentos publicados todavía.</div>}</section>;
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";
import { api } from "../lib/api.js";

const nombres = { PRIVACIDAD: "Política de privacidad", TOS: "Términos de uso", EULA: "Licencia de usuario final", DPA: "Acuerdo de procesamiento de datos" };

export default function Legales() {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const tipo = params.get("doc");
  useEffect(() => {
    let activo = true;
    api("/legal/", { auth: false }).then(data => { if (activo) setDocs(data); })
      .catch(err => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, []);
  const visibles = (docs || []).filter(d => !tipo || tipo === d.type);
  return <section className="dci-page-shell mx-auto max-w-4xl space-y-5">
    <header><p className="dci-eyebrow">DC INSTALL</p><h1 className="dci-title">Documentos legales</h1></header>
    <nav aria-label="Documentos legales" className="flex flex-wrap gap-3">
      <Link className="link" to="/legales" aria-current={!tipo ? "page" : undefined}>Todos</Link>
      {[...new Set((docs || []).map(d => d.type))].map(k => <Link key={k} className="link" aria-current={tipo === k ? "page" : undefined} to={`/legales?doc=${k}`}>{nombres[k] || k}</Link>)}</nav>
    {error ? <p role="alert">{error}</p> : !docs ? <p role="status">Cargando documentos…</p> : !visibles.length && <p>No hay documentos publicados para esta selección.</p>}
    {visibles.map(d => <article key={d.id} className="dci-glass-card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{nombres[d.type] || d.type}</h2>
        <span className="dci-status-badge !text-brand-dark dark:!text-cian">Versión {d.version}</span></header>
      <div className="space-y-3 leading-7 [&_a]:underline [&_h2]:pt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
        <Markdown skipHtml>{d.content}</Markdown></div></article>)}
    <Link className="link" to="/arrepentimiento">Botón de arrepentimiento</Link>
  </section>;
}

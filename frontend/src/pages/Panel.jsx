import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import Equipo from "./Equipo.jsx";
import Auditoria from "./Auditoria.jsx";

/** Panel de Control: ADMIN ve Equipo + Auditoría; OFICINA/OPERARIO ven la auditoría que les corresponde. */
export default function Panel() {
  const { esAdmin } = useAuth();
  const [tab, setTab] = useState(esAdmin ? "equipo" : "auditoria");
  const tabs = [...(esAdmin ? [["equipo", "Equipo"]] : []), ["auditoria", "Auditoría"]];

  return (
    <div>
      <div className="mb-4 rounded-lg bg-brand p-4 text-ink shadow-sm">
        <h1 className="mb-3 text-2xl font-bold">Panel de Control</h1>
        <div role="tablist" aria-label="Secciones del panel" className="flex flex-wrap gap-2">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`inline-flex min-h-[44px] items-center rounded px-4 text-base font-semibold ${
                tab === k ? "bg-ink text-white" : "bg-white/70 text-ink hover:bg-white active:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "equipo" && esAdmin && <Equipo />}
      {tab === "auditoria" && <Auditoria />}
    </div>
  );
}

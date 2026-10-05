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
      <h1 className="mb-3 text-xl font-bold">Panel de Control</h1>
      <div className="mb-4 flex gap-2">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? "btn" : "btn-sec"}>{label}</button>
        ))}
      </div>
      {tab === "equipo" && esAdmin && <Equipo />}
      {tab === "auditoria" && <Auditoria />}
    </div>
  );
}

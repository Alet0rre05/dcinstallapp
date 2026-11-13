import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import Equipo from "./Equipo.jsx";
import Auditoria from "./Auditoria.jsx";
import Operarios from "./Operarios.jsx";

/**
 * Panel de Control: ADMIN ve Equipo + Auditoría; OFICINA ve Operarios + Auditoría (V3.1);
 * OPERARIO ve solo la auditoría que le corresponde.
 */
export default function Panel() {
  const { user, esAdmin } = useAuth();
  const esOficina = user?.rol === "OFICINA";
  const [tab, setTab] = useState(esAdmin ? "equipo" : esOficina ? "operarios" : "auditoria");
  const tabs = [
    ...(esAdmin ? [["equipo", "Equipo"]] : []),
    ...(esOficina ? [["operarios", "Operarios"]] : []),
    ["auditoria", "Auditoría"],
  ];

  return (
    <div className="dci-panel-home space-y-5">
      <div className="dci-panel-hero">
        <div className="dci-eyebrow">CENTRO DE GESTIÓN · DCINSTALL</div>
        <h1 className="mb-2 mt-2 text-3xl font-extrabold tracking-tight text-ink">Panel de Control</h1>
        <p className="mb-4 max-w-2xl text-sm text-slate-500">Administrá los recursos y consultá la trazabilidad de las acciones disponibles para tu perfil.</p>
        <div role="tablist" aria-label="Secciones del panel" className="flex flex-wrap gap-2">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`dci-panel-tab inline-flex min-h-[44px] items-center rounded-xl px-4 text-base font-semibold ${
                tab === k ? "is-active" : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="dci-panel-context" aria-live="polite"><span className="dci-panel-context-icon">{tab === "equipo" ? "⌘" : tab === "operarios" ? "◎" : "◷"}</span><span><strong>{tabs.find(([key]) => key === tab)?.[1] || "Auditoría"}</strong><small>{tab === "equipo" ? "Administración de integrantes y permisos" : tab === "operarios" ? "Gestión de operarios de la organización" : "Registro de actividad y seguimiento"}</small></span></div>
      {tab === "equipo" && esAdmin && <Equipo />}
      {tab === "operarios" && esOficina && <Operarios />}
      {tab === "auditoria" && <Auditoria />}
    </div>
  );
}

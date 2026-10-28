import { Link } from "react-router-dom";
const SERVICIOS = [
  { id: "control-mensual", nombre: "Control mensual", descripcion: "Seguimiento periódico de equipos y estado de inspecciones." },
  { id: "recarga", nombre: "Mantenimiento y recarga", descripcion: "Gestión de solicitudes de recarga y mantenimiento de extintores." },
  { id: "dotacion-inicial", nombre: "Dotación inicial", descripcion: "Solicitud de provisión de equipos para nuevas instalaciones." },
];
export default function Servicios({ destino = "/solicitud" }) {
  return <section aria-label="Servicios disponibles" className="grid gap-4 md:grid-cols-3">{SERVICIOS.map(s => <article key={s.id} className="dci-service-card"><h3 className="mb-3 text-xl font-bold">{s.nombre}</h3><p className="mb-6 text-slate-100">{s.descripcion}</p><Link className="dci-service-action" to={`${destino}?servicio=${encodeURIComponent(s.id)}`}>Solicitar servicio</Link></article>)}</section>;
}

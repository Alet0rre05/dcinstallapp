import { useState } from "react";
import { useSearchParams } from "react-router-dom";
const servicios = [["control-mensual", "Control mensual"], ["recarga", "Recarga"], ["dotacion-inicial", "Dotación inicial"]];
export default function ProjectRequestForm({ onSubmit }) {
  const [params] = useSearchParams();
  const seleccionado = params.get("servicio");
  const [datos, setDatos] = useState({ cantidad: "1-10", servicio: servicios.some(([id]) => id === seleccionado) ? seleccionado : "control-mensual", sector: "Comercial", ubicacion: "" });
  const cambiar = e => setDatos(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const enviar = e => { e.preventDefault(); onSubmit?.(datos); };
  return <form onSubmit={enviar} className="dci-service-card mx-auto max-w-xl space-y-5"><h2 className="text-2xl font-bold">Solicitud de inspección o servicio</h2><label className="block font-semibold">Cantidad de equipos<select name="cantidad" className="dci-field mt-2" value={datos.cantidad} onChange={cambiar}>{["1-10", "11-50", "+50"].map(v => <option key={v}>{v}</option>)}</select></label><label className="block font-semibold">Tipo de servicio<select name="servicio" className="dci-field mt-2" value={datos.servicio} onChange={cambiar}>{servicios.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}</select></label><label className="block font-semibold">Sector<select name="sector" className="dci-field mt-2" value={datos.sector} onChange={cambiar}>{["Comercial", "Industrial", "Consorcio"].map(v => <option key={v}>{v}</option>)}</select></label><label className="block font-semibold">Ubicación / referencia<input name="ubicacion" className="dci-field mt-2" value={datos.ubicacion} onChange={cambiar} maxLength={200} required placeholder="Dirección o sector del establecimiento" /></label><button type="submit" disabled={!onSubmit} className="dci-service-action disabled:cursor-not-allowed disabled:opacity-50">Enviar solicitud</button>{!onSubmit && <p className="text-sm text-slate-100">Formulario de interfaz: falta conectar el envío con el endpoint autorizado del backend.</p>}</form>;
}

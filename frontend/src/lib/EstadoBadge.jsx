const ESTILOS = {
  GRIS: { bg: "bg-slate-400", label: "Sin datos" },
  BORDO: { bg: "bg-bordo", label: "Crítico" },
  ROJO: { bg: "bg-red-500", label: "Vencido / Peligro" },
  AMARILLO: { bg: "bg-yellow-400 !text-slate-900", label: "Por vencer" },
  VERDE: { bg: "bg-green-600", label: "Operativo" },
};

export default function EstadoBadge({ estado }) {
  const e = ESTILOS[estado] || ESTILOS.GRIS;
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${e.bg}`}>
      {e.label}
    </span>
  );
}

/** Estado vacío con mensaje claro (y, si corresponde, una indicación de qué hacer). */
export default function EstadoVacio({ titulo, children, icono = "○" }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-dark/40 bg-white p-6 text-center">
      <p aria-hidden="true" className="mb-1 text-3xl text-brand-dark">{icono}</p>
      <p className="text-lg font-semibold text-ink">{titulo}</p>
      {children && <p className="mt-1 text-base text-slate-600">{children}</p>}
    </div>
  );
}

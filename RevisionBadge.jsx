/**
 * Estado de revisión MENSUAL (independiente del semáforo de EstadoBadge):
 *   REVISADO     -> hay al menos un control este mes (fondo celeste oscuro + ✓)
 *   NO REVISADO  -> todavía no se controló este mes (borde punteado + círculo vacío)
 * Siempre icono + texto: nunca depende solo del color. Evita verde/amarillo/rojo/gris del semáforo.
 */
export default function RevisionBadge({ revisado }) {
  if (revisado === undefined || revisado === null) return null;
  return revisado ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-dark px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
      <span aria-hidden="true">✓</span> Revisado
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-dashed border-brand-dark bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
      <span aria-hidden="true">○</span> No revisado
    </span>
  );
}

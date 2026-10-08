/** Placeholders de carga (reemplazan al texto "Cargando…"). Anuncian "Cargando" a lectores de pantalla. */
export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function ListaSkeleton({ filas = 3, alto = "h-20" }) {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className={`${alto} w-full`} />
      ))}
    </div>
  );
}

export function FichaSkeleton() {
  return (
    <div role="status" aria-busy="true" className="card space-y-3">
      <span className="sr-only">Cargando…</span>
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

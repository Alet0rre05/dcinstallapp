import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import EstadoBadge from "../lib/EstadoBadge.jsx";
import EstadoVacio from "../lib/EstadoVacio.jsx";
import { ListaSkeleton, Skeleton } from "../lib/Skeleton.jsx";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (ym) => {
  const [a, m] = ym.split("-");
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
};
const fechaAr = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-AR");
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ---- piezas -------------------------------------------------------------------------------------
const ICONOS = {
  equipos: <path d="M7 3h6l2 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v4" />,
  vencidos: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  por_vencer: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.01" /></>,
  sin_revisar: <><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /></>,
};

function Indicador({ icono, valor, titulo, clases }) {
  return (
    <li className={`flex min-h-[88px] items-center gap-3 rounded-lg border p-4 ${clases}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONOS[icono]}
      </svg>
      <span>
        <span className="block text-3xl font-bold leading-none">{valor}</span>
        <span className="block pt-1 text-base font-semibold">{titulo}</span>
      </span>
    </li>
  );
}

/** Barras agrupadas por mes (Carga / PH). Cada barra lleva su número; el gráfico tiene tabla equivalente. */
function GraficoMeses({ datos }) {
  const max = Math.max(1, ...datos.flatMap((d) => [d.carga, d.ph]));
  const total = datos.reduce((s, d) => s + d.carga + d.ph, 0);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-base" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded-sm bg-acento dark:bg-acento-soft" /> Carga</span>
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm border-2 border-acento bg-[image:repeating-linear-gradient(45deg,#3B4BB0_0,#3B4BB0_2px,transparent_2px,transparent_5px)] dark:border-acento-soft dark:bg-[image:repeating-linear-gradient(45deg,#A5B4FC_0,#A5B4FC_2px,transparent_2px,transparent_5px)]" /> Prueba hidráulica (PH)
        </span>
      </div>

      {total === 0 ? (
        <EstadoVacio titulo="No hay vencimientos en estos meses" icono="✓">
          Probá ampliar el período a más meses.
        </EstadoVacio>
      ) : (
        <div className="overflow-x-auto">
          <div role="img" aria-label={`Vencimientos por mes: ${datos.map((d) => `${etiquetaMes(d.mes)}, ${d.carga} de carga y ${d.ph} de PH`).join("; ")}.`} className="flex min-w-[20rem] items-end gap-3 pt-6">
            {datos.map((d) => (
              <div key={d.mes} className="flex flex-1 flex-col items-center">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  {[["carga", d.carga], ["ph", d.ph]].map(([tipo, n]) => (
                    <div key={tipo} className="flex h-full w-1/2 max-w-[2.5rem] flex-col items-center justify-end">
                      <span className="pb-1 text-sm font-bold text-ink">{n}</span>
                      <div
                        style={{ height: `${(n / max) * 100}%`, minHeight: n > 0 ? 4 : 0 }}
                        className={`w-full rounded-t-md border-2 border-acento transition-all duration-200 dark:border-acento-soft ${
                          tipo === "carga"
                            ? "bg-acento dark:bg-acento-soft"
                            : "bg-[image:repeating-linear-gradient(45deg,#3B4BB0_0,#3B4BB0_2px,transparent_2px,transparent_5px)] dark:bg-[image:repeating-linear-gradient(45deg,#A5B4FC_0,#A5B4FC_2px,transparent_2px,transparent_5px)]"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <span className="pt-2 text-sm font-semibold text-slate-700">{etiquetaMes(d.mes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>Vencimientos por mes</caption>
        <thead><tr><th>Mes</th><th>Carga</th><th>PH</th></tr></thead>
        <tbody>{datos.map((d) => <tr key={d.mes}><td>{etiquetaMes(d.mes)}</td><td>{d.carga}</td><td>{d.ph}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function ReparticionEstados({ por_estado, total }) {
  return (
    <ul className="space-y-2">
      {["BORDO", "ROJO", "AMARILLO", "GRIS", "VERDE"].map((e) => {
        const n = por_estado[e] || 0;
        return (
          <li key={e} className="flex items-center gap-3">
            <span className="w-40 shrink-0"><EstadoBadge estado={e} /></span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-acento dark:bg-acento-soft" style={{ width: total ? `${(n / total) * 100}%` : 0 }} />
            </span>
            <span className="w-10 text-right text-base font-bold text-ink">{n}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Plazo({ dias }) {
  const vencido = dias < 0;
  const pronto = !vencido && dias <= 30;
  const texto = vencido
    ? `Vencido hace ${plural(-dias, "día", "días")}`
    : dias === 0 ? "Vence hoy" : `En ${plural(dias, "día", "días")}`;
  const clases = vencido
    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    : pronto
      ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
      : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-sm font-semibold ${clases}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {vencido ? <path d="M6 6l12 12M18 6 6 18" /> : pronto ? <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /></> : <path d="m5 12 5 5 9-10" />}
      </svg>
      {texto}
    </span>
  );
}

// ---- página -------------------------------------------------------------------------------------
/** Dashboard de vencimientos: resumen, gráfico por mes y tabla de próximos vencimientos. */
export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const cliente = params.get("cliente") || "";
  const meses = params.get("meses") || "6";

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const pedido = useRef(0); // descarta respuestas viejas si se cambian los filtros rápido

  const cargar = useCallback(async () => {
    const mio = ++pedido.current;
    setError("");
    try {
      const qs = new URLSearchParams({ meses });
      if (cliente) qs.set("cliente", cliente);
      const d = await api(`/dashboard/vencimientos/?${qs}`);
      if (mio === pedido.current) setData(d);
    } catch (err) {
      if (mio === pedido.current) setError(err.message || "No pudimos cargar el dashboard.");
    }
  }, [cliente, meses]);

  useEffect(() => { setData(null); cargar(); }, [cargar]);

  const cambiar = (clave, valor) => {
    const n = new URLSearchParams(params);
    if (valor) n.set(clave, valor); else n.delete(clave);
    setParams(n, { replace: true });
  };

  const t = data?.totales;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-acento p-4 text-white shadow-sm dark:bg-acento-deep dark:text-acento-soft">
        <h1 className="text-2xl font-bold">Dashboard de vencimientos</h1>
        <p className="text-base">Qué vence, cuándo y qué equipos necesitan atención. Solo equipos activos de tus clientes.</p>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2">
        {user.clientes.length > 1 || user.rol === "ADMIN" ? (
          <label className="block text-base font-semibold text-ink">
            Cliente
            <select className="input mt-1 min-h-[44px]" value={cliente} onChange={(e) => cambiar("cliente", e.target.value)}>
              <option value="">Todos mis clientes</option>
              {user.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        ) : <div />}
        <label className="block text-base font-semibold text-ink">
          Período del gráfico
          <select className="input mt-1 min-h-[44px]" value={meses} onChange={(e) => cambiar("meses", e.target.value === "6" ? "" : e.target.value)}>
            {[3, 6, 12].map((m) => <option key={m} value={m}>Próximos {m} meses</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-base text-red-700">
          {error}
          <button className="btn-acento" onClick={cargar}>Reintentar</button>
        </div>
      )}

      {!data && !error && (
        <div role="status" aria-busy="true" className="space-y-4">
          <span className="sr-only">Cargando…</span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px]" />)}</div>
          <Skeleton className="h-56 w-full" />
          <ListaSkeleton filas={3} alto="h-12" />
        </div>
      )}

      {data && t.equipos === 0 && (
        <EstadoVacio titulo="Todavía no hay equipos para mostrar" icono="○">
          Cuando se carguen matafuegos {cliente ? "de este cliente " : ""}vas a ver acá sus vencimientos. La oficina puede agregarlos o importarlos desde Excel.
        </EstadoVacio>
      )}

      {data && t.equipos > 0 && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen">
            <Indicador icono="equipos" valor={t.equipos} titulo="Equipos activos" clases="border-acento/40 bg-acento-light text-acento-dark dark:border-acento-soft/40 dark:bg-acento-deep dark:text-acento-soft" />
            <Indicador icono="vencidos" valor={t.vencidos} titulo={t.vencidos === 1 ? "Equipo vencido" : "Equipos vencidos"} clases="border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300" />
            <Indicador icono="por_vencer" valor={t.por_vencer} titulo="Por vencer (30 días)" clases="border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200" />
            <Indicador icono="sin_revisar" valor={t.sin_revisar} titulo="Sin revisar este mes" clases="border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
          </ul>

          {(data.vencidos_por_tipo.carga > 0 || data.vencidos_por_tipo.ph > 0) && (
            <p role="note" className="rounded-md border border-red-300 bg-red-100 p-3 text-base font-semibold text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300">
              ⚠ Ya vencidos: {plural(data.vencidos_por_tipo.carga, "carga", "cargas")} y {plural(data.vencidos_por_tipo.ph, "prueba hidráulica", "pruebas hidráulicas")}.
            </p>
          )}

          <section className="card" aria-labelledby="h-meses">
            <h2 id="h-meses" className="mb-1 text-xl font-bold text-ink">Vencimientos por mes</h2>
            <p className="mb-2 text-base text-slate-600">Cantidad de cargas y pruebas hidráulicas que vencen en cada mes.</p>
            <GraficoMeses datos={data.por_mes} />
          </section>

          <section className="card" aria-labelledby="h-estados">
            <h2 id="h-estados" className="mb-3 text-xl font-bold text-ink">Estado de los equipos</h2>
            <ReparticionEstados por_estado={t.por_estado} total={t.equipos} />
          </section>

          <section className="card" aria-labelledby="h-prox">
            <h2 id="h-prox" className="mb-1 text-xl font-bold text-ink">Próximos vencimientos</h2>
            <p className="mb-3 text-base text-slate-600">Vencidos y los que vencen en los próximos {data.dias_proximos} días, del más urgente al menos.</p>
            {data.proximos.length === 0 ? (
              <EstadoVacio titulo="Nada vence en los próximos días" icono="✓">
                No hay cargas ni pruebas hidráulicas vencidas ni por vencer en {data.dias_proximos} días.
              </EstadoVacio>
            ) : (
              <>
                <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[40rem] text-left text-base">
                    <caption className="sr-only">Próximos vencimientos</caption>
                    <thead>
                      <tr className="text-sm text-slate-600">
                        {["Plazo", "Fecha", "Tipo", "Equipo", "Cliente", "Ubicación", "Estado"].map((h) => (
                          <th key={h} scope="col" className="sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-white px-3 py-2 font-semibold dark:bg-slate-800">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.proximos.map((f) => (
                        <tr key={`${f.equipo_id}-${f.tipo}`} className="border-b border-slate-100 transition-colors duration-200 last:border-b-0 hover:bg-acento-light dark:hover:bg-acento-deep">
                          <td className="px-3 py-2"><Plazo dias={f.dias} /></td>
                          <td className="whitespace-nowrap px-3 py-2">{fechaAr(f.fecha)}</td>
                          <td className="px-3 py-2">{f.tipo === "carga" ? "Carga" : "PH"}</td>
                          <td className="px-3 py-2">
                            <Link className="link inline-flex min-h-[44px] items-center" to={`/?cliente=${f.cliente_id}&equipo=${f.equipo_id}`}>{f.numero_serie}</Link>
                          </td>
                          <td className="px-3 py-2">{f.cliente_nombre}</td>
                          <td className="px-3 py-2 text-slate-600">{f.ubicacion || "—"}</td>
                          <td className="px-3 py-2"><EstadoBadge estado={f.estado_color} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.proximos_total > data.proximos.length && (
                  <p className="mt-2 text-sm text-slate-600">Mostrando {data.proximos.length} de {data.proximos_total}. Filtrá por cliente para ver el resto.</p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

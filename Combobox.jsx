import { useEffect, useId, useMemo, useRef, useState } from "react";

const normalizar = (t) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Selector desplegable con buscador (sin librerías). Patrón ARIA "combobox + listbox":
 * flechas ↑↓, Enter para elegir, Esc para cerrar.
 *  - items: lista completa (ya ordenada)
 *  - selected: item elegido (o null)
 *  - getKey(item), searchText(item) -> texto donde se busca, inputLabel(item) -> texto al estar elegido
 *  - renderItem(item) -> contenido de cada opción
 */
export default function Combobox({
  items, selected, getKey, searchText, inputLabel, renderItem, onSelect,
  label, placeholder = "Buscá…", vacio = "No hay resultados",
}) {
  const id = useId();
  const raiz = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);

  const filtrados = useMemo(() => {
    const q = normalizar(consulta).trim();
    return q ? items.filter((it) => normalizar(searchText(it)).includes(q)) : items;
  }, [items, consulta, searchText]);

  const optId = (i) => `${id}-op-${i}`;

  useEffect(() => {
    if (abierto) document.getElementById(optId(activo))?.scrollIntoView({ block: "nearest" });
  }, [activo, abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = () => { setAbierto(false); setConsulta(""); };
  const elegir = (it) => { onSelect(it); cerrar(); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!abierto) setAbierto(true);
      else setActivo((a) => Math.min(a + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && abierto) {
      e.preventDefault();
      if (filtrados[activo]) elegir(filtrados[activo]);
    } else if (e.key === "Escape") {
      cerrar();
    }
  };

  return (
    <div
      ref={raiz}
      className="relative"
      onBlur={(e) => { if (!raiz.current.contains(e.relatedTarget)) cerrar(); }}
    >
      <label htmlFor={`${id}-input`} className="mb-1 block text-base font-semibold">{label}</label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtrados[activo] ? optId(activo) : undefined}
        autoComplete="off"
        inputMode="search"
        className="input min-h-[48px] text-base"
        placeholder={placeholder}
        value={abierto ? consulta : selected ? inputLabel(selected) : ""}
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        onChange={(e) => { setConsulta(e.target.value); setActivo(0); setAbierto(true); }}
        onKeyDown={onKeyDown}
      />
      {abierto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label={label}
          onMouseDown={(e) => e.preventDefault() /* no perder el foco antes del click */}
          className="absolute z-20 mt-1 max-h-[55vh] w-full overflow-auto rounded-lg border border-slate-300 bg-white shadow-lg"
        >
          {filtrados.length === 0 && <li className="p-3 text-base text-slate-500">{vacio}</li>}
          {filtrados.map((it, i) => {
            const esElegido = selected && getKey(selected) === getKey(it);
            return (
              <li
                key={getKey(it)}
                id={optId(i)}
                role="option"
                aria-selected={!!esElegido}
                onClick={() => elegir(it)}
                onMouseEnter={() => setActivo(i)}
                className={`min-h-[56px] cursor-pointer border-b border-slate-100 px-3 py-2 last:border-b-0 ${i === activo ? "bg-slate-100" : ""} ${esElegido ? "font-semibold" : ""}`}
              >
                {renderItem(it)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

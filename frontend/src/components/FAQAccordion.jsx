import { useState } from "react";
const preguntas = [
  ["¿Cada cuánto se controlan los extintores?", "La periodicidad depende de la normativa aplicable, el equipo y el establecimiento. Consultá el cronograma y la autoridad competente de tu jurisdicción."],
  ["¿Cuándo corresponde realizar una recarga?", "Depende del tipo de equipo, su uso, estado y requisitos técnicos vigentes. Un profesional habilitado debe determinar el servicio necesario."],
  ["¿Para qué sirven las etiquetas QR?", "Permiten consultar la identificación y los registros del equipo cuando está habilitado el acceso correspondiente."],
  ["¿Qué habilitaciones necesito?", "Los requisitos varían según jurisdicción y actividad. Verificá las exigencias locales con el organismo de control competente."],
];
export default function FAQAccordion({ items = preguntas }) {
  const [abierto, setAbierto] = useState(-1);
  return <section aria-label="Preguntas frecuentes" className="space-y-3">{items.map(([pregunta, respuesta], i) => <div key={pregunta} className="overflow-hidden rounded-xl border border-orange-800 bg-[#111e2d]"><h3><button type="button" aria-expanded={abierto === i} aria-controls={`faq-respuesta-${i}`} onClick={() => setAbierto(abierto === i ? -1 : i)} className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-left font-semibold text-white"><span>{pregunta}</span><span aria-hidden="true" className="text-2xl text-orange-300">{abierto === i ? "−" : "+"}</span></button></h3>{abierto === i && <div id={`faq-respuesta-${i}`} className="px-4 pb-4 text-slate-100">{respuesta}</div>}</div>)}</section>;
}

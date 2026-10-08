// Fecha y hora en formato 24 h: 05/10/2026 16:32
export const fechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: "America/Argentina/Buenos_Aires",
      })
    : "—";

export const ROL_LABEL = { ADMIN: "ADMIN", OFICINA: "OFICINA", OPERARIO: "OPERARIO" };
export const rolLabel = (rol) => ROL_LABEL[rol] || "PÚBLICO";

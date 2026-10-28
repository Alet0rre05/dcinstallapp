import { cacheRead, cacheWrite, guardarControlPendiente } from "./offline.js";
import { Capacitor } from "@capacitor/core";

const DEFAULT_BASE = Capacitor.isNativePlatform() ? "https://dcinstall-api.onrender.com/api" : "http://localhost:8000/api";
const BASE = (import.meta.env.VITE_API_URL || DEFAULT_BASE).replace(/\/$/, "");
const TOKEN_KEY = "dci_access";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(status, data) {
    super(extractMessage(data) || `Error ${status}`);
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return "";
  const [k, v] = first;
  const msg = Array.isArray(v) ? v[0] : v;
  return k === "non_field_errors" ? msg : `${k}: ${msg}`;
}

function nombreDeDescarga(res) {
  const m = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") || "");
  return m ? m[1].replace(/[\\/\r\n]/g, "_") : null;
}

async function offlineLookup(path) {
  const dataset = await cacheRead("/mobile/offline-dataset/").catch(() => null);
  if (!dataset) return undefined;
  const controles = path.match(/^\/matafuegos\/(\d+)\/controles\/?$/);
  if (controles) return (dataset.controles || []).filter((c) => Number(c.matafuego) === Number(controles[1]));
  const qr = path.match(/^\/public\/qr\/([^/]+)\/?$/);
  const privateQr = path.match(/^\/matafuegos\/qr\/([^/]+)\/?$/);
  const equipos = dataset.equipos || [];
  if (qr || privateQr) {
    const token = (qr || privateQr)[1];
    const m = equipos.find((x) => String(x.token_qr).toLowerCase() === token.toLowerCase());
    if (!m) return undefined;
    if (privateQr) return m;
    const cliente = (dataset.clientes || []).find((c) => c.id === m.cliente);
    return { numero_serie: m.numero_serie, clase: m.clase, ubicacion: m.ubicacion,
      cliente: m.cliente_nombre || cliente?.nombre || "", vencimiento_carga: m.vencimiento_carga,
      vencimiento_ph: m.vencimiento_ph, estado_color: m.estado_color, ultimo_control: m.ultimo_control };
  }
  return undefined;
}

export async function api(path, { method = "GET", body, auth = true, blob = false, conNombre = false } = {}) {
  const esForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = esForm ? {} : { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, body: body ? (esForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (error) {
    if (method === "GET") {
      const cached = await cacheRead(path).catch(() => undefined);
      if (cached !== undefined) return cached;
      const resolved = await offlineLookup(path);
      if (resolved !== undefined) return resolved;
    }
    if (method === "POST" && path === "/controles/" && !esForm) return guardarControlPendiente(body);
    throw new ApiError(0, { detail: "Sin conexión. El cambio no se pudo enviar." });
  }
  if (blob && res.ok) {
    const value = await res.blob();
    return conNombre ? { blob: value, nombre: nombreDeDescarga(res) } : value;
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  if (method === "GET" && !blob && data !== null) {
    await cacheWrite(path, data).catch(() => {});
    if (path === "/auth/me/" && data?.id) localStorage.setItem("dci_user_id", String(data.id));
  }
  return data;
}


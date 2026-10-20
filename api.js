const BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
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

export async function api(path, { method = "GET", body, auth = true, blob = false } = {}) {
  // FormData (subida de archivos): el navegador arma el Content-Type con su boundary.
  const esForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = esForm ? {} : { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (esForm ? body : JSON.stringify(body)) : undefined,
  });
  if (blob && res.ok) return res.blob(); // descargas (ej. plantilla .xlsx)
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

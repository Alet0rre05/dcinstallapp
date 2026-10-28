import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api.js";
import { limpiarCacheOfflineUsuario } from "./offline.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function tokenVigente(token) {
  try { return JSON.parse(atob(token.split(".")[1])).exp * 1000 > Date.now(); }
  catch { return false; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const cargarPerfil = useCallback(async () => {
    if (!navigator.onLine && !tokenVigente(getToken())) {
      setToken(null); setUser(null); setLoading(false); return null;
    }
    try {
      const perfil = await api("/auth/me/");
      setUser(perfil);
      localStorage.setItem("dci_offline_user", JSON.stringify(perfil));
      localStorage.setItem("dci_user_id", String(perfil.id));
      return perfil;
    } catch {
      const token = getToken();
      let guardado = null;
      try { guardado = JSON.parse(localStorage.getItem("dci_offline_user") || "null"); } catch {}
      if (!navigator.onLine && token && tokenVigente(token) && guardado?.rol) {
        setUser(guardado);
        return guardado;
      }
      if (navigator.onLine) setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (getToken()) cargarPerfil(); }, [cargarPerfil]);

  const login = async (username, password) => {
    const data = await api("/auth/login/", { method: "POST", body: { username, password }, auth: false });
    setToken(data.access);
    await cargarPerfil();
  };

  const registro = async (payload) => {
    const data = await api("/auth/registro/", { method: "POST", body: payload, auth: false });
    setToken(data.access);
    setUser(data.user);
    localStorage.setItem("dci_offline_user", JSON.stringify(data.user));
    localStorage.setItem("dci_user_id", String(data.user.id));
  };

  const logout = () => { limpiarCacheOfflineUsuario().catch(() => {}); localStorage.removeItem("dci_offline_user"); localStorage.removeItem("dci_user_id"); setToken(null); setUser(null); };
  const tieneRol = !!user?.rol;
  const esAdmin = user?.rol === "ADMIN";
  const esStaff = !!user && ["ADMIN", "OFICINA"].includes(user.rol);
  const esCampo = !!user && ["ADMIN", "OFICINA", "OPERARIO"].includes(user.rol);

  return <AuthContext.Provider value={{ user, loading, login, registro, logout, recargar: cargarPerfil, tieneRol, esAdmin, esStaff, esCampo }}>{children}</AuthContext.Provider>;
}



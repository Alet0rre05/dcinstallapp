import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const cargarPerfil = useCallback(async () => {
    try {
      setUser(await api("/auth/me/"));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getToken()) cargarPerfil();
  }, [cargarPerfil]);

  const login = async (username, password) => {
    const data = await api("/auth/login/", { method: "POST", body: { username, password }, auth: false });
    setToken(data.access);
    await cargarPerfil();
  };

  const registro = async (payload) => {
    const data = await api("/auth/registro/", { method: "POST", body: payload, auth: false });
    setToken(data.access);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // user.rol === null -> "Público registrado": cuenta sin permisos
  const tieneRol = !!user?.rol;
  const esAdmin = user?.rol === "ADMIN";
  const esStaff = !!user && ["ADMIN", "OFICINA"].includes(user.rol);
  const esCampo = !!user && ["ADMIN", "OFICINA", "OPERARIO"].includes(user.rol);

  return (
    <AuthContext.Provider value={{ user, loading, login, registro, logout, recargar: cargarPerfil, tieneRol, esAdmin, esStaff, esCampo }}>
      {children}
    </AuthContext.Provider>
  );
}

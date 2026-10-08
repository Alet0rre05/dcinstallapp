import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Matafuegos from "./pages/Matafuegos.jsx";
import Tickets from "./pages/Tickets.jsx";
import Perfil from "./pages/Perfil.jsx";
import ScanQR from "./pages/ScanQR.jsx";
import Panel from "./pages/Panel.jsx";
import SinAcceso from "./pages/SinAcceso.jsx";
import Importar from "./pages/Importar.jsx";
import Etiquetas from "./pages/Etiquetas.jsx";

/** Requiere sesión Y rol. Con sesión pero sin rol (público registrado) -> pantalla "sin acceso". */
function Privada({ children }) {
  const { user, loading, tieneRol } = useAuth();
  if (loading) return <p className="p-6">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return tieneRol ? children : <SinAcceso />;
}

/** Solo ADMIN/OFICINA; el operario vuelve al inicio. (El backend igual responde 403.) */
function SoloStaff({ children }) {
  const { esStaff } = useAuth();
  return esStaff ? children : <Navigate to="/" replace />;
}

function Layout({ children }) {
  const { user, tieneRol, esStaff, logout } = useAuth();
  return (
    <>
      <header className="bg-brand text-white print:hidden">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-3 text-sm">
          <Link to="/" className="mr-auto text-lg font-bold">DC INSTALL</Link>
          {user ? (
            <>
              {tieneRol && (
                <>
                  <Link to="/">Matafuegos</Link>
                  {esStaff && <Link to="/importar">Importar</Link>}
                  {esStaff && <Link to="/etiquetas">Etiquetas</Link>}
                  <Link to="/tickets">Soporte</Link>
                  <Link to="/panel">Panel de Control</Link>
                  <Link to="/perfil">{user.first_name || user.username}</Link>
                </>
              )}
              <button onClick={logout} className="underline">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login">Ingresar</Link>
              <Link to="/registro">Registrarse</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/qr/:token" element={<ScanQR />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<Privada><Matafuegos /></Privada>} />
        <Route path="/importar" element={<Privada><SoloStaff><Importar /></SoloStaff></Privada>} />
        <Route path="/etiquetas" element={<Privada><SoloStaff><Etiquetas /></SoloStaff></Privada>} />
        <Route path="/tickets" element={<Privada><Tickets /></Privada>} />
        <Route path="/panel" element={<Privada><Panel /></Privada>} />
        <Route path="/perfil" element={<Privada><Perfil /></Privada>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

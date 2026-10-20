import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import Logo from "./lib/Logo.jsx";
import { ListaSkeleton } from "./lib/Skeleton.jsx";
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
import Tutoria from "./pages/Tutoria.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Notificaciones from "./lib/Notificaciones.jsx";
import BotonTema from "./lib/tema.jsx";

/** Requiere sesión Y rol. Con sesión pero sin rol (público registrado) -> pantalla "sin acceso". */
function Privada({ children }) {
  const { user, loading, tieneRol } = useAuth();
  if (loading) return <div className="mx-auto max-w-md pt-6"><ListaSkeleton filas={2} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return tieneRol ? children : <SinAcceso />;
}

/** Solo ADMIN/OFICINA; el operario vuelve al inicio. (El backend igual responde 403.) */
function SoloStaff({ children }) {
  const { esStaff } = useAuth();
  return esStaff ? children : <Navigate to="/" replace />;
}

const ITEM = "inline-flex min-h-[44px] items-center rounded px-3 text-base font-semibold text-ink hover:bg-white/60 active:bg-white/80";
const claseLink = ({ isActive }) =>
  `${ITEM} w-full md:w-auto ${isActive ? "bg-ink !text-white hover:bg-ink" : ""}`;

function Layout({ children }) {
  const { user, tieneRol, esStaff, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const enlace = (to, texto, extra = {}) => (
    <li key={to}>
      <NavLink to={to} end={to === "/"} className={claseLink} onClick={cerrar} {...extra}>{texto}</NavLink>
    </li>
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-brand text-ink shadow print:hidden">
        <nav aria-label="Principal" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 px-3 py-2">
          <Link to="/" onClick={cerrar} className="mr-auto flex min-h-[44px] items-center rounded">
            <Logo />
          </Link>
          {tieneRol && <Notificaciones />}
          <BotonTema />
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border-2 border-ink px-3 text-base font-bold text-ink hover:bg-white/60 md:hidden"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            onClick={() => setAbierto(!abierto)}
          >
            <span aria-hidden="true" className="mr-2 text-xl leading-none">{abierto ? "✕" : "☰"}</span>
            Menú
          </button>
          <ul
            id="menu-principal"
            className={`${abierto ? "flex" : "hidden"} w-full flex-col gap-1 pb-2 pt-1 md:flex md:w-auto md:flex-row md:flex-wrap md:items-center md:gap-1 md:p-0`}
          >
            {user ? (
              <>
                {tieneRol && (
                  <>
                    {enlace("/", "Matafuegos")}
                    {enlace("/dashboard", "Dashboard")}
                    {esStaff && enlace("/importar", "Importar")}
                    {esStaff && enlace("/etiquetas", "Etiquetas")}
                    {enlace("/tickets", "Soporte")}
                    {enlace("/panel", "Panel de Control")}
                    {enlace("/perfil", user.first_name || user.username)}
                  </>
                )}
                {enlace("/tutoria", "Tutoría")}
                <li>
                  <button onClick={() => { cerrar(); logout(); }} className={`${ITEM} w-full underline md:w-auto`}>Salir</button>
                </li>
              </>
            ) : (
              <>
                {enlace("/tutoria", "Tutoría")}
                {enlace("/login", "Ingresar")}
                {enlace("/registro", "Registrarse")}
              </>
            )}
          </ul>
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
        <Route path="/tutoria" element={<Tutoria />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<Privada><Matafuegos /></Privada>} />
        <Route path="/importar" element={<Privada><SoloStaff><Importar /></SoloStaff></Privada>} />
        <Route path="/etiquetas" element={<Privada><SoloStaff><Etiquetas /></SoloStaff></Privada>} />
        <Route path="/dashboard" element={<Privada><Dashboard /></Privada>} />
        <Route path="/tickets" element={<Privada><Tickets /></Privada>} />
        <Route path="/panel" element={<Privada><Panel /></Privada>} />
        <Route path="/perfil" element={<Privada><Perfil /></Privada>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

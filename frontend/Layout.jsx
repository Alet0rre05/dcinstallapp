import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { useAuth } from "./auth.jsx";
import Logo from "./Logo.jsx";
import Notificaciones from "./Notificaciones.jsx";
import ParticleOrbitBackground from "./ParticleOrbitBackground.jsx";
import BotonTema from "./tema.jsx";
import OfflineActions from "./OfflineActions.jsx";

/**
 * Layout compartido (v3.3): barra superior + fondo ambiental + contenido.
 * El fondo de partículas vive ACÁ, fuera de <Routes>, así no se reinicia al cambiar de pantalla.
 * <MotionConfig reducedMotion="user"> hace que todas las animaciones de `motion` respeten
 * prefers-reduced-motion (se quedan solo los fundidos de opacidad).
 */
const ITEM = "inline-flex min-h-[44px] items-center rounded px-3 text-base font-semibold text-ink hover:bg-white/60 active:bg-white/80";
const claseLink = ({ isActive }) =>
  `${ITEM} w-full md:w-auto ${isActive ? "bg-ink !text-white hover:bg-ink" : ""}`;

export default function Layout({ children }) {
  const { user, tieneRol, esStaff, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const enlace = (to, texto, extra = {}) => (
    <li key={to}>
      <NavLink to={to} end={to === "/"} className={claseLink} onClick={cerrar} {...extra}>{texto}</NavLink>
    </li>
  );

  return (
    <MotionConfig reducedMotion="user">
      <ParticleOrbitBackground />
      <header className="sticky top-0 z-30 bg-brand text-ink shadow transition-colors duration-panel print:hidden">
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
                    {enlace("/reportes", "Reportes")}
                    {esStaff && enlace("/importar", "Importar")}
                    {esStaff && enlace("/etiquetas", "Etiquetas")}
                    {esStaff && enlace("/planillas", "Planillas")}
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
      <main className="mx-auto max-w-5xl p-4">{tieneRol && <OfflineActions />}{children}</main>
    </MotionConfig>
  );
}





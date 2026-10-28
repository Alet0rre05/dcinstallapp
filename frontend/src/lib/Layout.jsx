import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { useAuth } from "./auth.jsx";
import Logo from "./Logo.jsx";
import Notificaciones from "./Notificaciones.jsx";
import OfflineActions from "./OfflineActions.jsx";

const linkClass = ({ isActive }) => `dci-nav-link ${isActive ? "dci-nav-active" : ""}`;

export default function Layout({ children }) {
  const { user, tieneRol, esStaff, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();
  const botonRef = useRef(null);
  const panelRef = useRef(null);
  const cerrar = () => setAbierto(false);

  useEffect(() => { cerrar(); }, [location.pathname]);
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "Tab" && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll('a[href],button:not([disabled])')];
        if (!items.length) return;
        const primero = items[0], ultimo = items[items.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    requestAnimationFrame(() => panelRef.current?.querySelector("button")?.focus());
    return () => { document.body.style.overflow = previo; document.removeEventListener("keydown", key); botonRef.current?.focus(); };
  }, [abierto]);

  const enlaces = user ? [
    ...(tieneRol ? [
      ["/dashboard", "Dashboard"], ["/", "Matafuegos"],
      ["/reportes", "Reportes"],
      ...(esStaff ? [["/planillas", "Planillas"], ["/importar", "Importar"], ["/etiquetas", "Etiquetas"]] : []),
      ["/tickets", "Tickets / Soporte"], ["/panel", "Panel de control"],
      ["/perfil", user.first_name || user.username || "Perfil"],
    ] : []), ["/tutoria", "Tutoría"]
  ] : [["/tutoria", "Tutoría"], ["/login", "Ingresar"], ["/registro", "Registrarse"]];

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="dci-v6-header sticky top-0 z-30 h-16 w-full border-b border-white/10 bg-[#07182b]/90 shadow-[0_8px_30px_rgba(0,0,0,.2)] backdrop-blur-xl print:hidden">
        <nav aria-label="Barra superior" className="flex h-16 w-full items-center gap-3 px-4 sm:px-7">
          <button ref={botonRef} type="button" className="dci-v6-menu flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-white transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Abrir menú de navegación" aria-expanded={abierto} aria-controls="dci-drawer" onClick={() => setAbierto(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Link to="/" onClick={cerrar} className="dci-v6-brand flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/95 px-3 py-2 shadow-[0_3px_12px_rgba(0,0,0,.25)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="DC Install - Inicio"><Logo className="h-6 w-auto max-w-[175px] object-contain sm:h-7" /></Link>
          <div className="ml-auto flex min-w-0 items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 border-r border-white/10 pr-5 md:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/><span className="text-[10px] font-bold uppercase tracking-[.17em] text-slate-200">Plataforma de seguridad</span></div>
            {tieneRol && <Notificaciones />}
            <span className="hidden rounded-lg border border-cyan-500/20 bg-cyan-500/[.08] px-3 py-2 text-[10px] font-bold uppercase tracking-[.13em] text-cyan-300 lg:block">DC / Sapphire</span>
          </div>
        </nav>
      </header>
      {abierto && <div className="dci-drawer-backdrop fixed inset-0 z-40 print:hidden" aria-hidden="true" onClick={cerrar} />}
      <aside ref={panelRef} id="dci-drawer" role="dialog" aria-modal="true" aria-label="Navegación principal" aria-hidden={!abierto} className={`dci-drawer fixed inset-y-0 left-0 z-50 flex w-[min(88vw,340px)] flex-col print:hidden ${abierto ? "dci-drawer-open" : ""}`} inert={!abierto ? true : undefined}>
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
          <strong className="text-lg tracking-wide text-white">DC INSTALL</strong>
          <button type="button" onClick={cerrar} aria-label="Cerrar menú" className="dci-menu-button">✕</button>
        </div>
        <nav aria-label="Menú principal" className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">{enlaces.map(([to, label]) => <li key={to}><NavLink to={to} end={to === "/"} className={linkClass} onClick={cerrar}>{label}</NavLink></li>)}</ul>
        </nav>
        {user && <div className="border-t border-white/15 p-4"><button type="button" className="dci-nav-link w-full text-left" onClick={() => { cerrar(); logout(); }}>Cerrar sesión</button></div>}
      </aside>
      <main className={location.pathname === "/login" ? "w-full min-w-0 flex-1" : "mx-auto w-full max-w-5xl flex-1 p-4"}>{tieneRol && <OfflineActions />}{children}</main>
      </div>
    </MotionConfig>
  );
}

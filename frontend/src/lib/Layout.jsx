import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { useAuth } from "./auth.jsx";
import Logo from "./Logo.jsx";
import Notificaciones from "./Notificaciones.jsx";
import OfflineActions from "./OfflineActions.jsx";
import BotonTema from "./tema.jsx";

const linkClass = ({ isActive }) => `dci-nav-link ${isActive ? "dci-nav-active" : ""}`;
const roleLabel = (rol) => ({ ADMIN: "Administrador", OFICINA: "Oficina", OPERARIO: "Operario" }[rol] || "Cuenta sin rol");

function IconoMenu({ nombre }) {
  const props = { "aria-hidden": "true", viewBox: "0 0 24 24", className: "h-5 w-5 shrink-0", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (nombre) {
    case "Dashboard": return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
    case "Matafuegos": return <svg {...props}><path d="M8 7h8M9 4h6v3H9zM7 10h10v10H7zM10 14h4"/></svg>;
    case "Reportes": return <svg {...props}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case "Escanear": return <svg {...props}><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10M7 9v6M10 9v6M14 9v6M17 9v6"/></svg>;
    case "Planillas": return <svg {...props}><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/></svg>;
    case "Importar": return <svg {...props}><path d="M12 15V3m-4 4 4-4 4 4M4 14v6h16v-6"/></svg>;
    case "Etiquetas": return <svg {...props}><path d="M3 12V5h7l11 11-5 5L3 12z"/><circle cx="7.5" cy="8.5" r="1"/></svg>;
    case "Tickets / Soporte": return <svg {...props}><path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5"/></svg>;
    case "Panel de control": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M12 3v2M21 12h-2"/></svg>;
    case "Tutoría": return <svg {...props}><path d="m3 9 9-5 9 5-9 5-9-5zM6 11v5c4 3 8 3 12 0v-5M21 9v6"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
  }
}

export default function Layout({ children }) {
  const { user, tieneRol, esStaff, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const location = useLocation();
  const botonRef = useRef(null);
  const panelRef = useRef(null);
  const perfilRef = useRef(null);
  const nombre = user?.first_name?.trim() || user?.username || "Perfil";
  const inicial = (user?.first_name?.trim()?.[0] || user?.username?.[0] || "U").toLocaleUpperCase("es-AR");
  const cerrar = () => setAbierto(false);

  useEffect(() => { cerrar(); setPerfilAbierto(false); }, [location.pathname]);

  useEffect(() => {
    if (!abierto) return undefined;
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

  useEffect(() => {
    if (!perfilAbierto) return undefined;
    const key = (event) => {
      if (event.key === "Escape") { setPerfilAbierto(false); perfilRef.current?.querySelector("button[aria-haspopup='menu']")?.focus(); }
    };
    const afuera = (event) => { if (perfilRef.current && !perfilRef.current.contains(event.target)) setPerfilAbierto(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", afuera);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", afuera); };
  }, [perfilAbierto]);

  const enlaces = user ? [
    ...(tieneRol ? [
      ["/dashboard", "Dashboard"], ["/", "Matafuegos"], ["/escanear", "Escanear"], ["/reportes", "Reportes"],
      ...(esStaff ? [["/planillas", "Planillas"], ["/importar", "Importar"], ["/etiquetas", "Etiquetas"]] : []),
      ["/tickets", "Tickets / Soporte"], ["/panel", "Panel de control"], ["/perfil", "Perfil"],
    ] : []), ["/tutoria", "Tutoría"]
  ] : [["/tutoria", "Tutoría"], ["/login", "Ingresar"], ["/registro", "Registrarse"]];

  const salir = () => { setPerfilAbierto(false); cerrar(); logout(); };

  return (
    <MotionConfig reducedMotion="user">
      <div className="dci-layout-root flex min-h-screen w-full flex-col overflow-x-clip">
        <header className="dci-v6-header sticky top-0 z-30 w-full border-b border-white/10 bg-[#07182b]/90 shadow-[0_8px_30px_rgba(0,0,0,.2)] backdrop-blur-xl print:hidden">
          <nav aria-label="Barra superior" className="flex h-16 w-full items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
            <button ref={botonRef} type="button" className="dci-v6-menu flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-white transition-all hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="Abrir menú de navegación" aria-expanded={abierto} aria-controls="dci-drawer" onClick={() => setAbierto(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <Link to={tieneRol ? "/dashboard" : "/login"} onClick={cerrar} className="dci-v6-brand flex min-w-0 shrink items-center justify-center rounded-xl border border-cyan-500/20 bg-white/[.04] px-2 py-2 transition-all duration-300 hover:border-cyan-400/60 hover:bg-white/[.08] hover:shadow-[0_0_22px_-13px_rgba(34,211,238,.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 sm:px-3" aria-label="DCINSTALL - PANDORA, inicio">
              <Logo className="h-5 w-auto max-w-[108px] object-contain sm:h-6 sm:max-w-[155px]" />
            </Link>
            <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
              <div className="dci-header-identity hidden items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/35 px-3 py-2 md:flex"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-400"/><span className="text-[10px] font-semibold uppercase tracking-[.13em] text-cyan-200">DCINSTALL - PANDORA</span></div>
              {tieneRol && <Notificaciones />}
              <BotonTema />
              {user && <div ref={perfilRef} className="relative ml-0.5">
                <button type="button" aria-haspopup="menu" aria-expanded={perfilAbierto} aria-label={`Menú de usuario: ${nombre}, ${roleLabel(user.rol)}`} onClick={() => setPerfilAbierto((v) => !v)} className="dci-profile-trigger flex min-h-10 items-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-950/35 p-1.5 text-left transition-colors hover:border-cyan-400/60 hover:bg-cyan-900/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 sm:px-2">
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-500/15 text-sm font-bold text-cyan-100">{inicial}</span>
                  <span className="hidden min-w-0 max-w-36 sm:block"><span className="block truncate text-xs font-semibold text-slate-100">{nombre}</span><span className="block truncate text-[10px] text-cyan-200/80">{roleLabel(user.rol)}</span></span>
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 7 5 5 5-5"/></svg>
                </button>
                {perfilAbierto && <div role="menu" aria-label="Opciones de usuario" className="dci-profile-menu absolute right-0 z-[60] mt-2 w-[min(84vw,17rem)] overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/10 px-3 py-2"><p className="truncate text-sm font-semibold text-white">{nombre}</p><p className="mt-0.5 text-xs text-cyan-200/80">{roleLabel(user.rol)}</p></div>
                  {tieneRol && <Link role="menuitem" to="/perfil" onClick={() => setPerfilAbierto(false)} className="dci-profile-menu-item mt-2 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-100 transition-colors hover:bg-cyan-500/10 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><IconoMenu nombre="Perfil"/> Perfil</Link>}
                  <button role="menuitem" type="button" onClick={salir} className="dci-profile-menu-item flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-100 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>Cerrar sesión</button>
                </div>}
              </div>}
            </div>
          </nav>
          <div className="dci-mobile-brand flex min-h-7 items-center gap-2 border-t border-white/[.06] px-4 py-1 md:hidden"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-400"/><span className="text-[9px] font-semibold uppercase tracking-[.14em] text-cyan-200">DCINSTALL - PANDORA</span></div>
        </header>

        {abierto && <div className="dci-drawer-backdrop fixed inset-0 z-40 print:hidden" aria-hidden="true" onClick={cerrar} />}
        <aside ref={panelRef} id="dci-drawer" role="dialog" aria-modal="true" aria-label="Navegación principal" aria-hidden={!abierto} className={`dci-drawer fixed inset-y-0 left-0 z-50 flex w-[min(88vw,340px)] flex-col print:hidden ${abierto ? "dci-drawer-open" : ""}`} inert={!abierto ? true : undefined}>
          <div className="dci-drawer-heading flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="min-w-0"><strong className="block text-sm tracking-[.14em] text-white">DCINSTALL</strong><span className="mt-1 block text-[10px] font-semibold uppercase tracking-[.16em] text-cyan-300">Pandora · Navegación</span></div><button type="button" onClick={cerrar} aria-label="Cerrar menú" className="dci-menu-button">✕</button></div>
          <nav aria-label="Menú principal" className="flex-1 overflow-y-auto p-3 sm:p-4"><ul className="space-y-1.5">{enlaces.map(([to, label]) => <li key={to}><NavLink to={to} end={to === "/"} className={linkClass} onClick={cerrar}><IconoMenu nombre={label}/><span className="min-w-0 flex-1">{label}</span></NavLink></li>)}</ul></nav>
          {user && <div className="dci-drawer-account border-t border-white/10 p-4"><div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl border border-cyan-500/15 bg-white/[.03] p-3"><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 font-bold text-cyan-100">{inicial}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{nombre}</span><span className="block truncate text-xs text-slate-400">{roleLabel(user.rol)}</span></span></div><button type="button" className="dci-nav-link w-full text-left" onClick={salir}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg><span>Cerrar sesión</span></button></div>}
        </aside>

        <main className={location.pathname === "/login" ? "w-full min-w-0 flex-1" : "dci-main-content mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8"}>{tieneRol && <OfflineActions />}{children}</main>
      </div>
    </MotionConfig>
  );
}

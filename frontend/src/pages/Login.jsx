import ParticleOrbitBackground from "../lib/ParticleOrbitBackground.jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

const Shield = ({ className = "h-5 w-5" }) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}><path d="M12 2.5 20 6v5.5c0 5-3.3 8.3-8 10-4.7-1.7-8-5-8-10V6l8-3.5Z"/><path d="m8.7 12 2.2 2.2 4.6-4.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Arrow = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Eye = ({ open }) => <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!open && <path d="m3 21 18-18"/>}</svg>;

function StatusPanel() {
  return <div className="dci-monitor dci-v6-monitor relative mx-auto w-full max-w-[610px] overflow-hidden rounded-[22px] border border-white/10 bg-[#0b2036]/95 shadow-[0_40px_100px_-25px_rgba(0,0,0,.85)]">
    <div className="flex items-center justify-between border-b border-white/10 bg-white/[.035] px-5 py-4">
      <div className="flex items-center gap-3"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40 motion-reduce:animate-none"/><span className="relative h-2 w-2 rounded-full bg-emerald-400"/></span><span className="text-[11px] font-bold uppercase tracking-[.2em] text-slate-200">Centro de control</span></div>
      <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-300">DC / MONITOR</span>
    </div>
    <div className="dci-v6-stats grid grid-cols-3 gap-2 p-4 sm:gap-3 sm:p-5">
      {[["EQUIPOS", "—", "Inventario"], ["CONTROLES", "—", "Seguimiento"], ["ALERTAS", "—", "Vencimientos"]].map(([label, value, detail], index) => <div key={label} className="rounded-xl border border-white/[.08] bg-white/[.035] px-3 py-4 sm:px-4"><div className="mb-4 flex items-center justify-between gap-1"><span className="text-[9px] font-bold tracking-[.13em] text-slate-300 sm:text-[10px]">{label}</span><span className={`h-1.5 w-1.5 rounded-full ${index === 2 ? "bg-cyan-400" : "bg-emerald-400"}`}/></div><div className="font-mono text-2xl font-semibold text-white sm:text-3xl">{value}</div><div className="mt-1 text-[10px] text-slate-300 sm:text-xs">{detail}</div></div>)}
    </div>
    <div className="mx-4 mb-4 overflow-hidden rounded-xl border border-white/[.08] bg-[#07182b] sm:mx-5 sm:mb-5">
      <div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3"><span className="text-[11px] font-semibold tracking-wide text-white">Ciclo de inspección</span><span className="font-mono text-[10px] text-cyan-300">FLUJO OPERATIVO</span></div>
      <div className="grid grid-cols-4 gap-1 px-4 pb-5 pt-6 sm:gap-2">{[["01", "Registro"], ["02", "Inspección"], ["03", "Validación"], ["04", "Cierre"]].map(([num, label], i) => <div key={num} className="relative text-center"><div className={`relative z-10 mx-auto flex h-9 w-9 items-center justify-center rounded-full border font-mono text-xs ${i === 0 ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-white/20 bg-[#102b47] text-slate-200"}`}>{num}</div>{i < 3 && <div className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[18px] h-px bg-white/20"/>}<span className="mt-2 block text-[10px] text-slate-200 sm:text-[11px]">{label}</span></div>)}</div>
    </div>
    <div className="flex items-center justify-between border-t border-white/[.07] px-5 py-3 font-mono text-[9px] uppercase tracking-widest text-slate-300"><span>Consola de supervisión</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Entorno seguro</span></div>
  </div>;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const frame = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(frame); }, []);

  const enviar = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(form.username, form.password);
      navigate(state?.volverA || "/", { replace: true });
    } catch (err) {
      setError(err?.status === 403 ? "Demasiados intentos fallidos. Tu IP fue bloqueada por 30 minutos." : "Usuario o contraseña incorrectos.");
    } finally { setBusy(false); }
  };
  const inputStyle = "block w-full rounded-xl border border-white/15 bg-[#061426] px-4 py-3.5 text-base text-white placeholder:text-slate-400 outline-none transition-all duration-300 focus:border-cyan-400 focus:bg-[#061426] focus:ring-4 focus:ring-cyan-500/15";
  return <section className="dci-login-root dci-v6-login relative isolate flex min-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden bg-[#061426] text-white">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true"><div className="dci-tech-grid dci-v6-grid absolute inset-0 opacity-50"/><div className="absolute -left-40 top-[-15%] h-[520px] w-[520px] rounded-full bg-[#0c96bb]/25 blur-[140px]"/><div className="absolute -right-44 bottom-[-25%] h-[620px] w-[620px] rounded-full bg-[#5b5cf0]/20 blur-[140px]"/><div className="absolute left-[35%] top-[30%] h-[380px] w-[380px] rounded-full bg-cyan-800/10 blur-[130px]"/><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"/></div>
    <div className="dci-v7-orbit pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true"><ParticleOrbitBackground /></div>
    <div className="dci-v7-orbit-vignette pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
    <div className="dci-v6-stage relative z-10 mx-auto grid w-full max-w-[1440px] flex-1 items-center gap-10 px-5 py-10 sm:px-10 lg:grid-cols-[1.18fr_.82fr] lg:gap-12 lg:px-16 lg:py-14 xl:gap-20">
      <div className={`hidden min-w-0 transition-all duration-700 ease-out lg:block motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0"}`}>
        <div className="mb-7 flex items-center gap-3"><span className="h-8 w-[3px] rounded-full bg-gradient-to-b from-cyan-400 to-[#5B5CF0]"/><span className="text-[11px] font-bold uppercase tracking-[.24em] text-cyan-300">INTELIGENCIA OPERATIVA · DC INSTALL</span></div>
        <h1 className="max-w-[690px] text-5xl font-extrabold leading-[1.08] tracking-[-.045em] text-white xl:text-[66px]">Seguridad en <span className="bg-gradient-to-r from-[#b9f8ff] via-[#20d6f2] to-[#8b93ff] bg-clip-text text-transparent">tiempo real.</span><br/>Control total.</h1>
        <p className="mt-6 max-w-[540px] text-base leading-8 text-slate-200 xl:text-lg">Una plataforma para organizar inspecciones, gestionar extintores y acompañar cada etapa del mantenimiento contra incendios.</p>
        <div className="mt-9"><StatusPanel /></div>
        <div className="mt-7 flex items-center gap-3 text-xs text-slate-200"><Shield className="h-4 w-4 text-cyan-400"/><span>Gestión de equipos · Inspecciones · Trazabilidad</span></div>
      </div>
      <div className={`relative mx-auto w-full max-w-[470px] transition-all delay-100 duration-700 ease-out motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-cyan-500/10 via-transparent to-indigo-500/10 blur-2xl" aria-hidden="true"/>
        <div className="dci-v6-glass relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b2036]/85 p-7 shadow-[0_35px_90px_-20px_rgba(0,0,0,.8)] ring-1 ring-inset ring-white/[.035] backdrop-blur-2xl sm:p-10">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" aria-hidden="true"/>
          <div className="mb-8 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300"><Shield className="h-6 w-6"/></div><div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300">DC Install</div><div className="mt-1 text-xs text-slate-200">Acceso al sistema</div></div></div>
          <h2 className="text-[34px] font-bold leading-tight tracking-tight text-white sm:text-[38px]">Bienvenido<span className="text-cyan-400">.</span></h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-200">Ingresá tus credenciales para acceder al panel de control.</p>
          <form onSubmit={enviar} className="space-y-5">
            <div><label htmlFor="dci-username" className="mb-2 block text-[11px] font-semibold uppercase tracking-[.15em] text-slate-200">Usuario</label><input id="dci-username" name="username" autoComplete="username" type="text" required placeholder="Tu nombre de usuario" value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} className={inputStyle}/></div>
            <div><label htmlFor="dci-password" className="mb-2 block text-[11px] font-semibold uppercase tracking-[.15em] text-slate-200">Contraseña</label><div className="relative"><input id="dci-password" name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} required placeholder="Tu contraseña" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className={`${inputStyle} pr-12`}/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="absolute inset-y-0 right-2 flex w-10 items-center justify-center rounded-lg text-slate-200 transition-colors hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"><Eye open={showPassword}/></button></div></div>
            {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/80 px-4 py-3 text-sm text-white">{error}</p>}
            <button type="submit" disabled={busy} className="dci-v6-cta group mt-2 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#0B6B87] via-[#0e86a8] to-[#5B5CF0] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-950/40 transition-all duration-300 ease-out hover:scale-[1.02] hover:from-[#0ba9ca] hover:to-[#6063e8] hover:shadow-[0_0_30px_rgba(32,214,242,.35)] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100 motion-reduce:transform-none">{busy ? "Ingresando…" : "Ingresar al sistema"}{!busy && <span className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"><Arrow/></span>}</button>
          </form>
          <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-200">¿No tenés cuenta? <Link to="/registro" className="font-bold text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 transition-colors hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400">Registrate</Link></div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] tracking-wide text-slate-300"><Shield className="h-4 w-4 text-cyan-400"/> Plataforma de gestión de seguridad industrial</p>
      </div>
    </div>
    <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/[.06] px-5 py-4 text-[10px] uppercase tracking-[.15em] text-slate-300 sm:px-10 lg:px-16"><span>DC Install / Sistema de gestión</span><span className="hidden sm:block">Seguridad contra incendios</span></div>
  </section>;
}

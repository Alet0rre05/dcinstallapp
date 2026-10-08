/** Logo de DC INSTALL (PNG con fondo transparente, texto azul marino: se lee sobre celeste y sobre claro). */
export default function Logo({ className = "h-10 w-auto" }) {
  return (
    <img
      src="/logo-dcinstall-navbar.png"
      alt="DC INSTALL"
      width="272"
      height="40"
      className={className}
      decoding="async"
    />
  );
}

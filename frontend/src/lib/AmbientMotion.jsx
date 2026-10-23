import { useEffect, useRef } from "react";

/**
 * Fondo decorativo global inspirado en trazos de partículas orbitales.
 * Se monta desde Layout para acompañar todas las rutas sin interceptar clics
 * ni modificar los datos o flujos de trabajo de la aplicación.
 */
export default function AmbientMotion() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true, desynchronized: true });
    if (!canvas || !ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastFrame = 0;
    let isVisible = !document.hidden;
    const motionPreference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduceMotion = Boolean(motionPreference?.matches);

    const particles = [];

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      // Limitar el DPR mantiene los costos de dibujo bajo control en pantallas densas.
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 540 ? 150 : width < 1000 ? 270 : 430;
      particles.length = 0;
      for (let i = 0; i < count; i += 1) {
        // Valores determinísticos: no se recalculan aleatoriamente en cada fotograma.
        const seed = i * 12.9898;
        particles.push({
          u: i / count,
          size: 0.45 + ((Math.sin(seed) + 1) / 2) * 1.15,
          drift: 2 + ((Math.cos(seed * 0.7) + 1) / 2) * 9,
          phase: seed * 0.19,
          speed: 0.6 + ((Math.sin(seed * 0.31) + 1) / 2) * 0.65,
          color: i % 17 === 0 ? 2 : i % 5 === 0 ? 1 : 0,
        });
      }
      render(reduceMotion ? 0 : performance.now() / 1000);
    };

    const pointOnSpiral = (u, time, layer = 0) => {
      const angle = u * Math.PI * 2 * 2.35 + time * 0.085 + layer * 0.085;
      const shortest = Math.min(width, height);
      const radius = shortest * 0.018 + Math.pow(u, 1.08) * Math.min(width * 0.44, height * 0.39);
      return {
        x: width * 0.5 + Math.sin(angle) * radius,
        y: height * 0.13 + u * height * 0.68 + Math.cos(angle) * radius * 0.2,
      };
    };

    const render = (time) => {
      if (!ctx || width <= 0 || height <= 0) return;
      const dark = document.documentElement.classList.contains("dark");
      const cyan = dark ? "94, 234, 255" : "11, 107, 135";
      const blue = dark ? "111, 135, 255" : "59, 75, 176";
      const mint = dark ? "91, 255, 208" : "18, 143, 131";
      const primaryAlpha = dark ? 0.64 : 0.29;
      const gridAlpha = dark ? 0.035 : 0.045;

      ctx.clearRect(0, 0, width, height);

      // Retícula casi imperceptible, similar a la superficie de fondo de la referencia.
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${cyan}, ${gridAlpha})`;
      ctx.lineWidth = 1;
      const step = width < 540 ? 38 : 54;
      for (let x = step; x < width; x += step) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, height);
      }
      for (let y = step; y < height; y += step) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
      }
      ctx.stroke();

      // Resplandor central suave. No cubre los componentes, ya que la capa es translúcida.
      const glowRadius = Math.min(width, height) * 0.42;
      const glow = ctx.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.42, glowRadius);
      glow.addColorStop(0, dark ? "rgba(28, 191, 221, 0.075)" : "rgba(94, 218, 245, 0.09)");
      glow.addColorStop(0.55, dark ? "rgba(55, 92, 201, 0.035)" : "rgba(59, 75, 176, 0.025)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Líneas orbitales muy sutiles detrás del contenido.
      for (let layer = 0; layer < 2; layer += 1) {
        ctx.beginPath();
        for (let i = 0; i <= 280; i += 1) {
          const p = pointOnSpiral(i / 280, time, layer);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = layer === 0
          ? `rgba(${cyan}, ${dark ? 0.16 : 0.105})`
          : `rgba(${blue}, ${dark ? 0.075 : 0.055})`;
        ctx.lineWidth = layer === 0 ? 0.8 : 0.6;
        ctx.stroke();
      }

      // Partículas distribuidas sobre la espiral. El desplazamiento es lento y continuo.
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const u = (particle.u + (reduceMotion ? 0 : time * 0.008 * particle.speed)) % 1;
        const p = pointOnSpiral(u, time);
        const sway = reduceMotion ? 0 : Math.sin(time * 0.6 + particle.phase) * particle.drift;
        const x = p.x + Math.cos(particle.phase) * sway;
        const y = p.y + Math.sin(particle.phase * 0.8) * sway * 0.42;
        const shimmer = reduceMotion ? 0.72 : 0.46 + (Math.sin(time * 1.2 + particle.phase) + 1) * 0.27;
        const alpha = primaryAlpha * shimmer;
        const color = particle.color === 2 ? mint : particle.color === 1 ? blue : cyan;
        const size = particle.size * (particle.color === 2 ? 1.35 : 1);

        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);

        // Un pequeño destello en una minoría de partículas, evitando shadowBlur por rendimiento.
        if (particle.color === 2 && !reduceMotion) {
          ctx.beginPath();
          ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${mint}, ${alpha * 0.19})`;
          ctx.fill();
        }
      }

      // Polvo ambiental en el centro: pocos puntos, con opacidad deliberadamente baja.
      const dustCount = width < 540 ? 28 : 52;
      for (let i = 0; i < dustCount; i += 1) {
        const phase = i * 17.17;
        const driftTime = reduceMotion ? 0 : time * (0.04 + (i % 4) * 0.012);
        const x = ((Math.sin(phase) * 0.5 + 0.5) * width + driftTime * 9) % width;
        const y = ((Math.cos(phase * 0.7) * 0.5 + 0.5) * height + driftTime * 4) % height;
        ctx.fillStyle = `rgba(${i % 3 === 0 ? blue : cyan}, ${dark ? 0.24 : 0.13})`;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    };

    const tick = (timestamp) => {
      if (!isVisible || reduceMotion) return;
      if (timestamp - lastFrame >= 33) {
        lastFrame = timestamp;
        render(timestamp / 1000);
      }
      frameId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      window.cancelAnimationFrame(frameId);
      if (isVisible && !reduceMotion) frameId = window.requestAnimationFrame(tick);
      else render(0);
    };

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      start();
    };

    const onMotionPreferenceChange = (event) => {
      reduceMotion = event.matches;
      start();
    };

    const themeObserver = new MutationObserver(() => {
      if (reduceMotion) render(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (motionPreference?.addEventListener) motionPreference.addEventListener("change", onMotionPreferenceChange);
    else motionPreference?.addListener?.(onMotionPreferenceChange);

    resize();
    start();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (motionPreference?.removeEventListener) motionPreference.removeEventListener("change", onMotionPreferenceChange);
      else motionPreference?.removeListener?.(onMotionPreferenceChange);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="dci-ambient-canvas print:hidden"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

import { useEffect, useRef } from "react";

/**
 * Fondo ambiental compartido (Canvas 2D nativo): núcleo luminoso cian con partículas en órbitas
 * elípticas, rastros de baja opacidad y destellos puntuales.
 *
 * Rendimiento:
 *  - Un solo requestAnimationFrame; NADA de esto pasa por el estado de React (cero renders por fotograma).
 *  - Densidad: 250-450 partículas en escritorio, 60-150 en celular (según el área de la pantalla).
 *  - Se detiene con la pestaña inactiva (visibilitychange) y con `prefers-reduced-motion`
 *    (en ese caso dibuja un solo cuadro estático).
 *  - Calidad adaptativa: si los fotogramas tardan demasiado, baja la cantidad de partículas.
 *  - Resolución limitada a 1,5x para no gastar batería en pantallas de alta densidad.
 *
 * Tema: observa la clase "dark" de <html> (la maneja tema.jsx). Claro = partículas cian sin brillos
 * (no restan legibilidad); oscuro = más brillantes, con halos suaves.
 *
 * Se monta UNA vez en Layout.jsx, fuera de las rutas: no se reinicia al cambiar de pantalla.
 */

const TAU = Math.PI * 2;
const DPR_MAX = 1.5;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Paletas [r, g, b]
const PALETA = {
  claro: { cian: [18, 160, 190], indigo: [91, 92, 240], nucleo: [94, 218, 245] },
  oscuro: { cian: [32, 214, 242], claro: [142, 235, 250], indigo: [139, 147, 255], nucleo: [32, 214, 242] },
};

function crearSprite(tam, [r, g, b]) {
  // Punto con halo suave, dibujado una sola vez y reutilizado con drawImage
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const x = c.getContext("2d");
  const g2 = x.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  g2.addColorStop(0, `rgba(${r},${g},${b},1)`);
  g2.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
  g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = g2;
  x.fillRect(0, 0, tam, tam);
  return c;
}

export default function ParticleOrbitBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const html = document.documentElement;
    const mqReducido = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    let w = 0, h = 0, dpr = 1;
    let oscuro = html.classList.contains("dark");
    let reducido = !!mqReducido?.matches;
    let movil = false;
    let nucleo = { x: 0, y: 0, r: 0 };
    let orbitas = [];
    let particulas = [];
    let activas = 0; // cuántas se dibujan (baja si el equipo no da abasto)
    let minimo = 0;
    let sprites = null;
    let destellos = [];
    let proxDestello = 0;
    let raf = 0;
    let ultimo = 0;
    let tiempo = 0;
    let lentos = 0;
    let corriendo = false;
    let temporizadorResize = 0;

    const estado = (e) => { canvas.dataset.estado = e; };

    // -- Construcción -----------------------------------------------------------------------
    function construir() {
      w = window.innerWidth;
      h = window.innerHeight;
      movil = w < 768;
      dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nucleo = movil
        ? { x: w * 0.62, y: h * 0.2, r: Math.max(w, h) * 0.22 }
        : { x: w * 0.72, y: h * 0.3, r: Math.max(w, h) * 0.2 };

      // Órbitas elípticas inclinadas, de adentro hacia afuera
      const base = Math.max(w, h) * (movil ? 0.5 : 0.55);
      orbitas = Array.from({ length: movil ? 4 : 6 }, (_, i) => {
        const rx = base * (0.22 + i * 0.16);
        const inclinacion = -0.5 + i * 0.18 + rnd(-0.06, 0.06);
        return {
          rx,
          ry: rx * rnd(0.3, 0.5),
          cos: Math.cos(inclinacion),
          sin: Math.sin(inclinacion),
          vel: rnd(0.05, 0.14) * (i % 2 ? 1 : -1) * (1.2 - i * 0.12), // rad/s, las de adentro más rápido
        };
      });

      const area = w * h;
      const total = movil ? clamp(Math.round(area / 5200), 60, 150) : clamp(Math.round(area / 4600), 250, 450);
      minimo = movil ? 40 : 150;
      particulas = Array.from({ length: total }, () => {
        const o = Math.floor(Math.random() * orbitas.length);
        const tono = Math.random();
        return {
          o,
          ang: rnd(0, TAU),
          jit: rnd(-0.07, 0.07), // desvío radial respecto de la órbita
          vel: rnd(0.8, 1.25),
          tam: rnd(0.6, 1.9),
          alfa: rnd(0.35, 0.95),
          tono: tono < 0.7 ? 0 : tono < 0.9 ? 1 : 2, // 0 cian · 1 claro/cian · 2 índigo
        };
      });
      activas = particulas.length;
      lentos = 0;
      canvas.dataset.particulas = String(activas);
      armarSprites();
    }

    function armarSprites() {
      if (!oscuro) { sprites = null; return; }
      const p = PALETA.oscuro;
      sprites = [crearSprite(32, p.cian), crearSprite(32, p.claro), crearSprite(32, p.indigo), crearSprite(256, p.nucleo)];
    }

    // -- Geometría --------------------------------------------------------------------------
    // Posición de un punto en la órbita `o` con ángulo `a` (elipse inclinada alrededor del núcleo)
    function punto(o, a, jit, salida) {
      const ex = o.rx * (1 + jit) * Math.cos(a);
      const ey = o.ry * (1 + jit) * Math.sin(a);
      salida.x = nucleo.x + ex * o.cos - ey * o.sin;
      salida.y = nucleo.y + ex * o.sin + ey * o.cos;
    }
    const pa = { x: 0, y: 0 };
    const pb = { x: 0, y: 0 };

    // -- Dibujo -----------------------------------------------------------------------------
    function dibujar(dt) {
      ctx.clearRect(0, 0, w, h);
      const pal = oscuro ? PALETA.oscuro : PALETA.claro;
      const pulso = 1 + Math.sin(tiempo * 0.9) * 0.05;

      // Núcleo luminoso
      if (oscuro && sprites) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.5;
        const d = nucleo.r * 2 * pulso;
        ctx.drawImage(sprites[3], nucleo.x - d / 2, nucleo.y - d / 2, d, d);
        ctx.globalAlpha = 0.85;
        const d2 = nucleo.r * 0.45 * pulso;
        ctx.drawImage(sprites[3], nucleo.x - d2 / 2, nucleo.y - d2 / 2, d2, d2);
      } else {
        // Claro: difuminado muy tenue, sin brillo, para no restar legibilidad
        const g = ctx.createRadialGradient(nucleo.x, nucleo.y, 0, nucleo.x, nucleo.y, nucleo.r * pulso);
        const [r, gg, b] = pal.nucleo;
        g.addColorStop(0, `rgba(${r},${gg},${b},0.22)`);
        g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(nucleo.x - nucleo.r, nucleo.y - nucleo.r, nucleo.r * 2, nucleo.r * 2);
      }

      // Partículas con rastro
      ctx.lineCap = "round";
      for (let i = 0; i < activas; i++) {
        const p = particulas[i];
        const o = orbitas[p.o];
        p.ang += o.vel * p.vel * dt;
        punto(o, p.ang, p.jit, pa);
        if (pa.x < -20 || pa.x > w + 20 || pa.y < -20 || pa.y > h + 20) continue;

        const rastro = 0.07 + p.vel * 0.03; // radianes hacia atrás
        punto(o, p.ang - Math.sign(o.vel) * rastro, p.jit, pb);

        if (oscuro) {
          const col = p.tono === 0 ? pal.cian : p.tono === 1 ? pal.claro : pal.indigo;
          ctx.globalAlpha = 1; // el rastro lleva su propia opacidad
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.alfa * 0.28})`;
          ctx.lineWidth = p.tam * 0.8;
          ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pa.x, pa.y); ctx.stroke();
          ctx.globalAlpha = p.alfa;
          const d = p.tam * 7;
          ctx.drawImage(sprites[p.tono], pa.x - d / 2, pa.y - d / 2, d, d);
        } else {
          const col = p.tono === 2 ? pal.indigo : pal.cian;
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.alfa * 0.16})`;
          ctx.lineWidth = p.tam * 0.7;
          ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pa.x, pa.y); ctx.stroke();
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.alfa * 0.32})`;
          ctx.beginPath(); ctx.arc(pa.x, pa.y, p.tam * 0.9, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Destellos puntuales
      for (let i = destellos.length - 1; i >= 0; i--) {
        const d = destellos[i];
        d.vida += dt;
        if (d.vida >= d.dura) { destellos.splice(i, 1); continue; }
        const k = Math.sin((d.vida / d.dura) * Math.PI); // sube y baja
        const col = oscuro ? pal.claro : pal.cian;
        const a = (oscuro ? 0.9 : 0.35) * k;
        const l = d.tam * (0.6 + k);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x - l, d.y); ctx.lineTo(d.x + l, d.y);
        ctx.moveTo(d.x, d.y - l); ctx.lineTo(d.x, d.y + l);
        ctx.stroke();
      }
    }

    function nuevoDestello() {
      if (!particulas.length) return;
      const p = particulas[Math.floor(Math.random() * particulas.length)];
      punto(orbitas[p.o], p.ang, p.jit, pa);
      destellos.push({ x: pa.x, y: pa.y, vida: 0, dura: rnd(0.5, 1.1), tam: rnd(3, 7) });
    }

    // -- Bucle ------------------------------------------------------------------------------
    function cuadro(t) {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016);
      ultimo = t;
      tiempo += dt;

      proxDestello -= dt;
      if (proxDestello <= 0 && destellos.length < (oscuro ? 10 : 5)) {
        nuevoDestello();
        proxDestello = rnd(0.25, 0.7);
      }

      const t0 = performance.now();
      dibujar(dt);
      const costo = performance.now() - t0;

      // Calidad adaptativa: si dibujar cuesta mucho de forma sostenida, se reduce la densidad
      lentos = costo > 9 ? lentos + 1 : Math.max(0, lentos - 1);
      if (lentos > 60 && activas > minimo) {
        activas = Math.max(minimo, Math.floor(activas * 0.8));
        canvas.dataset.particulas = String(activas);
        lentos = 0;
      }
    }

    function iniciar() {
      if (corriendo || reducido || document.hidden) return;
      corriendo = true;
      ultimo = performance.now();
      raf = requestAnimationFrame(cuadro);
      estado("animando");
    }

    function detener() {
      if (!corriendo) return;
      corriendo = false;
      cancelAnimationFrame(raf);
    }

    function cuadroEstatico() {
      dibujar(0);
      estado("estatico");
    }

    // -- Eventos ----------------------------------------------------------------------------
    const alVisibilidad = () => {
      if (document.hidden) { detener(); estado("pausado"); } else if (!reducido) iniciar();
    };

    const alRedimensionar = () => {
      clearTimeout(temporizadorResize);
      temporizadorResize = setTimeout(() => {
        construir();
        if (!corriendo) cuadroEstatico();
      }, 150);
    };

    const alCambiarMovimiento = () => {
      reducido = !!mqReducido.matches;
      if (reducido) { detener(); cuadroEstatico(); } else { iniciar(); }
    };

    // Cambio de tema (clase "dark" en <html>): se rehacen los sprites y, si está quieto, se redibuja
    const observador = new MutationObserver(() => {
      const ahora = html.classList.contains("dark");
      if (ahora === oscuro) return;
      oscuro = ahora;
      armarSprites();
      if (!corriendo) cuadroEstatico();
    });

    construir();
    observador.observe(html, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", alVisibilidad);
    window.addEventListener("resize", alRedimensionar);
    mqReducido?.addEventListener?.("change", alCambiarMovimiento);

    if (reducido || document.hidden) { cuadroEstatico(); if (document.hidden) estado("pausado"); } else iniciar();

    return () => {
      detener();
      clearTimeout(temporizadorResize);
      observador.disconnect();
      document.removeEventListener("visibilitychange", alVisibilidad);
      window.removeEventListener("resize", alRedimensionar);
      mqReducido?.removeEventListener?.("change", alCambiarMovimiento);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full print:hidden"
    />
  );
}

/**
 * ParticleField — houle de particules en 3D rendue dans un <canvas>.
 *
 * Une grille de points posée sur un plan ondule lentement ; elle est projetée
 * en perspective (les points lointains rapetissent et s'estompent vers
 * l'horizon). La caméra suit légèrement la souris pour un effet de parallaxe.
 *
 * Usage :
 *   const field = new ParticleField(document.querySelector("#bg-3d"));
 *   field.start();
 *   // field.stop(); field.destroy();
 */
(function (global) {
  "use strict";

  const DEFAULTS = {
    cols: 110,
    rows: 46,
    color: "237, 237, 239", // RGB des points
    accent: "124, 242, 176", // RGB des crêtes
    amplitude: 0.55,
    speed: 1,
    parallax: 1,
    horizon: 0.5, // position de l'horizon (0 = haut, 1 = bas)
    maxDpr: 2,
  };

  const Z_NEAR = 1.2;
  const Z_FAR = 14;
  const SPAN_X = 16; // largeur du plan (unités monde)
  const CAM_HEIGHT = 1.6;

  class ParticleField {
    /**
     * @param {HTMLElement} container élément qui recevra le canvas
     * @param {Partial<typeof DEFAULTS>} [options]
     */
    constructor(container, options = {}) {
      if (!container) throw new Error("ParticleField : conteneur introuvable");

      this.opts = { ...DEFAULTS, ...options };
      this.container = container;
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("aria-hidden", "true");
      this.ctx = this.canvas.getContext("2d");
      container.appendChild(this.canvas);

      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.running = false;
      this.rafId = 0;
      this.lastTime = 0;
      this.time = 0;
      this.cam = { x: 0, y: 0, tx: 0, ty: 0 };

      this._frame = this._frame.bind(this);
      this._onResize = this._debounce(() => this._setup(), 150);
      this._onPointer = (e) => {
        this.cam.tx = (e.clientX / this.width - 0.5) * 1.2 * this.opts.parallax;
        this.cam.ty = (e.clientY / this.height - 0.5) * 0.35 * this.opts.parallax;
      };

      window.addEventListener("resize", this._onResize);
      window.addEventListener("pointermove", this._onPointer, { passive: true });

      this._setup();
    }

    start() {
      if (this.running) return this;
      if (this.reducedMotion) {
        this._render();
        return this;
      }
      this.running = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this._frame);
      return this;
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
      return this;
    }

    destroy() {
      this.stop();
      window.removeEventListener("resize", this._onResize);
      window.removeEventListener("pointermove", this._onPointer);
      this.canvas.remove();
    }

    _setup() {
      const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
      this.width = this.container.clientWidth || window.innerWidth;
      this.height = this.container.clientHeight || window.innerHeight;
      this.canvas.width = Math.round(this.width * dpr);
      this.canvas.height = Math.round(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Moins de points sur petit écran
      const ratio = this.width < 700 ? 0.55 : 1;
      this.cols = Math.round(this.opts.cols * ratio);
      this.rows = Math.round(this.opts.rows * (ratio < 1 ? 0.8 : 1));

      if (!this.running) this._render();
    }

    _frame(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.time += dt * this.opts.speed;

      const k = Math.min(dt * 2, 1);
      this.cam.x += (this.cam.tx - this.cam.x) * k;
      this.cam.y += (this.cam.ty - this.cam.y) * k;

      this._render();
      this.rafId = requestAnimationFrame(this._frame);
    }

    _render() {
      const { ctx, width: W, height: H, cam, time: t, cols, rows } = this;
      const { amplitude, color, accent, horizon } = this.opts;
      const focal = Math.max(W, 700) * 0.55;
      const cx = W / 2;
      const cy = H * horizon;

      ctx.clearRect(0, 0, W, H);

      for (let r = 0; r < rows; r++) {
        // Espacement logarithmique : rangées régulières à l'écran
        const f = r / (rows - 1);
        const z = Z_NEAR * Math.pow(Z_FAR / Z_NEAR, f);
        const depth = 1 - f; // 1 devant, 0 au fond
        const scale = focal / z;

        for (let c = 0; c < cols; c++) {
          const x = (c / (cols - 1) - 0.5) * SPAN_X;

          // Houle : deux ondes croisées + une ondulation radiale lente
          const y =
            amplitude *
            (Math.sin(x * 0.55 + t * 0.6) * 0.5 +
              Math.cos(z * 0.45 - t * 0.5) * 0.5 +
              Math.sin(Math.hypot(x, z - 6) * 0.7 - t * 0.9) * 0.35);

          const sx = cx + (x - cam.x) * scale;
          if (sx < -4 || sx > W + 4) continue;
          const sy = cy + (CAM_HEIGHT + cam.y - y) * scale * 0.42;
          if (sy < -4 || sy > H + 4) continue;

          // Estompe vers le fond et sur les bords latéraux
          const edge = 1 - Math.abs(c / (cols - 1) - 0.5) * 2;
          const alpha = depth * depth * Math.min(edge * 2.5, 1) * 0.6;
          if (alpha < 0.02) continue;

          const crest = y > amplitude * 0.75;
          const size = Math.max(0.8, 2.4 * depth + (crest ? 0.6 : 0));

          ctx.fillStyle = `rgba(${crest ? accent : color}, ${alpha.toFixed(3)})`;
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        }
      }
    }

    _debounce(fn, ms) {
      let id = 0;
      return () => {
        clearTimeout(id);
        id = setTimeout(fn, ms);
      };
    }
  }

  global.ParticleField = ParticleField;
  if (typeof module !== "undefined" && module.exports) module.exports = ParticleField;
})(typeof window !== "undefined" ? window : globalThis);

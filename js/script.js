  ;(() => {
    const canvas = document.getElementById('bg');
    const ctx = canvas.getContext('2d', { alpha: false });

    const state = {
      cols: 0,
      rows: 0,
      cell: 24,           // tamaño de celda base (px @1x)
      t: 0,               // tiempo acumulado
      speed: 0.6,         // velocidad de animación
      hueCycle: true,     // rotar el color con el tiempo
      glow: 28,           // blur/glow en px (aplica como sombra)
      pointer: { x: 0, y: 0, down: false },
    };

    const ui = {
      density: document.getElementById('density'),
      speed: document.getElementById('speed'),
      hueCycle: document.getElementById('hueCycle'),
      glow: document.getElementById('glow'),
    };
    ui.density.addEventListener('input', () => { 
      state.cell = Number(ui.density.value); resize(); 
    });
    ui.speed.addEventListener('input', () => {
      state.speed = Number(ui.speed.value) / 100; 
    });
    ui.hueCycle.addEventListener('change', () => {
      state.hueCycle = ui.hueCycle.checked;
    });
    ui.glow.addEventListener('input', () => {
      state.glow = Number(ui.glow.value);
    });

    function resize() {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { innerWidth: w, innerHeight: h } = window;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      state.cols = Math.ceil(w / state.cell) + 2;
      state.rows = Math.ceil(h / state.cell) + 2;
    }
    resize();

    function hash(n) {
      return Math.sin(n * 127.1) * 43758.5453123 % 1;
    }
    function noise2D(x, y) {
      const i = Math.floor(x), j = Math.floor(y);
      const fX = x - i, fY = y - j;
      const u = fX * fX * (3 - 2 * fX);
      const v = fY * fY * (3 - 2 * fY);
      const a = hash(i + j * 57);
      const b = hash(i + 1 + j * 57);
      const c = hash(i + (j + 1) * 57);
      const d = hash(i + 1 + (j + 1) * 57);
      return (
        a * (1 - u) * (1 - v) +
        b * u * (1 - v) +
        c * (1 - u) * v +
        d * u * v
      );
    }

    const mouse = state.pointer;
    function onPointer(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      mouse.y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    }
    window.addEventListener('mousemove', onPointer, { passive: true });
    window.addEventListener('touchmove', onPointer, { passive: true });
    window.addEventListener('mousedown', () => (mouse.down = true));
    window.addEventListener('mouseup', () => (mouse.down = false));
    window.addEventListener('touchstart', (e) => { onPointer(e); mouse.down = true; });
    window.addEventListener('touchend', () => (mouse.down = false));

    let last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      state.t += dt * state.speed;

      draw();
      requestAnimationFrame(tick);
    }

    function draw() {
      const { innerWidth: w, innerHeight: h } = window;

      const grad = ctx.createRadialGradient(
        w * 0.5, h * 0.5, Math.min(w, h) * 0.1,
        w * 0.5, h * 0.5, Math.max(w, h) * 0.8
      );
      grad.addColorStop(0, '#050708');
      grad.addColorStop(1, '#0b0f10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const t = state.t;
      const baseHue = state.hueCycle ? ((t * 40) % 360) : 120; // 120 ≈ verde Razer

      ctx.shadowBlur = state.glow;
      ctx.shadowColor = `hsl(${baseHue}, 100%, 55%)`;

      const size = state.cell;
      const nScale = 0.04;

      for (let r = -1; r < state.rows; r++) {
        for (let c = -1; c < state.cols; c++) {
          const x = c * size;
          const y = r * size;

          const nx = c * nScale + t * 0.25;
          const ny = r * nScale + t * 0.25;
          let n = noise2D(nx, ny);

          const dx = (x + size * 0.5) - mouse.x;
          const dy = (y + size * 0.5) - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ripple = Math.sin(dist * 0.06 - t * 4) * Math.exp(-dist * 0.004);

          const intensity = Math.max(0, Math.min(1, n * 0.75 + ripple * (mouse.down ? 0.55 : 0.35)));

          const s = size * (0.35 + intensity * 0.65);
          const cx = x + (size - s) * 0.5;
          const cy = y + (size - s) * 0.5;

          const hue = (baseHue + intensity * 40) % 360;
          const sat = 95;
          const light = 40 + intensity * 20;
          ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;

          const radius = Math.min(8, s * 0.18);
          roundedRect(ctx, cx, cy, s, s, radius);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
    }

    function roundedRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w * 0.5, h * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    let rAF = null;
    window.addEventListener('resize', () => {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(resize);
    });

    requestAnimationFrame(tick);
  })();
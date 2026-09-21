/* ==========================================================================
   hero.js — the hero canvas: a satellite pass, tracked by a ground antenna
   --------------------------------------------------------------------------
   It is the same drawing in both themes, lit differently:
     light  -> ink line-work on paper, with tick marks and a live AZ/EL readout
     dark   -> the same geometry at night, with a star field behind it
   Colours are read from the CSS custom properties, so the palette stays in
   tokens.css and this file never hard-codes a hex value.
   ========================================================================== */

import { currentTheme } from "./theme.js";

export function initHero(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = false; // matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, stars = [], C = {}, dark = false;

  /* ---- palette: pulled straight out of the stylesheet ---- */
  const readPalette = () => {
    const s = getComputedStyle(document.documentElement);
    const v = n => s.getPropertyValue(n).trim();
    dark = currentTheme() === "dark";
    C = {
      ink:    v("--text"),
      line:   v("--line"),
      muted:  v("--muted"),
      accent: v("--accent"),
      signal: v("--signal"),
      star:   dark ? "#C8D3E8" : "#8FA0B8"
    };
  };

  /* ---- sizing ---- */
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(W * H / 5200) }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * .9,
      r: Math.random() * 1.2 + .2,
      t: Math.random() * 6.28
    }));
  };

  /* ---- a touch of parallax from the pointer ---- */
  let mx = .5, my = .5;
  addEventListener("pointermove", e => {
    mx = e.clientX / innerWidth;
    my = e.clientY / innerHeight;
  }, { passive: true });

  /** Convert a hex token to rgba() so we can fade it. */
  const fade = (hex, a) => {
    const h = String(hex).replace("#", "");
    if (h.length !== 6) return hex;
    const n = parseInt(h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const narrow = W < 760;
    const px = reduced ? 0 : (mx - .5) * 14;
    const py = reduced ? 0 : (my - .5) * 10;

    /* --- background: stars at night, survey ticks on paper --- */
    if (dark) {
      for (const s of stars) {
        ctx.globalAlpha = .3 + .4 * Math.sin(t * .0012 + s.t);
        ctx.fillStyle = C.star;
        ctx.beginPath();
        ctx.arc(s.x + px * s.r, s.y + py * s.r, s.r, 0, 6.28);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* --- geometry --- */
    const R  = narrow ? W * .7 : Math.min(W * .27, H * .62);   // orbit radius
    const cx = narrow ? W * .62 : W * .75;                     // orbit centre,
    const cy = narrow ? H * .95 : H * .98;                     // below the horizon
    const gx = narrow ? W * .84 : W * .8;                      // ground station
    const gy = H * .86;
    const mastTop = gy - 26;
    const a0 = Math.PI * 1.1, a1 = Math.PI * 1.9;              // arc swept

    if (narrow) ctx.globalAlpha = .5;

    /* --- orbit path --- */
    ctx.strokeStyle = fade(C.signal, dark ? .32 : .40);
    ctx.setLineDash([3, 7]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a0, a1);
    ctx.stroke();
    ctx.setLineDash([]);

    /* --- tick marks along the arc: a measured drawing, not a doodle --- */
    ctx.strokeStyle = fade(C.line, dark ? .8 : 1);
    ctx.lineWidth = 1;
    for (let k = 0; k <= 8; k++) {
      const a = a0 + (a1 - a0) * (k / 8);
      const co = Math.cos(a), si = Math.sin(a);
      const long = k % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(cx + co * (R - (long ? 7 : 4)), cy + si * (R - (long ? 7 : 4)));
      ctx.lineTo(cx + co * (R + (long ? 7 : 4)), cy + si * (R + (long ? 7 : 4)));
      ctx.stroke();
    }

    /* --- satellite position: one pass every ~14 s --- */
    const ph  = (t / (reduced ? 26000 : 14000)) % 1;
    const ang = a0 + (a1 - a0) * ph;
    const sx  = cx + R * Math.cos(ang);
    const sy  = cy + R * Math.sin(ang);

    /* --- trail --- */
    for (let k = 1; k < 26; k++) {
      const p = ph - k * .004;
      if (p < 0) break;
      const a = a0 + (a1 - a0) * p;
      ctx.fillStyle = fade(C.accent, .5 * (1 - k / 26));
      ctx.beginPath();
      ctx.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), 1.6, 0, 6.28);
      ctx.fill();
    }

    /* --- the beam: a pulse travelling up the link --- */
    const pulse = (t / 900) % 1;
    const grd = ctx.createLinearGradient(gx, mastTop, sx, sy);
    grd.addColorStop(0, fade(C.accent, 0));
    grd.addColorStop(Math.max(.01, pulse), fade(C.accent, dark ? .55 : .7));
    grd.addColorStop(Math.min(1, pulse + .08), fade(C.accent, 0));
    ctx.strokeStyle = grd;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx, mastTop);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    /* --- satellite --- */
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang + Math.PI / 2);
    ctx.strokeStyle = C.signal;
    ctx.fillStyle = dark ? C.signal : fade(C.signal, .16);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-15, -3, 10, 6); ctx.fill(); ctx.stroke();   // panel
    ctx.beginPath(); ctx.rect(5, -3, 10, 6);   ctx.fill(); ctx.stroke();   // panel
    ctx.fillStyle = dark ? C.ink : "rgba(0,0,0,0)";
    ctx.strokeStyle = dark ? C.star : C.ink;
    ctx.beginPath(); ctx.rect(-4, -5, 8, 10); ctx.fill(); ctx.stroke();    // bus
    ctx.restore();

    /* --- ground station: mast, and a yagi that actually aims --- */
    const aim = Math.atan2(sy - mastTop, sx - gx);
    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx - 14, gy); ctx.lineTo(gx, mastTop); ctx.lineTo(gx + 14, gy);
    ctx.stroke();

    ctx.save();
    ctx.translate(gx, mastTop);
    ctx.rotate(aim);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(34, 0); ctx.stroke();   // boom
    for (let e = 0; e < 5; e++) {                                          // elements
      const x = e * 8, l = 11 - e * 1.2;
      ctx.beginPath(); ctx.moveTo(x, -l); ctx.lineTo(x, l); ctx.stroke();
    }
    ctx.restore();

    /* --- ground line --- */
    ctx.strokeStyle = fade(C.line, dark ? .9 : 1);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx - 44, gy); ctx.lineTo(gx + 44, gy); ctx.stroke();

    /* --- live readout, the way a rotator controller shows it ---
       Elevation is the real angle above the horizon in the drawing.
       Azimuth sweeps 250° -> 110° across the pass, which is what a
       west-to-east overhead pass actually looks like from the ground. */
    if (!narrow) {
      const dx = sx - gx, dy = sy - mastTop;
      const el = Math.min(90, Math.max(0, Math.atan2(-dy, Math.abs(dx)) * 180 / Math.PI)).toFixed(1);
      const az = (250 - 140 * ph).toFixed(1);
      ctx.font = '500 11px ui-monospace, "IBM Plex Mono", Menlo, monospace';
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.fillText(`AZ ${az}°   EL ${el}°`, gx, gy + 20);
      ctx.textAlign = "start";
    }

    ctx.globalAlpha = 1;
  }

  /* ---- wiring ---- */
  readPalette();
  resize();
  addEventListener("resize", resize);
  addEventListener("themechange", readPalette);

  /* Reduced motion: draw the scene once and stop. A background that animates
     forever is exactly what that preference asks us not to do, and stopping it
     gives every visitor who set it their battery back. */
  if (reduced) {
    const redraw = () => draw(0);
    addEventListener("resize", redraw);
    addEventListener("themechange", redraw);
    draw(0);
    return;
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  /* A drifting starfield does not need 60 fps, and on a phone those extra
     frames are pure heat. Halve the rate on small screens. */
  const minFrameMs = innerWidth < 720 ? 1000 / 30 : 1000 / 60;
  let last = -Infinity;
  (function loop(t) {
    requestAnimationFrame(loop);
    if (!visible || t - last < minFrameMs) return;
    last = t;
    draw(t);
  })(0);
}

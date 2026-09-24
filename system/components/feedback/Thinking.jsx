import React from "react";

const LABELS = { connecting: "Connecting", listening: "Listening", thinking: "Thinking", searching: "Searching", speaking: "Speaking" };

const SIZES = {
  sm: "var(--dt-thinking-size-inline, var(--dt-size-icon-md))",
  md: "var(--dt-size-icon-xl)",
  lg: "var(--dt-dim-16)",
  xl: "var(--dt-thinking-size-overlay, var(--dt-dim-40))",
};

const TONES = {
  brand: ["var(--dt-thinking-color-start, var(--dt-color-primary-400))", "var(--dt-thinking-color-end, var(--dt-color-primary-700))"],
  primary: ["var(--dt-thinking-primary-start, var(--dt-color-primary-400))", "var(--dt-thinking-primary-end, var(--dt-color-primary-700))"],
  secondary: ["var(--dt-thinking-secondary-start, var(--dt-color-secondary-400))", "var(--dt-thinking-secondary-end, var(--dt-color-secondary-700))"],
  duotone: ["var(--dt-thinking-primary-start, var(--dt-color-primary-400))", "var(--dt-thinking-secondary-end, var(--dt-color-secondary-700))"],
  neutral: ["var(--dt-thinking-neutral-start, var(--dt-color-neutral-400))", "var(--dt-thinking-neutral-end, var(--dt-color-neutral-800))"],
};

const WELLS = { orb: "var(--dt-radius-pill)", tile: "var(--dt-radius-container)" };

const PARTICLES = 7;
const BARS = 5;
const TAU = Math.PI * 2;
const ENVELOPE = [0.55, 0.8, 1, 0.8, 0.55];

/* Smooth pseudo-noise in -1..1: two detuned sines per index, so each particle
   drifts on its own path and the whole never visibly repeats. */
function noise(i, t) {
  return 0.5 * Math.sin(t * (1.3 + i * 0.37) + i * 2.1) + 0.5 * Math.sin(t * (0.7 + i * 0.23) + i * 5.3);
}

/* What listening and speaking follow when no live level is passed: a restless
   hum for listening, a syllable rhythm for speaking. */
function synthLevel(state, t) {
  if (state === "listening") return 0.35 + 0.25 * noise(9, t * 2.2);
  if (state === "speaking") return Math.min(1, 0.12 + Math.abs(Math.sin(t * 6.3)) * (0.55 + 0.45 * Math.sin(t * 1.7)));
  return 0;
}

function ring(cx, cy, a, d, r) {
  return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: r };
}

/* The fluid shapes: blob, orb and tile. A centre body and its satellites,
   blurred and thresholded so they merge like liquid. Coordinates are in a
   100 by 100 box. */
function blobParts(state, t, lvl, k) {
  const P = [];
  const spread = 0.6 + 0.6 * k;
  if (state === "connecting") {
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
    P.push({ x: 50, y: 50, r: 8 + 6 * breathe });
    for (let i = 0; i < 6; i++) P.push(ring(50, 50, t * 0.6 + (i * TAU) / 6, 8 + 20 * (1 - breathe) * spread, 6.5));
  } else if (state === "listening") {
    P.push({ x: 50, y: 50, r: 15 + 8 * lvl });
    for (let i = 0; i < 5; i++) {
      const d = 11 + 13 * lvl * (0.5 + 0.5 * noise(i + 3, t * 2)) * spread;
      P.push(ring(50, 50, (i * TAU) / 5 + t * 0.25 + noise(i, t) * 0.5, d, 8 + 2 * noise(i + 7, t)));
    }
  } else if (state === "thinking") {
    P.push({ x: 50, y: 50, r: 15 });
    for (let i = 0; i < 5; i++) {
      const dir = i % 2 ? -1 : 1;
      P.push(ring(50, 50, dir * t * (0.8 + i * 0.17) + i * 1.3, 10 + (7 + 6 * noise(i, t)) * spread, 9 + 3 * noise(i + 4, t * 1.3)));
    }
  } else if (state === "searching") {
    P.push({ x: 50, y: 50, r: 13 + 1.5 * Math.sin(t * 2) });
    const a = t * 1.6;
    const d = 24 + 5 * k;
    [7.5, 6, 4.8, 3.8, 2.9].forEach((r, j) => P.push(ring(50, 50, a - j * 0.34, d, r)));
  } else {
    P.push({ x: 50, y: 50, r: 13 + 9 * lvl });
    for (let i = 0; i < 6; i++) {
      const pulse = Math.max(0, Math.sin(t * 4 - i * 0.9)) * lvl;
      P.push(ring(50, 50, (i * TAU) / 6 + t * 0.3, 10 + 18 * pulse * spread, 6.5 + 4 * pulse));
    }
  }
  /* Sized so the bodies overlap enough to read as one fluid after the
     threshold eats their soft edges. */
  return P.map((p) => ({ x: p.x, y: p.y, r: p.r * 1.35 }));
}

/* Three dots, the chat convention, still thresholded so they can touch and
   merge. */
function dotParts(state, t, lvl, k) {
  const xs = [26, 50, 74];
  const P = [];
  if (state === "connecting") {
    xs.forEach((x, i) => P.push({ x: x, y: 50, r: 5 + 4 * (0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.9)) }));
  } else if (state === "listening") {
    xs.forEach((x, i) => P.push({ x: x, y: 50, r: 6 + 8 * lvl * (0.6 + 0.4 * noise(i, t * 2)) }));
  } else if (state === "thinking") {
    xs.forEach((x, i) => P.push({ x: x, y: 50 - (8 + 8 * k) * Math.max(0, Math.sin(t * 3 - i * 0.7)), r: 8 }));
  } else if (state === "searching") {
    xs.forEach((x) => P.push({ x: x, y: 50, r: 6 }));
    P.push({ x: 50 + 30 * Math.sin(t * 1.8), y: 50, r: 9 + 2 * k });
  } else {
    xs.forEach((x, i) => P.push({ x: x, y: 50, r: 5 + 10 * lvl * Math.max(0.25, Math.abs(Math.sin(t * 5 - i * 1.1))) }));
  }
  return P.map((p) => ({ x: p.x, y: p.y, r: p.r * 1.15 }));
}

/* Five bars, the voice convention. Heights are fractions of the box. */
function barHeights(state, t, lvl, k) {
  const H = [];
  for (let i = 0; i < BARS; i++) {
    let h;
    if (state === "connecting") h = 0.2 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2 - i * 0.8));
    else if (state === "listening") h = 0.16 + 0.78 * lvl * ENVELOPE[i] * (0.7 + 0.3 * noise(i, t * 3));
    else if (state === "thinking") h = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.4 - i * 0.9)) * (0.6 + 0.6 * k);
    else if (state === "searching") {
      const p = 2 + 2 * Math.sin(t * 1.6);
      h = 0.18 + 0.7 * Math.exp(-((i - p) * (i - p)) / 0.8);
    } else h = 0.14 + 0.82 * lvl * ENVELOPE[i] * Math.abs(Math.sin(t * 6 + i * 1.7));
    H.push(Math.max(0.1, Math.min(1, h)));
  }
  return H;
}

/* The duration token, in milliseconds, read from the element itself so a
   theme or context that retunes it is honoured. */
function readDuration(node) {
  const raw = node ? getComputedStyle(node).getPropertyValue("--dt-thinking-duration").trim() : "";
  const n = parseFloat(raw);
  if (!n) return 600;
  return /ms$/.test(raw) ? n : n * 1000;
}

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = React.useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches);
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setReduced(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function Fluid({ state, shape, colors, size, speed, intensity, level }) {
  const uid = "dt-thinking-" + React.useId().replace(/[^a-zA-Z0-9-]/g, "");
  const box = React.useRef(null);
  const circles = React.useRef([]);
  const bars = React.useRef([]);
  const gradient = React.useRef(null);
  const live = React.useRef({});
  const clock = React.useRef({ t: 0, level: 0 });
  const reduced = useReducedMotion();
  live.current = { state, shape, speed, intensity, level };

  const wide = shape === "dots" || shape === "bars";
  const well = WELLS[shape];
  const dim = SIZES[size] || size || SIZES.sm;

  React.useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const c = clock.current;
    const beat = readDuration(box.current) / 600;

    function draw(now) {
      const o = live.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!reduced) c.t += (dt * Math.max(0.1, Number(o.speed) || 1)) / beat;
      const t = reduced ? 1.3 : c.t;
      const k = Math.max(0, Math.min(1, o.intensity == null ? 0.6 : Number(o.intensity)));
      const target = o.level == null ? synthLevel(o.state, t) : Math.max(0, Math.min(1, Number(o.level)));
      c.level += (target - c.level) * (reduced ? 1 : 0.25);
      const smooth = c.level;

      if (o.shape === "bars") {
        const H = barHeights(o.state, t, smooth, k);
        bars.current.forEach((rect, i) => {
          if (!rect) return;
          const h = H[i] * 56;
          rect.setAttribute("y", String(50 - h / 2));
          rect.setAttribute("height", String(h));
        });
      } else {
        const P = o.shape === "dots" ? dotParts(o.state, t, smooth, k) : blobParts(o.state, t, smooth, k);
        circles.current.forEach((node, i) => {
          if (!node) return;
          const p = P[i];
          node.setAttribute("cx", p ? p.x.toFixed(2) : "50");
          node.setAttribute("cy", p ? p.y.toFixed(2) : "50");
          node.setAttribute("r", p ? Math.max(0, p.r).toFixed(2) : "0");
        });
      }
      if (gradient.current) gradient.current.setAttribute("gradientTransform", "rotate(" + ((t * 24) % 360).toFixed(1) + " 50 50)");
      if (!reduced) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
    /* The clock lives in a ref, so a state or shape change carries on from
       where the motion was. A live level is read each frame; only a frozen,
       reduced-motion render needs redrawing when it changes. */
  }, [reduced, state, shape, reduced ? level : null]);

  const viewBox = wide ? "0 18.75 100 62.5" : well ? "8 8 84 84" : "12 12 76 76";

  return (
    <span
      ref={box}
      aria-hidden="true"
      style={{
        display: "inline-block",
        flex: "none",
        position: "relative",
        height: dim,
        width: wide ? `calc(${dim} * 1.6)` : dim,
        borderRadius: well,
        overflow: well ? "hidden" : undefined,
        background: well ? "var(--dt-thinking-surface, var(--dt-surface-brand-muted))" : undefined,
        verticalAlign: "middle",
      }}
    >
      <svg viewBox={viewBox} width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={uid + "-g"} ref={gradient} gradientUnits="userSpaceOnUse" x1="28" y1="28" x2="72" y2="72">
            <stop offset="0" style={{ stopColor: colors[0] }} />
            <stop offset="1" style={{ stopColor: colors[1] }} />
          </linearGradient>
          <filter id={uid + "-f"} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
        </defs>
        {shape === "bars" ? (
          <g fill={`url(#${uid}-g)`}>
            {Array.from({ length: BARS }, (_, i) => (
              <rect key={i} ref={(n) => (bars.current[i] = n)} x={13 + i * 16} y="44" width="10" height="12" rx="5" />
            ))}
          </g>
        ) : (
          <g filter={`url(#${uid}-f)`} fill={`url(#${uid}-g)`}>
            {Array.from({ length: PARTICLES }, (_, i) => (
              <circle key={i} ref={(n) => (circles.current[i] = n)} cx="50" cy="50" r="0" />
            ))}
          </g>
        )}
      </svg>
    </span>
  );
}

/* The textural shapes: matrix, ascii, particles and sequence. Each builds
   its figure from many small marks on a canvas, so it reads like a dot
   display or ascii art rather than a liquid. */
const FIELD_SHAPES = ["matrix", "ascii", "particles", "sequence"];
const GLYPHS = " .·:-=+*#%@";

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0, e1, x) {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
}

function frac(v) {
  return v - Math.floor(v);
}

/* A lit sphere of radius R seen from the front: bright where it faces a light
   up and to the left, dim at the far rim, zero outside. This is what gives
   the ascii and matrix figures their depth. */
function sphere(x, y, R) {
  if (R <= 0) return 0;
  const q = (x * x + y * y) / (R * R);
  if (q >= 1) return 0;
  const z = Math.sqrt(1 - q);
  const lit = (-0.45 * x - 0.55 * y) / R + 0.7 * z;
  return (0.42 + 0.58 * clamp01(lit)) * Math.min(1, (1 - Math.sqrt(q)) * 10);
}

/* One scalar field per state, 0 to 1 over a -1..1 square and masked to the
   unit disc. The matrix samples it as dot sizes, ascii as glyph density. */
function fieldAt(state, x, y, t, lvl, k) {
  const r = Math.sqrt(x * x + y * y);
  if (r > 1) return 0;
  const a = Math.atan2(y, x);
  if (state === "connecting") {
    let v = 0;
    for (let j = 0; j < 2; j++) {
      const R = 1 - frac(t * 0.35 + j * 0.5);
      const fade = Math.min(1, (1 - R) * 5) * Math.min(1, R * 2.5);
      const d = (r - R) / (0.09 + 0.06 * k);
      v = Math.max(v, Math.exp(-d * d) * fade);
    }
    return Math.max(v, sphere(x, y, 0.22 + 0.06 * Math.sin(t * 3)));
  }
  if (state === "listening") {
    const R = 0.42 + 0.42 * lvl + (0.04 + 0.07 * k) * Math.sin(3 * a + t * 2) + 0.04 * Math.sin(5 * a - t * 1.3);
    return sphere(x, y, R);
  }
  if (state === "thinking") {
    const arms = 0.5 + 0.5 * Math.sin(3 * a - 7 * r * (0.6 + 0.6 * k) + t * 2.2);
    return Math.max(arms * smoothstep(1, 0.7, r) * smoothstep(0.1, 0.32, r), sphere(x, y, 0.16));
  }
  if (state === "searching") {
    let d = (t * 1.6 - a) % TAU;
    if (d < 0) d += TAU;
    const sweep = Math.exp(-d * (1.3 - 0.6 * k)) * smoothstep(0.98, 0.85, r) * smoothstep(0.12, 0.26, r);
    const e1 = (r - 0.55) / 0.04;
    const e2 = (r - 0.92) / 0.04;
    const rings = 0.3 * Math.max(Math.exp(-e1 * e1), Math.exp(-e2 * e2));
    return Math.max(sweep, rings, sphere(x, y, 0.15));
  }
  const ripple = (0.5 + 0.5 * Math.sin(11 * r - t * 6)) * (0.4 + 0.6 * lvl) * smoothstep(1, 0.75, r);
  return Math.max(ripple * smoothstep(0.1, 0.3, r), sphere(x, y, 0.24 + 0.26 * lvl));
}

/* Any CSS colour, token output included, as [r, g, b]: painted onto a single
   pixel and read back, so oklch, color-mix and hex all resolve the same way. */
let swatch = null;
const rgbCache = {};
function toRgb(css) {
  if (rgbCache[css]) return rgbCache[css];
  if (!swatch) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    swatch = cv.getContext("2d", { willReadFrequently: true });
  }
  swatch.clearRect(0, 0, 1, 1);
  swatch.fillStyle = "#000";
  swatch.fillStyle = css;
  swatch.fillRect(0, 0, 1, 1);
  const d = swatch.getImageData(0, 0, 1, 1).data;
  return (rgbCache[css] = [d[0], d[1], d[2]]);
}

function mix(a, b, g, alpha) {
  const u = clamp01(g);
  return "rgba(" + Math.round(a[0] + (b[0] - a[0]) * u) + "," + Math.round(a[1] + (b[1] - a[1]) * u) + "," + Math.round(a[2] + (b[2] - a[2]) * u) + "," + clamp01(alpha).toFixed(3) + ")";
}

/* matrix: a dot display. Every cell keeps a faint dot so the grid shows, and
   the field swells the dots into the figure. */
function drawMatrix(ctx, W, H, st, t, lvl, k, p) {
  let n = Math.max(5, Math.min(19, Math.round(Math.min(W, H) / 6)));
  if (n % 2 === 0) n += 1;
  const cell = Math.min(W, H) / n;
  const ox = (W - cell * n) / 2;
  const oy = (H - cell * n) / 2;
  const ga = t * 0.4;
  const ca = Math.cos(ga);
  const sa = Math.sin(ga);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = ((i + 0.5) / n) * 2 - 1;
      const y = ((j + 0.5) / n) * 2 - 1;
      const v = fieldAt(st, x, y, t, lvl, k);
      ctx.fillStyle = mix(p.a, p.b, 0.5 + 0.45 * (x * ca + y * sa), 0.2 + 0.8 * v);
      ctx.beginPath();
      ctx.arc(ox + (i + 0.5) * cell, oy + (j + 0.5) * cell, cell * 0.42 * (0.18 + 0.82 * v), 0, TAU);
      ctx.fill();
    }
  }
}

/* ascii: the same field as glyphs of rising density, set in the mono token. */
function drawAscii(ctx, W, H, st, t, lvl, k, p) {
  const rows = Math.max(6, Math.min(20, Math.round(H / 8)));
  const ch = H / rows;
  const cw = ch * 0.62;
  const cols = Math.max(1, Math.floor(W / cw));
  const ox = (W - cols * cw) / 2;
  const half = Math.min(W, H) / 2;
  const ga = t * 0.4;
  const ca = Math.cos(ga);
  const sa = Math.sin(ga);
  ctx.font = "600 " + (ch * 1.08).toFixed(1) + "px " + p.mono;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let rI = 0; rI < rows; rI++) {
    for (let c = 0; c < cols; c++) {
      const px = ox + (c + 0.5) * cw;
      const py = (rI + 0.5) * ch;
      const x = (px - W / 2) / half;
      const y = (py - H / 2) / half;
      const v = fieldAt(st, x, y, t, lvl, k);
      const idx = Math.round(v * (GLYPHS.length - 1));
      if (!idx) continue;
      ctx.fillStyle = mix(p.a, p.b, 0.5 + 0.45 * (x * ca + y * sa), 0.45 + 0.55 * v);
      ctx.fillText(GLYPHS[idx], px, py);
    }
  }
}

/* particles: a point cloud on a sphere, turning in perspective. Nearer points
   are larger, stronger and take the end colour. */
const pointCache = {};
function fibonacci(n) {
  if (pointCache[n]) return pointCache[n];
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const rr = Math.sqrt(1 - y * y);
    pts.push({ x: Math.cos(i * golden) * rr, y: y, z: Math.sin(i * golden) * rr, lat: Math.asin(y) });
  }
  return (pointCache[n] = pts);
}

function drawParticles(ctx, W, H, st, t, lvl, k, p) {
  const small = Math.min(W, H) < 48;
  const n = small ? 48 : 150;
  const pts = fibonacci(n);
  const R = (Math.min(W, H) / 2) * 0.86;
  const yaw = t * 0.45;
  const pitch = st === "searching" ? 0.95 : 0.35;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.5);
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = pts[i];
    let x = q.x;
    let y = q.y;
    let z = q.z;
    let rr = 0.8;
    let hot = 0;
    if (st === "connecting") {
      rr = 0.55 + 0.3 * breathe + 0.35 * (1 - breathe) * noise(i, t * 0.6) * (0.5 + k);
    } else if (st === "listening") {
      rr = 0.5 + 0.4 * lvl * (0.85 + 0.15 * noise(i, t * 2));
    } else if (st === "thinking") {
      const tw = (0.8 + 1.8 * k) * Math.sin(t * 1.1) * y;
      const x0 = x;
      x = x0 * Math.cos(tw) - z * Math.sin(tw);
      z = x0 * Math.sin(tw) + z * Math.cos(tw);
    } else if (st === "searching") {
      /* The sphere flattens into a disc of dust, and a bright arc sweeps it. */
      const ph = (i / n) * TAU * 7;
      const band = 0.55 + 0.45 * frac(Math.sin(i * 78.233) * 43758.5453);
      x = Math.cos(ph) * band;
      z = Math.sin(ph) * band;
      y = 0.04 * Math.sin(i * 12.9898);
      let d = (t * 2.2 - (ph % TAU)) % TAU;
      if (d < 0) d += TAU;
      hot = Math.exp(-d * (1.6 - k));
    } else {
      rr = 0.62 + 0.12 * lvl + 0.16 * lvl * Math.sin(q.lat * 4 - t * 6);
    }
    x *= rr;
    y *= rr;
    z *= rr;
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp;
    const z2 = y * sp + z1 * cp;
    const s = 1 / (1 - 0.22 * z2);
    out.push({ sx: W / 2 + x1 * R * s, sy: H / 2 + y2 * R * s, z: z2, hot: hot });
  }
  out.sort((m, o) => m.z - o.z);
  const base = Math.max(0.7, Math.min(W, H) / 75);
  for (let i = 0; i < out.length; i++) {
    const o = out[i];
    const d = clamp01((o.z + 1) / 2);
    ctx.fillStyle = mix(p.a, p.b, Math.max(d, o.hot), 0.18 + 0.7 * d + 0.3 * o.hot);
    ctx.beginPath();
    ctx.arc(o.sx, o.sy, base * (0.55 + 0.9 * d) * (1 + 0.9 * o.hot), 0, TAU);
    ctx.fill();
  }
}

/* sequence: a ring of dots lit in order, the way a loader on a device panel
   steps round. */
function trail(head, i, K, len) {
  const d = (((head - i) % K) + K) % K;
  return d < len ? Math.pow(1 - d / len, 1.6) : 0;
}

function drawSequence(ctx, W, H, st, t, lvl, k, p) {
  const K = Math.min(W, H) < 48 ? 8 : 16;
  const half = Math.min(W, H) / 2;
  const ringR = half * 0.66;
  const dot = half * (K === 8 ? 0.19 : 0.12);
  for (let i = 0; i < K; i++) {
    let b = 0;
    let off = 0;
    if (st === "connecting") b = trail(frac(t * 0.45) * K, i, K, K * 0.45);
    else if (st === "listening") {
      b = 0.3 + 0.7 * lvl * (0.6 + 0.4 * noise(i, t * 2));
      off = 0.26 * lvl * (0.5 + 0.5 * noise(i + 5, t * 2.5)) * (0.5 + k);
    } else if (st === "thinking") {
      const head = frac(t * 0.32) * K;
      b = Math.max(trail(head, i, K, K * 0.3), trail(head + K / 2, i, K, K * 0.3));
    } else if (st === "searching") b = trail(frac(t * 0.85) * K, i, K, K * (0.35 + 0.3 * k));
    else {
      b = 0.35 + 0.65 * lvl;
      off = 0.3 * lvl * Math.abs(Math.sin(t * 6 - i * 0.9)) * (0.5 + k);
    }
    const ang = (i / K) * TAU - Math.PI / 2;
    const rr = ringR * (1 + off);
    ctx.fillStyle = mix(p.a, p.b, b, 0.16 + 0.84 * b);
    ctx.beginPath();
    ctx.arc(W / 2 + Math.cos(ang) * rr, H / 2 + Math.sin(ang) * rr, dot * (0.4 + 0.6 * b), 0, TAU);
    ctx.fill();
  }
}

const PAINTERS = { matrix: drawMatrix, ascii: drawAscii, particles: drawParticles, sequence: drawSequence };

function Field({ state, shape, colors, size, speed, intensity, level }) {
  const box = React.useRef(null);
  const canvas = React.useRef(null);
  const probeA = React.useRef(null);
  const probeB = React.useRef(null);
  const live = React.useRef({});
  const clock = React.useRef({ t: 0, level: 0 });
  const reduced = useReducedMotion();
  live.current = { state, shape, speed, intensity, level };
  const dim = SIZES[size] || size || SIZES.sm;

  React.useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv && cv.getContext ? cv.getContext("2d") : null;
    if (!ctx) return undefined;
    const c = clock.current;
    const beat = readDuration(el) / 600;
    const view = { w: 0, h: 0, dpr: 0 };
    /* Colours and the mono family are read back from the page every half
       second or so, so Configure, a theme switch or a dark band shows up
       without a re-render. */
    const paint = { a: [0, 0, 0], b: [0, 0, 0], mono: "monospace", age: Infinity };
    let frame = 0;
    let timer = 0;
    let last = performance.now();

    function draw(now) {
      const o = live.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!reduced) c.t += (dt * Math.max(0.1, Number(o.speed) || 1)) / beat;
      const t = reduced ? 1.3 : c.t;
      const k = clamp01(o.intensity == null ? 0.6 : Number(o.intensity));
      const target = o.level == null ? synthLevel(o.state, t) : clamp01(Number(o.level));
      c.level += (target - c.level) * (reduced ? 1 : 0.25);

      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (w !== view.w || h !== view.h || dpr !== view.dpr) {
        view.w = w;
        view.h = h;
        view.dpr = dpr;
        cv.width = Math.max(1, Math.round(w * dpr));
        cv.height = Math.max(1, Math.round(h * dpr));
      }
      if (paint.age++ > 30) {
        paint.a = toRgb(getComputedStyle(probeA.current).color);
        paint.b = toRgb(getComputedStyle(probeB.current).color);
        paint.mono = getComputedStyle(el).getPropertyValue("--dt-font-family-mono").trim() || "ui-monospace, monospace";
        paint.age = 0;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (w && h) (PAINTERS[o.shape] || drawMatrix)(ctx, w, h, o.state, t, c.level, k, paint);
      if (!reduced) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    /* Held still, the figure is repainted now and then so a resize or a
       colour change still lands. */
    if (reduced) timer = setInterval(() => { paint.age = Infinity; draw(performance.now()); }, 500);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [reduced, state, shape, reduced ? level : null]);

  return (
    <span
      ref={box}
      aria-hidden="true"
      style={{ display: "inline-block", flex: "none", position: "relative", width: dim, height: dim, verticalAlign: "middle" }}
    >
      <span ref={probeA} hidden style={{ color: colors[0] }} />
      <span ref={probeB} hidden style={{ color: colors[1] }} />
      <canvas ref={canvas} style={{ display: "block", width: "100%", height: "100%" }} />
    </span>
  );
}

export function Thinking({
  state = "thinking",
  mode = "inline",
  shape = "blob",
  tone = "brand",
  colors,
  size,
  speed = 1,
  intensity = 0.6,
  level,
  label,
  showLabel = true,
  onDismiss,
  children,
  style,
  ...rest
}) {
  const text = label || LABELS[state] || LABELS.thinking;
  const pair = Array.isArray(colors) && colors.length === 2 ? colors : TONES[tone] || TONES.brand;
  const overlay = mode === "overlay";

  React.useEffect(() => {
    if (!overlay || !onDismiss) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlay, onDismiss]);

  const Figure = FIELD_SHAPES.indexOf(shape) >= 0 ? Field : Fluid;
  const fluid = <Figure state={state} shape={shape} colors={pair} size={size || (overlay ? "xl" : "sm")} speed={speed} intensity={intensity} level={level} />;

  if (overlay) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed", inset: 0, zIndex: "var(--dt-z-overlay)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "var(--dt-space-stack-lg)", padding: "var(--dt-space-inset-xl)", boxSizing: "border-box",
          background: "var(--dt-thinking-scrim, var(--dt-surface-scrim))",
          backdropFilter: "blur(var(--dt-dialog-scrim-blur, 2px))",
          WebkitBackdropFilter: "blur(var(--dt-dialog-scrim-blur, 2px))",
          ...style,
        }}
        {...rest}
      >
        {fluid}
        <span style={{ fontFamily: "var(--dt-text-heading-sm-family)", fontSize: "var(--dt-text-heading-sm-size)", lineHeight: "var(--dt-text-heading-sm-line)", fontWeight: "var(--dt-text-heading-sm-weight)", color: "var(--dt-text-on-scrim, var(--dt-color-neutral-050))" }}>{text}</span>
        {children && (
          <div style={{ maxWidth: "var(--dt-measure-narrow)", textAlign: "center", fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)", color: "var(--dt-text-on-scrim-secondary, var(--dt-color-neutral-200))" }}>{children}</div>
        )}
        {onDismiss && (
          <button
            type="button"
            aria-label="Close"
            onClick={onDismiss}
            style={{
              position: "absolute", top: "var(--dt-space-inset-lg)", right: "var(--dt-space-inset-lg)",
              width: "var(--dt-size-control-md)", height: "var(--dt-size-control-md)", border: 0,
              borderRadius: "var(--dt-radius-pill)", background: "transparent", cursor: "pointer",
              color: "var(--dt-text-on-scrim, var(--dt-color-neutral-050))", fontSize: "var(--dt-font-size-xl)", lineHeight: 1,
            }}
          >×</button>
        )}
      </div>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={showLabel ? undefined : text}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", verticalAlign: "middle", ...style }}
      {...rest}
    >
      {fluid}
      {showLabel && (
        <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-thinking-label-color, var(--dt-text-secondary))" }}>{text}</span>
      )}
      {children}
    </span>
  );
}

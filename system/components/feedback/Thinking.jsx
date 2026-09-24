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

  const fluid = <Fluid state={state} shape={shape} colors={pair} size={size || (overlay ? "xl" : "sm")} speed={speed} intensity={intensity} level={level} />;

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

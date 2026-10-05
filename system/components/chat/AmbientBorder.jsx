import React from "react";

/* An ambient border: a gradient that turns around its container and answers
   to a voice conversation. Its state says who has the floor (listening to
   the person, thinking, the assistant speaking) and picks the colours; the
   voice's level, from a level prop or a live audio stream, brightens the glow
   and quickens the turn. tone="spectrum" swaps the brand colours for a
   six-hue wheel. The ring and the glow are drawn behind the content,
   so the container keeps its own layout, and the turning is written straight
   to the two layers each frame without re-rendering React.

   With reduced motion the ring stands still at its state's colours and the
   glow keeps its resting strength: the state still reads, nothing moves. */

const STATES = ["idle", "listening", "thinking", "speaking", "error"];

/* Turns per second, the glow's extra strength at full level, and how much
   the level quickens the turn. Thinking turns fastest and on its own: it is
   the system working, with no voice to follow. */
const MOTION = {
  idle: { turn: 1 / 14, gain: 0, boost: 0 },
  listening: { turn: 1 / 6, gain: 0.7, boost: 1.6 },
  thinking: { turn: 1 / 1.8, gain: 0.25, boost: 0 },
  speaking: { turn: 1 / 4.5, gain: 0.7, boost: 1.2 },
  error: { turn: 0, gain: 0.2, boost: 0 },
};

const RADII = {
  none: "0px",
  control: "var(--dt-radius-control)",
  container: "var(--dt-radius-container)",
  overlay: "var(--dt-radius-overlay)",
  pill: "var(--dt-radius-pill)",
};

const SURFACES = { raised: "var(--dt-voice-surface)", base: "var(--dt-surface-base)", sunken: "var(--dt-surface-sunken)", none: "transparent" };

/* Only the ring shows: the gradient is painted over the whole box and
   masked to its padding. */
const RING_MASK = {
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
};

function stops(state) {
  const s = STATES.includes(state) ? state : "idle";
  return [`var(--dt-voice-${s}-a)`, `var(--dt-voice-${s}-b)`, `var(--dt-voice-${s}-c)`];
}

const HUE = (n) => `var(--dt-voice-spectrum-${n})`;

/* Thinking is two comets chasing round a faint track; every other state is
   a full sweep of its colours. The spectrum tone runs the six-hue wheel
   instead (thinking splits it between the two comets), except for error,
   which stays danger so it still reads as one. */
function gradient(state, angle, tone) {
  const at = `from ${angle.toFixed(2)}deg`;
  if (tone === "spectrum" && state !== "error") {
    if (state === "thinking") {
      return `conic-gradient(${at}, transparent 0turn, ${HUE(1)} 0.12turn, ${HUE(2)} 0.2turn, ${HUE(3)} 0.28turn, transparent 0.38turn, transparent 0.5turn, ${HUE(4)} 0.62turn, ${HUE(5)} 0.7turn, ${HUE(6)} 0.78turn, transparent 0.88turn)`;
    }
    return `conic-gradient(${at}, ${HUE(1)}, ${HUE(2)} 0.167turn, ${HUE(3)} 0.333turn, ${HUE(4)} 0.5turn, ${HUE(5)} 0.667turn, ${HUE(6)} 0.833turn, ${HUE(1)})`;
  }
  const [a, b, c] = stops(state);
  if (state === "thinking") {
    return `conic-gradient(${at}, transparent 0turn, ${a} 0.14turn, ${b} 0.26turn, transparent 0.38turn, transparent 0.5turn, ${c} 0.64turn, ${a} 0.76turn, transparent 0.88turn)`;
  }
  return `conic-gradient(${at}, ${a}, ${b} 0.25turn, ${c} 0.5turn, ${b} 0.75turn, ${a})`;
}

/* Smooth pseudo-noise in -1..1, so a synthesised level never visibly loops. */
function noise(i, t) {
  return 0.5 * Math.sin(t * (1.3 + i * 0.37) + i * 2.1) + 0.5 * Math.sin(t * (0.7 + i * 0.23) + i * 5.3);
}

/* What listening and speaking follow when no level or stream is given: a
   restless hum, and a syllable rhythm. A demo still looks alive. */
function synth(state, t) {
  if (state === "listening") return 0.35 + 0.25 * noise(9, t * 2.2);
  if (state === "speaking") return Math.min(1, 0.12 + Math.abs(Math.sin(t * 6.3)) * (0.55 + 0.45 * Math.sin(t * 1.7)));
  return 0;
}

/* The loudness of a live stream, 0..1, read from its waveform. The stream is
   analysed, never played, so a microphone doesn't echo. */
function listen(stream) {
  if (typeof window === "undefined" || !stream || typeof stream.getAudioTracks !== "function" || !stream.getAudioTracks().length) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(() => {});
    const buf = new Uint8Array(analyser.fftSize);
    return {
      read() {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
        return Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
      },
      stop() { try { source.disconnect(); ctx.close(); } catch (err) { /* already closed */ } },
    };
  } catch (err) {
    return null;
  }
}

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = React.useState(() => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener("change", on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", on); else mq.removeListener(on); };
  }, []);
  return reduced;
}

export function AmbientBorder({
  state = "idle",
  tone = "brand",
  level,
  inputStream,
  outputStream,
  radius = "container",
  thickness = "thin",
  surface = "raised",
  glow = true,
  as: Tag = "div",
  children,
  style,
  contentStyle,
  ...rest
}) {
  const ring = React.useRef(null);
  const ringOut = React.useRef(null);
  const halo = React.useRef(null);
  const haloOut = React.useRef(null);
  const reduced = useReducedMotion();
  const live = React.useRef({ state, level, tone });
  live.current = { state, level, tone };
  const meters = React.useRef({ input: null, output: null });

  /* A meter for each stream, opened when the stream arrives and closed when
     it goes. */
  React.useEffect(() => {
    const m = listen(inputStream);
    meters.current.input = m;
    return () => { if (m) m.stop(); if (meters.current.input === m) meters.current.input = null; };
  }, [inputStream]);
  React.useEffect(() => {
    const m = listen(outputStream);
    meters.current.output = m;
    return () => { if (m) m.stop(); if (meters.current.output === m) meters.current.output = null; };
  }, [outputStream]);

  React.useEffect(() => {
    if (reduced || typeof requestAnimationFrame === "undefined") return undefined;
    let frame = 0;
    let last = 0;
    let angle = 0;
    let lvl = 0;
    let shown = live.current.state;
    let shownTone = live.current.tone;
    let prev = null;
    let prevTone = null;
    let fade = 0;
    const start = typeof performance !== "undefined" ? performance.now() : 0;
    const draw = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const t = (now - start) / 1000;
      const { state: st, level: given, tone: tn } = live.current;
      const m = MOTION[st] || MOTION.idle;
      /* Which voice to follow: the person's while listening, the
         assistant's while speaking. A level prop wins over a stream. */
      const meter = st === "listening" ? meters.current.input : st === "speaking" ? meters.current.output : null;
      const target = typeof given === "number" ? Math.max(0, Math.min(1, given)) : meter ? meter.read() : synth(st, t);
      lvl += (target - lvl) * (target > lvl ? 0.45 : 0.08);
      angle = (angle + 360 * m.turn * (1 + m.boost * lvl) * dt) % 360;
      /* A change of state or tone crossfades: the old colours fade out over the new. */
      if (st !== shown || tn !== shownTone) { prev = shown; prevTone = shownTone; shown = st; shownTone = tn; fade = 1; }
      if (fade > 0) fade = Math.max(0, fade - dt / 0.45);
      const g = gradient(shown, angle, shownTone);
      const strength = `calc(var(--dt-voice-glow-rest) + ${(m.gain * lvl).toFixed(3)})`;
      const spread = `calc(var(--dt-voice-glow-spread) * ${(-lvl).toFixed(3)})`;
      if (ring.current) ring.current.style.backgroundImage = g;
      if (halo.current) { halo.current.style.backgroundImage = g; halo.current.parentNode.style.opacity = strength; halo.current.parentNode.style.inset = spread; }
      if (ringOut.current) { ringOut.current.style.opacity = String(fade); if (fade > 0 && prev) ringOut.current.style.backgroundImage = gradient(prev, angle, prevTone); }
      if (haloOut.current) { haloOut.current.style.opacity = String(fade); if (fade > 0 && prev) haloOut.current.style.backgroundImage = gradient(prev, angle, prevTone); }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    /* Put back what React rendered. React only rewrites a style that changed
       between renders, so a loop stopped by reduced motion would otherwise
       leave the ring at its last angle, part way through a crossfade. */
    return () => {
      cancelAnimationFrame(frame);
      const rest = gradient(STATES.includes(live.current.state) ? live.current.state : "idle", 0, live.current.tone);
      if (ring.current) ring.current.style.backgroundImage = rest;
      if (halo.current) { halo.current.style.backgroundImage = rest; halo.current.parentNode.style.opacity = "var(--dt-voice-glow-rest)"; halo.current.parentNode.style.inset = "0px"; }
      if (ringOut.current) ringOut.current.style.opacity = "0";
      if (haloOut.current) haloOut.current.style.opacity = "0";
    };
  }, [reduced]);

  const r = RADII[radius] || RADII.container;
  const width = thickness === "thick" ? "var(--dt-voice-ring-width-thick)" : "var(--dt-voice-ring-width)";
  /* What React renders: the first state's colours, which the frame loop then
     turns and crossfades. Re-rendering them on a change of state would snap
     the ring back to its starting angle for a frame, so only reduced motion,
     which has no loop, follows the state here. */
  const first = React.useRef(gradient(STATES.includes(state) ? state : "idle", 0, tone)).current;
  const still = reduced ? gradient(STATES.includes(state) ? state : "idle", 0, tone) : first;
  const layer = { position: "absolute", inset: 0, borderRadius: r, pointerEvents: "none", boxSizing: "border-box" };
  const ringLayer = { ...layer, ...RING_MASK, padding: width, backgroundColor: state === "thinking" ? "var(--dt-voice-track)" : undefined, backgroundImage: still };
  const haloLayer = { ...layer, ...RING_MASK, padding: "var(--dt-voice-glow-width)", backgroundImage: still };
  /* minWidth 0: as a grid or flex item it shrinks to its track, so a bar's
     single line ellipsises instead of pushing the ring past the edge. */

  return (
    <Tag data-voice-state={state} data-voice-tone={tone} style={{ position: "relative", isolation: "isolate", borderRadius: r, padding: width, boxSizing: "border-box", minWidth: 0, ...style }} {...rest}>
      {glow && (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", filter: "blur(var(--dt-voice-glow-blur))", opacity: "var(--dt-voice-glow-rest)" }}>
          <span ref={halo} style={haloLayer} />
          <span ref={haloOut} style={{ ...haloLayer, opacity: 0 }} />
        </span>
      )}
      <span ref={ring} aria-hidden="true" style={ringLayer} />
      <span ref={ringOut} aria-hidden="true" style={{ ...ringLayer, backgroundColor: undefined, opacity: 0 }} />
      <div style={{ position: "relative", borderRadius: `max(0px, calc(${r} - ${width}))`, background: SURFACES[surface] || SURFACES.raised, minHeight: "100%", boxSizing: "border-box", ...contentStyle }}>
        {children}
      </div>
    </Tag>
  );
}

# AmbientBorder

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [AmbientBorder.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/AmbientBorder.jsx), [AmbientBorder.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/AmbientBorder.d.ts), [AmbientBorder.md](https://graham-goebel.github.io/Dovetail/system/components/chat/AmbientBorder.md).

Live page: https://graham-goebel.github.io/Dovetail/components/AmbientBorder.html

## Guidelines

A gradient border that turns around its container and answers to a voice conversation. The `state` says who has the floor and sets the colours. The voice's level brightens the glow behind the ring and speeds up the turn. VoiceInput and VoiceOverlay are built on it. Use it on its own to give any container the same voice treatment, such as a chat panel, a card or a call screen.

### Use it when
- A container should show that a voice conversation is live: whether the person is speaking, the assistant is thinking, or the assistant is answering.
- You're building a voice surface that VoiceInput and VoiceOverlay don't cover, and it should match them.

### Don't use it when
- It's decoration with no conversation behind it. A border that moves draws the eye, so keep it for something that's actually happening.
- You need a loading indicator with no voice. Use `Thinking` or `Spinner`.
- You need a focus ring or a selected state. Use the system's focus and border roles.

### Example
```jsx
const [state, setState] = useState("idle");
const [mic, setMic] = useState(null);

<AmbientBorder state={state} inputStream={mic} contentStyle={{ padding: "var(--dt-space-inset-lg)" }}>
  <Text>Ask about an order, a delivery or a return.</Text>
</AmbientBorder>
```

### States
- `idle`: the plain border scale, turning slowly. The conversation is open but nobody is speaking.
- `listening`: the brand colour. Follows the person's voice.
- `thinking`: two marks chase each other round a faint track, faster than any other state, in the brand, secondary and info colours. The system is working and there's no voice to follow.
- `speaking`: the secondary brand colour. Follows the assistant's voice. The person and the assistant use different colours so they're easy to tell apart.
- `error`: the danger colours, standing still.

A change of state crossfades from the old colours to the new ones, and the ring keeps turning from where it was.

### Tone
- `brand`, the default: each state has its own colours, as above.
- `spectrum`: every state sweeps one six-hue wheel, from the danger, warning, success and info roles and the two brand colours. The state still sets the speed and the glow. Thinking splits the wheel between its two marks. Error stays danger, so it still reads as an error.
- Use `spectrum` when the assistant should feel like one system-wide presence rather than part of your brand, such as an assistant that works across the whole product. Without colour to tell them apart, listening and speaking rely on the status text even more, so keep it visible.
- Changing tone crossfades, just like changing state.

```jsx
<AmbientBorder tone="spectrum" state={state} level={level}>…</AmbientBorder>
```

### Level
The glow and the speed of the turn follow a level from 0 to 1. The component looks for one in this order:
1. **`level`**, a number you pass in every render. Use it when your speech SDK already reports loudness.
2. **A stream.** `inputStream` is used while listening and `outputStream` while speaking. Each is a `MediaStream` with an audio track, for example from `getUserMedia` or a WebRTC call. The component reads the stream's loudness with the Web Audio analyser. It never plays the stream, so the microphone doesn't echo.
3. **A built-in rhythm**, so a demo or a prototype still looks alive: a restless hum while listening and a syllable rhythm while speaking.

The level rises fast and falls slowly, so the glow doesn't flicker between words.

### Composition
- The ring and glow are drawn behind the content. The container keeps its own layout, and `contentStyle` sets the inner box's padding, layout and height.
- `radius` matches the shape of what it wraps: `pill` for a bar, `container` for a panel, `overlay` for a screen. The inner box's radius is reduced by the ring's width so the curves stay parallel.
- `surface` fills the inner box. Use `none` when the container sits over a background of its own, as VoiceOverlay does.
- `thickness="thick"` is for a whole screen, where a thin ring would be lost.
- `glow={false}` drops the blurred halo. Use it in dense layouts or where many rings would be on screen at once.
- The animation writes straight to the ring each frame without re-rendering React, so a live level doesn't cause a render 60 times a second.

### Tokens
- Ring: `--dt-voice-ring-width`, `--dt-voice-ring-width-thick`, `--dt-voice-track`.
- Glow: `--dt-voice-glow-width`, `--dt-voice-glow-blur`, `--dt-voice-glow-spread`, `--dt-voice-glow-rest`.
- Surface: `--dt-voice-surface`.
- Colours, three stops per state: `--dt-voice-idle-a`, `-b` and `-c`, and the same for `listening`, `thinking`, `speaking` and `error`. Re-point them to give a brand its own voice colours.
- Spectrum: `--dt-voice-spectrum-1` to `--dt-voice-spectrum-6`, read by `tone="spectrum"`. Re-point them to change the wheel.
- The colours are repeated under `.dark`, so the ring follows a dark `Section` band.

### Accessibility
- The ring and glow are `aria-hidden`. The border is never the only signal: pair it with a visible, announced status. VoiceInput and VoiceOverlay do this for you.
- Pass `role` and `aria-label` through when the container is a landmark or a group.
- Under `prefers-reduced-motion` nothing turns, pulses or fades. The ring stays still in its state's colours, and the glow stays at its resting strength. The state still reads.
- Colour alone doesn't tell listening from speaking for everyone. Name the state in text.

## Props

```ts
import * as React from "react";

/** Who has the floor in a voice conversation. */
export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

/** brand: each state in its own colours. spectrum: a six-hue wheel for every state but error. */
export type VoiceTone = "brand" | "spectrum";

/**
 * An ambient border: a gradient that turns around its container and answers
 * to a voice conversation. The state picks the colours (the person's brand
 * colour while listening, the secondary brand colour while the assistant
 * speaks, both with the info hue while thinking); the voice's level brightens
 * the glow and quickens the turn. With reduced motion the ring stands still.
 */
export interface AmbientBorderProps extends React.HTMLAttributes<HTMLElement> {
  /** idle: a slow, quiet turn. listening: the person's voice. thinking: two comets chase round a faint track. speaking: the assistant's voice. error: danger colours, still. @default "idle" */
  state?: VoiceState;
  /**
   * brand: each state in its own colours, the person in the brand colour and
   * the assistant in the secondary brand colour. spectrum: a six-hue wheel
   * (--dt-voice-spectrum-1 to -6) for every state but error, which stays
   * danger; the state still sets the speed, the glow and the comets.
   * @default "brand"
   */
  tone?: VoiceTone;
  /** The voice's loudness, 0 to 1, from your own meter. Wins over the streams. Leave it out, with no stream, and listening and speaking follow a gentle synthesised level. */
  level?: number;
  /** The person's microphone. Read while listening, by analysing the stream, never playing it. */
  inputStream?: MediaStream | null;
  /** The assistant's voice, such as a WebRTC remote stream. Read while speaking. */
  outputStream?: MediaStream | null;
  /** The corner, from the radius tokens. @default "container" */
  radius?: "none" | "control" | "container" | "overlay" | "pill";
  /** thin (--dt-voice-ring-width) around a module, thick (--dt-voice-ring-width-thick) around a screen. @default "thin" */
  thickness?: "thin" | "thick";
  /** What fills the ring: raised (--dt-voice-surface), base, sunken, or none to let the page and the glow show through. @default "raised" */
  surface?: "raised" | "base" | "sunken" | "none";
  /** The blurred halo behind the ring that answers to the level. @default true */
  glow?: boolean;
  /** The element to render. @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  /** Styles for the inner surface, inside the ring. */
  contentStyle?: React.CSSProperties;
  children?: React.ReactNode;
}

export declare function AmbientBorder(props: AmbientBorderProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-voice-error-a` | component | `var(--dt-border-danger)` |
| `--dt-voice-error-b` | component | `var(--dt-text-danger)` |
| `--dt-voice-error-c` | component | `var(--dt-surface-danger-subtle)` |
| `--dt-voice-gap` | component | `var(--dt-space-inline-sm)` |
| `--dt-voice-glow-blur` | component | `var(--dt-space-inset-md)` |
| `--dt-voice-glow-rest` | component | `var(--dt-opacity-ghost)` |
| `--dt-voice-glow-spread` | component | `var(--dt-space-inset-xs)` |
| `--dt-voice-glow-width` | component | `calc(var(--dt-border-width-strong) * 4)` |
| `--dt-voice-idle-a` | component | `var(--dt-border-strong)` |
| `--dt-voice-idle-b` | component | `var(--dt-border-default)` |
| `--dt-voice-idle-c` | component | `var(--dt-border-subtle)` |
| `--dt-voice-label-fg` | component | `var(--dt-text-secondary)` |
| `--dt-voice-listening-a` | component | `var(--dt-border-brand)` |
| `--dt-voice-listening-b` | component | `var(--dt-text-brand)` |
| `--dt-voice-listening-c` | component | `var(--dt-surface-brand-muted)` |
| `--dt-voice-overlay-bg` | component | `var(--dt-surface-base)` |
| `--dt-voice-padding` | component | `var(--dt-space-inset-xs)` |
| `--dt-voice-panel-padding` | component | `var(--dt-space-inset-lg)` |
| `--dt-voice-placeholder-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-voice-ring-width` | component | `var(--dt-border-width-strong)` |
| `--dt-voice-ring-width-thick` | component | `calc(var(--dt-border-width-strong) * 2)` |
| `--dt-voice-speaking-a` | component | `var(--dt-border-brand-secondary)` |
| `--dt-voice-speaking-b` | component | `var(--dt-text-brand-secondary)` |
| `--dt-voice-speaking-c` | component | `var(--dt-surface-brand-secondary-muted)` |
| `--dt-voice-spectrum-1` | component | `var(--dt-surface-danger)` |
| `--dt-voice-spectrum-2` | component | `var(--dt-surface-warning)` |
| `--dt-voice-spectrum-3` | component | `var(--dt-surface-success)` |
| `--dt-voice-spectrum-4` | component | `var(--dt-surface-info)` |
| `--dt-voice-spectrum-5` | component | `var(--dt-surface-brand-secondary)` |
| `--dt-voice-spectrum-6` | component | `var(--dt-surface-brand)` |
| `--dt-voice-surface` | component | `var(--dt-surface-raised)` |
| `--dt-voice-thinking-a` | component | `var(--dt-border-brand)` |
| `--dt-voice-thinking-b` | component | `var(--dt-border-brand-secondary)` |
| `--dt-voice-thinking-c` | component | `var(--dt-border-info)` |
| `--dt-voice-track` | component | `var(--dt-border-subtle)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-16)` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-radius-overlay` | semantic | `var(--dt-radius-raw-24)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-surface-base` | semantic | `var(--dt-color-white)` |
| `--dt-surface-sunken` | semantic | `var(--dt-color-neutral-100)` |

## Source

```jsx
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
```

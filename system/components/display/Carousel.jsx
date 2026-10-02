import React from "react";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* ---------------------------------------------------------------- maths */

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, n) => ((a % n) + n) % n;
/* Signed distance from a to 0 round a loop of n: -n/2 to n/2. */
const wrap = (a, n) => mod(a + n / 2, n) - n / 2;
/* A stable pseudo-random number in 0..1 for an index. */
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const smooth = (t) => t * t * (3 - 2 * t);
const backOut = (t, c = 1.25) => 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
const glideEase = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Integrates m.pos toward target as a damped spring, in small fixed steps so
   a long frame can't make it blow up. */
function spring(m, target, k, zeta, dt) {
  const c = 2 * zeta * Math.sqrt(k), n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
  for (let i = 0; i < n; i++) { m.vel += (k * (target - m.pos) - c * m.vel) * h; m.pos += m.vel * h; }
}

/* Springs approach their target forever; once within a hair, arrive. */
function settle(m, target) {
  if (Math.abs(target - m.pos) < 0.0015 && Math.abs(m.vel) < 0.01) { m.pos = target; m.vel = 0; return true; }
  return false;
}

/* Under drive="scroll", Glide and Spring step: hold on each item, then move. */
function shape(raw, feel) {
  if (feel === "flow") return raw;
  const f = Math.floor(raw), t = raw - f, u = clamp((t - 0.2) / 0.6, 0, 1);
  return f + (feel === "spring" ? backOut(u, 1.70158) : glideEase(u));
}

/* The grid's shuffles: step k is a seeded shuffle of the cells, step 0 is
   reading order. */
const PERMS = new Map();
function perm(k, n) {
  const key = k + "|" + n;
  if (PERMS.has(key)) return PERMS.get(key);
  const a = Array.from({ length: n }, (_, i) => i);
  if (k !== 0) {
    let seed = (k * 9973 + n * 131) >>> 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let j = n - 1; j > 0; j--) { const r = Math.floor(rnd() * (j + 1)); [a[j], a[r]] = [a[r], a[j]]; }
  }
  if (PERMS.size > 400) PERMS.clear();
  PERMS.set(key, a);
  return a;
}
function cellXY(slot, g, n) {
  const row = Math.floor(slot / g.cols), col = slot % g.cols;
  const inRow = row === g.rows - 1 ? n - g.cols * (g.rows - 1) : g.cols;
  return { x: (col - (inRow - 1) / 2) * g.cell, y: (row - (g.rows - 1) / 2) * g.cell };
}

/* --------------------------------------------------------------- layouts

   A layout is either a path, pose(p, g): where one item sits at p of its way
   round (0 to 1), the items spread evenly along it; or a placement,
   at(i, pos, g, n, dir): where item i sits when the carousel is at pos.
   geom() sizes it to the stage. zk scales depth so every layout can share one
   camera; drag is +1 when dragging right moves forward. */

const LAYOUTS = {
  stack: {
    stepEvery: 2.6, drag: 1, feel: "glide", noLean: true, span: -1,
    geom: (w, h, n, k, s0) => ({ s: s0, w, h }),
    at(i, pI, g, n, dr) {
      const f = Math.floor(pI), t = pI - f, k = mod(i - f, n);
      if (k === 0) {
        return { x: dr * g.w * 0.46 * t, y: g.h * 0.05 - Math.sin(Math.PI * Math.min(1, t * 1.1)) * g.h * 0.09, z: (n + 2) * 5, sc: 1 + 0.03 * Math.sin(Math.PI * t), o: 1 - clamp((t - 0.6) / 0.4, 0, 1), r: dr * 18 * t };
      }
      const r = k - t;
      const q = { x: 0, y: g.h * 0.05 - r * g.h * 0.055, z: (n - r) * 5, sc: 1 - r * 0.075, o: clamp((4.3 - r) / 1.3, 0, 1), r: 0 };
      if (k === n - 1) q.o *= clamp(t * 3, 0, 1);
      return q;
    },
  },
  grid: {
    stepEvery: 2.4, drag: 1, feel: "glide", noLean: true, allLive: true, tap: "step",
    geom(w, h, n, k) {
      const cols = Math.max(2, Math.ceil(Math.sqrt(n * (w / h) * 0.9))), rows = Math.ceil(n / cols);
      const cell = Math.min((w * 0.88 * k) / cols, (h * 0.84) / rows);
      return { s: cell * 0.84, cols, rows, cell };
    },
    at(i, pI, g, n, dr) {
      const t = dr * pI, f = Math.floor(t), u = t - f, st = 0.35;
      const ui = smooth(clamp((u - st * (n > 1 ? i / (n - 1) : 0)) / (1 - st), 0, 1));
      const A = cellXY(perm(f, n)[i], g, n), B = cellXY(perm(f + 1, n)[i], g, n), lift = Math.sin(Math.PI * ui);
      return { x: lerp(A.x, B.x, ui), y: lerp(A.y, B.y, ui) - lift * g.cell * 0.18, z: lift * 80, sc: 1 + 0.12 * lift, o: 1, r: lift * (hash(i + f * 7) - 0.5) * 24 };
    },
  },
  ring: {
    zk: 1, loop: 16, focusP: 0.25, drag: -1, depth: "ring", feel: "flow",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.15, h * 0.25), rx: w * 0.38 * k, ry: h * 0.2 * k }),
    pose(p, g) {
      const a = p * Math.PI * 2, sn = Math.sin(a), x0 = Math.cos(a) * g.rx, y0 = sn * g.ry, f = -0.22, d = (sn + 1) / 2;
      return { x: x0 * Math.cos(f) - y0 * Math.sin(f), y: x0 * Math.sin(f) + y0 * Math.cos(f), z: (d - 1) * 300, sc: 0.6 + 0.4 * d, o: 0.3 + 0.7 * d, r: 0 };
    },
  },
  arc: {
    zk: 0.12, loop: 14, focusP: 0.72, drag: 1, feel: "flow",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.2, h * 0.3), w: w * k, h: h * k }),
    pose: (p, g) => ({ x: lerp(-g.w * 0.42, g.w * 0.42, p), y: lerp(g.h * 0.28, -g.h * 0.26, p) - Math.sin(Math.PI * p) * g.h * 0.1, z: p * 200, sc: 0.25 + 0.95 * Math.pow(p, 1.4), o: Math.min(1, p * 6, (1 - p) * 6), r: (p - 0.5) * 40 }),
  },
  coverflow: {
    zk: 1, loop: 14, focusP: 0.5, drag: -1, depth: "cover", feel: "glide",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.26, h * 0.5), k, n }),
    pose(p, g) {
      const d = (0.5 - p) * g.n, ad = Math.abs(d), sd = d < 0 ? -1 : 1;
      return { x: sd * (Math.min(ad, 1) * g.s * 0.78 + Math.max(0, ad - 1) * g.s * 0.34) * g.k, y: 0, z: -Math.min(ad, 1) * g.s * 0.9 - Math.max(0, ad - 1) * 24, sc: 1, o: clamp((g.n / 2 - ad) * 1.2, 0, 1), r: 0, ry: -clamp(d, -1, 1) * 58 };
    },
  },
  fan: {
    zk: 1, loop: 14, focusP: 0.5, drag: -1, feel: "glide",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.2, h * 0.36), R: h * 1.25, k, n, h }),
    pose(p, g) {
      const d = (0.5 - p) * g.n, a = (d * 11 * g.k * Math.PI) / 180, lift = Math.exp(-d * d * 1.4);
      return { x: Math.sin(a) * g.R, y: g.R * (1 - Math.cos(a)) - lift * g.h * 0.08 + g.h * 0.06, z: lift * 60 - Math.abs(d) * 6, sc: 1 + 0.1 * lift, o: clamp((g.n / 2 - Math.abs(d)) * 1.5, 0, 1), r: (a * 180) / Math.PI };
    },
  },
  focus: {
    zk: 0.12, loop: 14, focusP: 0.5, drag: -1, depth: "focus", feel: "glide",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.17, h * 0.34), half: w * 0.62 * k }),
    pose(p, g) {
      const x = lerp(g.half, -g.half, p), d = x / (g.half * 0.48), k = Math.exp(-d * d);
      return { x, y: 0, z: k * 100, sc: 0.35 + 0.95 * k, o: Math.min(1, (1 - Math.abs(x) / g.half) * 3.4), r: 0 };
    },
  },
  wave: {
    zk: 0.12, loop: 13, focusP: 0.5, drag: -1, feel: "flow", allLive: true,
    geom: (w, h, n, k) => { const half = w * 0.62; return { s: Math.min((half * 2) / n * 0.78, h * 0.36), half, amp: h * 0.15 * k }; },
    pose(p, g) {
      const x = lerp(g.half, -g.half, p), ph = p * Math.PI * 3;
      return { x, y: Math.sin(ph) * g.amp, z: (Math.sin(ph) + 1) * 30, sc: 1, o: Math.min(1, (1 - Math.abs(x) / g.half) * 5), r: -Math.cos(ph) * 14 };
    },
  },
  marquee: {
    zk: 0, loop: 12, focusP: 0.5, drag: -1, feel: "flow", allLive: true,
    geom: (w, h, n, k) => { const half = w * 0.62 * k; return { s: Math.min((half * 2) / n * 0.82, h * 0.46), half }; },
    pose(p, g) {
      const x = lerp(g.half, -g.half, p);
      return { x, y: 0, z: 0, sc: 1, o: Math.min(1, (1 - Math.abs(x) / g.half) * 5), r: 0 };
    },
  },
  taper: {
    zk: 0.12, loop: 12, focusP: 0.5, drag: -1, feel: "flow", allLive: true,
    geom: (w, h, n, k) => { const half = w * 0.62 * k; return { s: Math.min((half * 2) / n * 0.9, h * 0.5), half }; },
    pose(p, g) {
      const x = lerp(g.half, -g.half, p), u = (x + g.half) / (g.half * 2);
      return { x, y: 0, z: (1 - u) * 100, sc: 0.18 + 1.02 * Math.pow(1 - u, 1.2), o: Math.min(1, (1 - Math.abs(x) / g.half) * 5), r: 0 };
    },
  },
  scatter: {
    loop: 18, drag: -1, feel: "glide",
    geom: (w, h, n, k) => ({ s: Math.min(w * 0.17, h * 0.3), w, h, k }),
    at(i, pI, g, n, dr) {
      const t = dr * pI, ang = i * 2.39996323 + t * 0.35, rr = Math.sqrt((i + 0.5) / n);
      const hx = Math.cos(ang) * rr * g.w * 0.4 * g.k, hy = Math.sin(ang) * rr * g.h * 0.36 * g.k;
      const sz = 0.45 + 0.6 * hash(i), rot = (hash(i + 7) - 0.5) * 50 + t * 12 * (hash(i + 3) - 0.5);
      const d = wrap(i - t, n), f = Math.exp(-d * d * 1.6);
      return { x: hx * (1 - f), y: hy * (1 - f), z: f * 120 + sz * 20, sc: lerp(sz * 0.8, 1.5, f), o: lerp(0.85, 1, f), r: rot * (1 - f) };
    },
  },
};

/* Secondary motion as one dial. ripple: items follow at different rates, so
   a move travels along them; lean: they tilt and stretch with speed; float:
   they drift a little at rest. Scaled by --dt-carousel-expression. */
const EXPRESSION = {
  none: { ripple: 0, lean: 0, float: 0 },
  calm: { ripple: 0.2, lean: 0.5, float: 0.12 },
  lively: { ripple: 0.35, lean: 1, float: 0.3 },
  playful: { ripple: 0.6, lean: 1.6, float: 0.5 },
};

const RATIOS = { square: 1, portrait: 4 / 3, landscape: 3 / 4 };
const STAGES = { "4:3": "4 / 3", "16:9": "16 / 9", "1:1": "1 / 1", "3:4": "3 / 4", "21:9": "21 / 9" };
const KEYS = ["x", "y", "z", "sc", "o", "r", "ry", "sx", "sy"];

/* ---------------------------------------------------------------- ticker

   One requestAnimationFrame loop for every carousel on the page, asleep
   whenever none of them is moving. */
const engines = new Set();
let raf = 0, lastT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  let busy = false;
  engines.forEach((en) => { if (en.step(dt)) busy = true; });
  raf = busy ? requestAnimationFrame(frame) : 0;
}
function wake() {
  if (!raf && typeof requestAnimationFrame !== "undefined") { lastT = performance.now(); raf = requestAnimationFrame(frame); }
}

function readNumber(style, name, fallback) {
  const v = parseFloat(style.getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/* ---------------------------------------------------------------- engine

   Owns the motion. It moves the item wrappers directly, so React renders the
   items once and the animation never re-renders them. One master position
   (in items) chases a target on a spring; each item follows the master with
   its own stiffness (ripple). get() returns the current settings. */
function createEngine(stage, field, get, callbacks) {
  let items = [], n = 0, F = [], last = [];
  let g = null, w = 0, h = 0, s0 = 0;
  let L = LAYOUTS[get().layout] || LAYOUTS.ring;
  const M = { pos: 0, vel: 0 };
  let T = 0, flowing = false, idle = 0, autoTimer = 0, scrollRaw = null, active = -1, clock = 0, morph = null;
  let drag = null, dragTarget = 0, ptr = null, held = false, holdTimer = 0, visible = true;
  let introT = 1, introDir = 0;

  const css = getComputedStyle(stage);
  const FEEL = {
    flow: { k: readNumber(css, "--dt-carousel-flow-stiffness", 70), z: readNumber(css, "--dt-carousel-flow-damping", 1) },
    glide: { k: readNumber(css, "--dt-carousel-glide-stiffness", 42), z: readNumber(css, "--dt-carousel-glide-damping", 1) },
    spring: { k: readNumber(css, "--dt-carousel-spring-stiffness", 130), z: readNumber(css, "--dt-carousel-spring-damping", 0.36) },
  };
  const tokenPace = readNumber(css, "--dt-carousel-pace", 1);
  const tokenExpression = readNumber(css, "--dt-carousel-expression", 1);

  const dirv = () => (get().reverse ? -1 : 1);
  const feelOf = () => get().feel || L.feel;
  const stagger = () => Math.min(0.045, 0.5 / Math.max(1, n));
  const span = () => (L.span === -1 ? n - 1 : n);
  const allLive = () => { const fo = get().focusOnly; return fo === undefined ? !!L.allLive : !fo; };

  function measure() {
    w = field.clientWidth; h = field.clientHeight;
    if (!w || !h || !n) return false;
    const s = get(), rhw = s.itemRatio;
    /* Every layout shares one base item size and scales from it, so a change
       of layout can morph size too. */
    s0 = Math.min(w * 0.4, h * 0.6 * (rhw > 1 ? 1.3 / rhw : 1)) * s.itemSize;
    g = L.geom(w, h, n, s.spread, s0);
    g.m = g.s / s0;
    field.style.setProperty("--dt-carousel-item-width", s0.toFixed(1) + "px");
    field.style.setProperty("--dt-carousel-item-height", (s0 * rhw).toFixed(1) + "px");
    return true;
  }
  const activeIndex = () => (n ? mod(Math.round(dirv() * M.pos), n) : 0);

  function poseOf(i, pI, s, dr) {
    let q;
    if (L.at) { q = L.at(i, pI, g, n, dr); q.sc *= g.m; }
    else {
      const p = mod(L.focusP + (dr * pI - i) / n, 1), dk = s.depth;
      q = L.pose(p, g);
      q.sc *= g.m; q.z *= L.zk;
      if (L.depth) {
        q.sc = g.m * (1 + (q.sc / g.m - 1) * dk); q.z *= dk;
        if (q.ry) q.ry *= dk;
        if (L.depth === "ring") q.o = clamp(1 - (1 - q.o) * dk, 0, 1);
      }
    }
    if (q.ry === undefined) q.ry = 0;
    return q;
  }

  function expression() {
    const s = get(), base = EXPRESSION[s.expression] || EXPRESSION.lively, k = s.reduced ? 0 : tokenExpression;
    return { ripple: base.ripple * k, lean: base.lean * k, float: base.float * k };
  }

  function render() {
    if (!g) return;
    const s = get(), ex = expression(), dr = dirv(), stg = stagger();
    for (let i = 0; i < n; i++) {
      const v = F[i].vel, q = poseOf(i, F[i].pos, s, dr);
      if (!L.noLean) q.r += clamp(L.drag * dr * v * 4 * ex.lean, -16, 16);
      const stretch = Math.min(0.14, Math.abs(v) * 0.022 * ex.lean);
      q.sx = 1 + stretch; q.sy = 1 - stretch * 0.55;
      q.y += Math.sin(clock * 1.1 + i * 1.9) * s0 * 0.03 * ex.float * g.m;
      q.r += Math.sin(clock * 0.8 + i * 2.3) * 1.4 * ex.float;
      /* A change of layout: each item travels from where it was, a beat
         after the one before it. */
      if (morph && morph.from[i]) {
        const mt = glideEase(clamp((morph.t * morph.D - i * 0.035) / 0.8, 0, 1)), b = morph.from[i];
        KEYS.forEach((key) => { q[key] = lerp(b[key], q[key], mt); });
      }
      last[i] = Object.assign({}, q);
      /* The entrance: from a pile in the middle, each item springs out to
         its place in turn. */
      if (introT < 1) {
        const D = 0.75 + stg * (n - 1), ti = clamp((introT * D - i * stg) / 0.75, 0, 1), e = backOut(ti);
        const pile = { x: 0, y: h * 0.08, z: 0, sc: q.sc * 0.2, r: (hash(i) - 0.5) * 60, ry: 0, sx: 1, sy: 1 };
        ["x", "y", "z", "sc", "r", "ry", "sx", "sy"].forEach((key) => { q[key] = lerp(pile[key], q[key], e); });
        q.o *= clamp(ti * 2.2, 0, 1);
      }
      const el = items[i];
      el.style.transform = `translate3d(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px,${q.z.toFixed(1)}px) rotateY(${q.ry.toFixed(1)}deg) rotate(${q.r.toFixed(1)}deg) scale(${(q.sc * q.sx).toFixed(3)},${(q.sc * q.sy).toFixed(3)})`;
      el.style.opacity = q.o.toFixed(3);
    }
    const ai = activeIndex();
    if (ai !== active) {
      active = ai;
      const live = allLive();
      items.forEach((el, i) => {
        if (i === ai) el.setAttribute("aria-current", "true"); else el.removeAttribute("aria-current");
        /* Only the item in focus is live: the rest can't be tabbed to or
           pressed, so a tap on them brings them forward instead. */
        const slot = el.firstElementChild;
        if (slot) slot.inert = !live && i !== ai;
      });
      callbacks.active(ai, lastCause);
      lastCause = "auto";
    }
  }
  let lastCause = "auto";

  function touch() { flowing = false; autoTimer = 0; idle = get().drive === "both" ? 2.5 : 0; lastCause = "user"; wake(); }
  function go(delta) {
    const base = flowing || Math.abs(T - M.pos) > 1.5 ? Math.round(M.pos) : Math.round(T);
    T = base + delta;
    touch();
  }
  function focusItem(i) {
    if (L.span === -1) { const d = mod(i - Math.round(M.pos), n); T = Math.round(M.pos) + (d > n / 2 ? d - n : d); }
    else { const base = dirv() * M.pos, delta = wrap(i - base, n); T = (base + delta) * dirv(); }
    touch();
  }

  function step(dt) {
    if (!n || (!g && !measure())) return false;
    const s = get(), rm = s.reduced, feel = feelOf();
    let busy = false;
    clock += dt;
    if (rm && introT < 1) { introT = 1; introDir = 0; }
    if (morph) { morph.t += dt / morph.D; if (morph.t >= 1) morph = null; else busy = true; }
    if (introDir !== 0) {
      const D = 0.75 + stagger() * (n - 1);
      introT = clamp(introT + (introDir * dt * (introDir < 0 ? 1.8 : 1)) / D, 0, 1);
      if ((introDir > 0 && introT >= 1) || (introDir < 0 && introT <= 0)) introDir = 0; else busy = true;
    }

    if (s.drive === "scroll") {
      if (scrollRaw !== null) T = shape(scrollRaw, feel);
      if (rm) { M.pos = T; M.vel = 0; }
      else {
        const f = FEEL[feel], k = feel === "flow" ? f.k * 2.1 : feel === "glide" ? f.k * 1.4 : f.k;
        spring(M, T, k, feel === "spring" ? Math.min(1, f.z + 0.04) : f.z, dt);
      }
      if (!settle(M, T)) busy = true;
    } else if (drag && drag.moved) {
      spring(M, dragTarget, 420, 1, dt);
      busy = true;
    } else {
      if (idle > 0) { idle -= dt; busy = true; }
      const settled = Math.abs(T - M.pos) < 0.02 && Math.abs(M.vel) < 0.08;
      const autoOn = s.drive !== "manual" && !s.paused && !held && !drag && visible && !rm && idle <= 0 && introT >= 1 && (settled || flowing);
      const rate = s.pace * tokenPace;
      if (autoOn && feel === "flow") {
        const speed = (L.stepEvery ? 1 / L.stepEvery : n / L.loop) * rate;
        flowing = true;
        M.vel += (speed - M.vel) * (1 - Math.exp(-5 * dt));
        M.pos += M.vel * dt;
        T = M.pos;
        busy = true;
      } else {
        /* Leaving a drift: a paused loop coasts to rest where it is; in
           manual it settles on a whole item. */
        if (flowing) { flowing = false; T = s.drive === "manual" ? Math.round(M.pos + M.vel * 0.3) : M.pos + M.vel * 0.3; }
        if (s.drive === "manual" && !drag && Math.abs(T - Math.round(T)) > 0.001) T = Math.round(T);
        if (autoOn) {
          autoTimer += dt;
          if (autoTimer >= (L.stepEvery || L.loop / n) / rate) { autoTimer = 0; T = Math.round(T) + 1; }
          busy = true;
        }
        if (rm) { M.pos = T; M.vel = 0; }
        else { const f = FEEL[feel]; spring(M, T, f.k, f.z, dt); }
        if (!settle(M, T)) busy = true;
      }
    }

    /* Followers: each item chases the master with its own stiffness. */
    const rip = expression().ripple;
    for (let i = 0; i < n; i++) {
      const fi = F[i];
      if (rip < 0.01) { fi.pos = M.pos; fi.vel = M.vel; }
      else {
        spring(fi, M.pos, 170 * (1 - rip * 0.75 * (n > 1 ? i / (n - 1) : 0)), 0.85, dt);
        if (!settle(fi, M.pos)) busy = true;
      }
    }
    if (visible && expression().float > 0) busy = true;
    render();
    return busy;
  }

  /* Pointer and touch. A press catches a moving carousel; a sideways drag
     scrubs it and a fling carries on; a mostly vertical swipe is left to the
     page. A touch held still pauses it until it lifts. */
  const unit = () => (L.span === -1 ? Math.max(80, w * 0.28) : Math.max(60, w * 0.16));
  function down(e) {
    const s = get();
    if (s.drive === "scroll" || (e.button !== undefined && e.button > 0)) return;
    if (e.target.closest && e.target.closest("[data-carousel-control]")) return;
    const touchy = e.pointerType && e.pointerType !== "mouse";
    ptr = { x: e.clientX, y: e.clientY };
    clearTimeout(holdTimer);
    if (touchy) holdTimer = setTimeout(() => { if (ptr && !(drag && drag.moved)) { held = true; field.style.scale = "0.97"; wake(); } }, 320);
    if (s.drive === "auto") return;
    drag = { x: e.clientX, y: e.clientY, pos0: M.pos, moved: false, touch: touchy, item: e.target.closest ? e.target.closest("[data-carousel-item]") : null };
    T = M.pos; flowing = false;
  }
  function move(e) {
    if (ptr && !held && Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 10) clearTimeout(holdTimer);
    if (!drag) return;
    let dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      const th = drag.touch ? 10 : 6;
      if (Math.abs(dy) > th && Math.abs(dy) > Math.abs(dx)) { drag = null; wake(); return; }
      if (Math.abs(dx) <= th) return;
      drag.moved = true; drag.x = e.clientX; drag.pos0 = M.pos; dragTarget = M.pos;
      stage.style.cursor = "grabbing";
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
      dx = 0;
    }
    dragTarget = drag.pos0 + (L.drag * dirv() * dx) / unit();
    wake();
  }
  function up() {
    clearTimeout(holdTimer);
    const wasHeld = held;
    held = false; ptr = null; field.style.scale = "";
    if (!drag) { if (wasHeld) idle = Math.max(idle, 0.5); wake(); return; }
    const d = drag;
    drag = null; stage.style.cursor = "";
    if (d.moved) T = Math.round(M.pos + clamp(M.vel, -10, 10) * (d.touch ? 0.34 : 0.28));
    else if (!wasHeld && d.item) {
      if (L.tap === "step") { T = Math.round(M.pos); go(1); return; }
      focusItem(Number(d.item.getAttribute("data-carousel-item")));
      return;
    } else T = Math.round(M.pos);
    touch();
  }
  function cancel() {
    clearTimeout(holdTimer); held = false; ptr = null; field.style.scale = ""; stage.style.cursor = "";
    if (drag) { drag = null; T = Math.round(M.pos); touch(); }
  }
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", cancel);

  /* Play the entrance as the carousel comes into view and gather the items
     back up when it leaves, so it plays again next time. Out of view it also
     stops moving by itself. */
  let io = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const r = en.intersectionRatio, s = get();
        visible = en.isIntersecting;
        if (s.entrance && !s.reduced) {
          if (r >= 0.3 && introDir !== 1 && introT < 1) introDir = 1;
          else if (r < 0.08 && introT > 0) introDir = -1;
        }
        wake();
      });
    }, { threshold: [0, 0.08, 0.3, 0.6] });
    io.observe(stage);
  }
  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => { if (measure()) { render(); wake(); } });
    ro.observe(field);
  }

  const api = {
    step,
    setItems(els) {
      items = els; n = els.length;
      F = els.map(() => ({ pos: M.pos, vel: 0 }));
      last = els.map(() => null);
      morph = null; active = -1;
      if (n && get().entrance && !get().reduced && io && introT >= 1 && !api.started) introT = 0;
      api.started = true;
      if (measure()) render();
      wake();
    },
    setLayout(name) {
      const next = LAYOUTS[name] || LAYOUTS.ring;
      if (next === L) return;
      morph = last.every(Boolean) ? { from: last.map((q) => Object.assign({}, q)), t: 0, D: 0.8 + 0.035 * (n - 1) } : null;
      L = next; active = -1; measure(); wake();
    },
    sync() { if (measure()) render(); wake(); },
    go,
    focus(i) { if (n) focusItem(mod(i, n)); },
    /* Straight to an item, with no travel: where the carousel starts. */
    jump(i) {
      if (!n) return;
      focusItem(mod(i, n));
      M.pos = T; M.vel = 0; idle = 0; lastCause = "auto";
      F.forEach((f) => { f.pos = T; f.vel = 0; });
      if (measure()) render();
    },
    replay() { if (!get().reduced) { introT = 0; introDir = 1; wake(); } },
    scrollTo(v) { scrollRaw = v; wake(); },
    span,
    active: () => active,
    position: () => M.pos,
    destroy() {
      engines.delete(api);
      clearTimeout(holdTimer);
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", cancel);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
    },
  };
  engines.add(api);
  return api;
}

/* ----------------------------------------------------------------- hooks */

const useIsoLayoutEffect = typeof window !== "undefined" && window.document ? React.useLayoutEffect : React.useEffect;

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = React.useState(false);
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

/* ------------------------------------------------------------- controls */

const ICONS = {
  pause: "M9 5v14M15 5v14",
  play: "M8 5.5v13l10-6.5z",
  prev: "m15 18-6-6 6-6",
  next: "m9 18 6-6-6-6",
};
function Glyph({ name }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)" }}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
const CONTROL = {
  display: "grid", placeItems: "center", padding: 0, margin: 0,
  width: "var(--dt-carousel-control-size)", height: "var(--dt-carousel-control-size)",
  borderRadius: "var(--dt-radius-pill)",
  border: "var(--dt-border-width-default) solid var(--dt-carousel-control-border)",
  background: "var(--dt-carousel-control-surface)", color: "var(--dt-carousel-control-text)",
  WebkitBackdropFilter: "var(--dt-backdrop-glass)", backdropFilter: "var(--dt-backdrop-glass)",
  cursor: "pointer",
};

/* ------------------------------------------------------------- component */

export function Carousel({
  label,
  children,
  layout = "ring",
  drive = "auto",
  feel,
  expression = "lively",
  pace = 1,
  spread = 1,
  depth = 1,
  reverse = false,
  itemRatio = "square",
  itemSize = 1,
  ratio = "4:3",
  height,
  value,
  defaultIndex = 0,
  onChange,
  paused,
  focusOnly,
  entrance = true,
  controls = "auto",
  pauseLabel = "Pause",
  playLabel = "Play",
  previousLabel = "Previous item",
  nextLabel = "Next item",
  itemLabel = (n, total) => `${n} of ${total}`,
  style,
  ...rest
}) {
  const list = React.Children.toArray(children).filter(Boolean);
  const total = list.length;
  const signature = list.map((c, i) => (c.key != null ? c.key : i)).join("|");
  const stageRef = React.useRef(null);
  const fieldRef = React.useRef(null);
  const trackRef = React.useRef(null);
  const itemRefs = React.useRef([]);
  const engineRef = React.useRef(null);
  const reduced = useReducedMotion();
  const [userPaused, setUserPaused] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [keyFocus, setKeyFocus] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");

  const rhw = typeof itemRatio === "number" ? 1 / itemRatio : RATIOS[itemRatio] || 1;
  const moves = drive === "auto" || drive === "both";

  /* What the engine reads every frame. Kept in a ref so a prop change never
     restarts the motion. */
  const settings = React.useRef({});
  settings.current = {
    layout, drive, feel, expression, pace, spread, depth, reverse, itemRatio: rhw, itemSize, focusOnly, entrance, reduced,
    paused: !!paused || userPaused || (moves && (hovered || keyFocus)),
  };
  const changeRef = React.useRef(onChange);
  changeRef.current = onChange;
  const reported = React.useRef(null);
  const labelRef = React.useRef(itemLabel);
  labelRef.current = itemLabel;

  useIsoLayoutEffect(() => {
    const en = createEngine(stageRef.current, fieldRef.current, () => settings.current, {
      active(i, cause) {
        /* The first report is where it starts, not a change. */
        if (reported.current === null || reported.current === i) { reported.current = i; return; }
        reported.current = i;
        if (changeRef.current) changeRef.current(i);
        if (cause === "user") setAnnounce(labelRef.current(i + 1, itemRefs.current.filter(Boolean).length));
      },
    });
    engineRef.current = en;
    return () => { en.destroy(); engineRef.current = null; };
  }, []);

  /* Items, whenever the children change. The first set starts where
     defaultIndex (or value) says. */
  const started = React.useRef(false);
  useIsoLayoutEffect(() => {
    const en = engineRef.current;
    if (!en) return;
    const els = itemRefs.current.slice(0, total).filter(Boolean);
    en.setItems(els);
    if (!started.current && els.length) {
      started.current = true;
      const first = typeof value === "number" ? value : defaultIndex;
      if (first) en.jump(first);
    }
  }, [signature]);

  React.useEffect(() => { if (engineRef.current) engineRef.current.setLayout(layout); }, [layout]);
  React.useEffect(() => { if (engineRef.current) engineRef.current.sync(); });

  /* A controlled index brings that item forward. */
  React.useEffect(() => {
    const en = engineRef.current;
    if (en && typeof value === "number" && total && en.active() !== ((value % total) + total) % total) en.focus(value);
  }, [value, total]);

  /* drive="scroll": the page's scroll through the track sets the position. */
  React.useEffect(() => {
    if (drive !== "scroll") return undefined;
    const onScroll = () => {
      const en = engineRef.current, track = trackRef.current;
      if (!en || !track) return;
      const r = track.getBoundingClientRect(), totalPx = Math.max(1, r.height - window.innerHeight);
      en.scrollTo(clamp(-r.top / totalPx, 0, 1) * en.span());
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [drive, total]);

  const onKeyDown = (e) => {
    const en = engineRef.current;
    if (!en || drive === "scroll" || e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { en.go(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { en.go(-1); e.preventDefault(); }
  };
  /* Keyboard focus pauses it; the focus a tap or click leaves behind
     doesn't, or one tap on a tablet would pause it for good. */
  const onFocus = (e) => {
    let kb = true;
    try { kb = e.target.matches(":focus-visible"); } catch (err) { kb = true; }
    if (kb) setKeyFocus(true);
  };
  const onBlur = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKeyFocus(false); };

  const showPause = controls !== "none" && moves && !reduced && paused === undefined;
  const showSteps = controls === "full" || (controls === "auto" && (drive === "manual" || drive === "both"));

  const stage = (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={drive === "scroll" ? undefined : 0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      style={{ position: "relative", display: "grid", gap: "var(--dt-space-stack-xs)", width: "100%", ...(drive === "scroll" ? null : style) }}
      {...(drive === "scroll" ? null : rest)}
    >
      <div
        ref={stageRef}
        style={{
          position: "relative", width: "100%", overflow: "hidden", isolation: "isolate",
          aspectRatio: height ? undefined : STAGES[ratio] || (typeof ratio === "number" ? String(ratio) : "4 / 3"),
          height: height || undefined,
          maxHeight: drive === "scroll" ? "80svh" : undefined,
          touchAction: drive === "manual" || drive === "both" ? "pan-y" : undefined,
          cursor: drive === "manual" || drive === "both" ? "grab" : undefined,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          ref={fieldRef}
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            transformStyle: "preserve-3d", perspective: "var(--dt-carousel-perspective)",
            transition: "scale var(--dt-motion-enter)",
          }}
        >
          {list.map((child, i) => (
            <div
              key={child.key != null ? child.key : i}
              ref={(el) => { itemRefs.current[i] = el; }}
              data-carousel-item={i}
              role="group"
              aria-roledescription="slide"
              aria-label={itemLabel(i + 1, total)}
              style={{
                position: "absolute", left: "50%", top: "50%",
                width: "var(--dt-carousel-item-width)", height: "var(--dt-carousel-item-height)",
                marginLeft: "calc(var(--dt-carousel-item-width) / -2)", marginTop: "calc(var(--dt-carousel-item-height) / -2)",
                borderRadius: "var(--dt-carousel-item-radius)", boxShadow: "var(--dt-carousel-item-shadow)",
                backfaceVisibility: "hidden", willChange: "transform, opacity",
                userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", pointerEvents: "auto",
              }}
            >
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", containerType: "size", display: "grid" }}>
                {child}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* The controls sit under the items, at the end, so they never cover
          what's moving, however small the carousel. */}
      {(showPause || showSteps) && (
        <div data-carousel-control="" style={{ display: "flex", justifyContent: "flex-end", gap: "var(--dt-space-inline-xs)" }}>
          {showSteps && (
            <button type="button" aria-label={previousLabel} style={CONTROL} onClick={() => engineRef.current && engineRef.current.go(-1)}>
              <Glyph name="prev" />
            </button>
          )}
          {showSteps && (
            <button type="button" aria-label={nextLabel} style={CONTROL} onClick={() => engineRef.current && engineRef.current.go(1)}>
              <Glyph name="next" />
            </button>
          )}
          {showPause && (
            <button type="button" aria-label={userPaused ? playLabel : pauseLabel} style={CONTROL} onClick={() => setUserPaused((v) => !v)}>
              <Glyph name={userPaused ? "play" : "pause"} />
            </button>
          )}
        </div>
      )}
      <VisuallyHidden aria-live="polite" aria-atomic="true">{announce}</VisuallyHidden>
    </div>
  );

  if (drive !== "scroll") return stage;
  /* A pinned stage inside a tall track: the page scrolls past it while it
     stays put and moves. */
  return (
    <div
      ref={trackRef}
      style={{ position: "relative", height: `calc(100svh + ${Math.max(1, total)} * var(--dt-carousel-scroll-step))`, ...style }}
      {...rest}
    >
      <div style={{ position: "sticky", top: 0, height: "100svh", display: "flex", alignItems: "center" }}>
        {stage}
      </div>
    </div>
  );
}

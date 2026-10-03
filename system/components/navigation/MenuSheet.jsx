import React from "react";
import { useModalFocus } from "../feedback/Dialog.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* A site or app menu as one sheet. Sections are big links; a section with
   pages under it opens a layer that slides in from the side, with a path
   ("Menu / Components") that goes back. A layer can be a list, cards, or a
   list with filter chips. Search sits in the footer beside close, and turns
   the footer into a field with results in the sheet above it. It grows out
   of the button that opened it and shrinks back into it; on touch a drag
   down closes it and a drag right goes back.

   Styles are inline and read tokens. Motion runs through the Web Animations
   API, reads its timing from the --dt-menu-sheet-* tokens once per opening,
   and stops for reduced motion. */

const NARROW = "(max-width: 699px)";
const FALLBACK_EASE = "cubic-bezier(.2,.85,.25,1)";
const useIsoLayoutEffect = typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect;

/* False while server rendering and hydrating, so the markup matches what the
   server sent. */
function useMedia(query) {
  const subscribe = React.useCallback((sync) => {
    if (!window.matchMedia) return () => {};
    const m = window.matchMedia(query);
    if (m.addEventListener) m.addEventListener("change", sync);
    else m.addListener(sync);
    return () => (m.removeEventListener ? m.removeEventListener("change", sync) : m.removeListener(sync));
  }, [query]);
  return React.useSyncExternalStore(subscribe, () => !!window.matchMedia && window.matchMedia(query).matches, () => false);
}

const PATHS = {
  search: ["M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m20.5 20.5-5-5"],
  close: ["M6 6l12 12", "M18 6 6 18"],
  next: ["m9 5.5 6.5 6.5L9 18.5"],
};
const Glyph = ({ name, size = "var(--dt-size-icon-md)" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ width: size, height: size, display: "block", flex: "none" }}>
    {PATHS[name].map((p) => <path key={p} d={p} />)}
  </svg>
);

/* "500ms" or "0.5s" as milliseconds. */
function ms(value, fallback) {
  const n = parseFloat(value);
  if (!isFinite(n)) return fallback;
  return /ms\s*$/.test(value) ? n : /s\s*$/.test(value) ? n * 1000 : n;
}
function readMotion(el) {
  const cs = getComputedStyle(el);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    open: ms(v("--dt-menu-sheet-open"), 500),
    close: ms(v("--dt-menu-sheet-close"), 440),
    layer: ms(v("--dt-menu-sheet-layer"), 360),
    travel: parseFloat(v("--dt-menu-sheet-travel")) || 40,
    ease: v("--dt-menu-sheet-ease") || FALLBACK_EASE,
  };
}

/* A clip that shows only the part of `box` covered by `r`, rounded. */
function clipTo(r, box, round) {
  return `inset(${r.top - box.top}px ${box.right - r.right}px ${box.bottom - r.bottom}px ${r.left - box.left}px round ${round})`;
}

/* The items of the layer a path of indices leads to, and the nodes on the way. */
function walk(items, stack) {
  const trail = [];
  let list = items;
  for (const i of stack) {
    const node = list && list[i];
    if (!node || !node.items) break;
    trail.push(node);
    list = node.items;
  }
  return { trail, node: trail[trail.length - 1] || null, list: list || [] };
}

/* Every item a person can go to, with the sections above it, for search. */
function flatten(items, path = [], out = []) {
  (items || []).forEach((it) => {
    if (it.items && it.items.length) flatten(it.items, path.concat(it.label), out);
    else if (it.href || it.onSelect) out.push({ item: it, path });
  });
  return out;
}

function matches(entries, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return entries;
  const hits = entries.filter(({ item, path }) => {
    const text = [item.label, item.description, item.keywords, path.join(" ")].filter(Boolean).join(" ").toLowerCase();
    return words.every((w) => text.indexOf(w) >= 0);
  });
  const whole = words.join(" ");
  const at = (e) => { const i = String(e.item.label).toLowerCase().indexOf(whole); return i < 0 ? 99 : i; };
  return hits.slice().sort((a, b) => at(a) - at(b));
}

const reset = { appearance: "none", border: 0, background: "none", font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", textDecoration: "none" };
const roundButton = {
  ...reset, flex: "none", display: "grid", placeItems: "center", padding: 0,
  width: "var(--dt-menu-sheet-control-size)", height: "var(--dt-menu-sheet-control-size)",
  borderRadius: "var(--dt-radius-pill)", color: "var(--dt-menu-sheet-fg)",
};
const small = { display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-menu-sheet-muted)" };
const dot = <span aria-hidden="true" style={{ display: "inline-block", width: "0.4em", height: "0.4em", marginInlineEnd: "var(--dt-space-inline-xs)", borderRadius: "var(--dt-radius-pill)", background: "var(--dt-menu-sheet-fg)", verticalAlign: "middle" }} />;
const tile = (icon, big) => icon ? (
  <span aria-hidden="true" style={{
    display: "grid", placeItems: "center", flex: "none",
    width: big ? "var(--dt-size-control-lg)" : "var(--dt-size-control-md)",
    height: big ? "var(--dt-size-control-lg)" : "var(--dt-size-control-md)",
    borderRadius: "var(--dt-radius-control)", background: "var(--dt-menu-sheet-fill)", color: "var(--dt-menu-sheet-fg)",
  }}>{icon}</span>
) : null;

const GLASS_BG = { glass: "var(--dt-surface-glass)", "glass-strong": "var(--dt-surface-glass-strong)" };
const BLUR = { backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)" };

export function MenuSheet({
  open,
  onClose,
  items = [],
  links,
  label = "Menu",
  home,
  search = true,
  searchItems,
  onSearch,
  onSelect,
  anchor,
  surface = "raised",
  searchLabel = "Search",
  searchPlaceholder = "Search",
  closeLabel = "Close menu",
  closeSearchLabel = "Close search",
  linksLabel = "More",
  allLabel = "All",
  emptyLabel = (q) => `Nothing matches “${q}”.`,
  resultsLabel = (n) => (n === 1 ? "1 result" : `${n} results`),
  style,
  ...rest
}) {
  const narrow = useMedia(NARROW);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const [mounted, setMounted] = React.useState(!!open);
  const [stack, setStack] = React.useState([]);
  const [query, setQuery] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const panel = React.useRef(null);
  const scrim = React.useRef(null);
  const content = React.useRef(null);
  const field = React.useRef(null);
  const motion = React.useRef(null);
  const move = React.useRef(null); // what the next paint animates: { dir } or { swap }
  const swiped = React.useRef(false);
  const opener = React.useRef([]); // the index that opened each layer, to return focus to it
  const searching = query !== null;

  const close = React.useCallback((why) => { onClose && onClose(why); }, [onClose]);

  /* Mount on open, starting at the top; on close, play the exit and unmount. */
  useIsoLayoutEffect(() => {
    if (open) {
      setStack([]);
      setQuery(null);
      setFilter("all");
      opener.current = [];
      swiped.current = false;
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    const el = panel.current;
    if (!el || reduce || !el.animate) { setMounted(false); return undefined; }
    const m = motion.current || readMotion(el);
    const box = el.getBoundingClientRect();
    const a = anchor && anchor.current ? anchor.current.getBoundingClientRect() : null;
    let anim;
    if (swiped.current) {
      anim = el.animate([{ transform: getComputedStyle(el).transform }, { transform: "translateY(100%)" }], { duration: 240, easing: "ease-in", fill: "forwards" });
    } else if (a && a.width && inside(a, box)) {
      Array.prototype.forEach.call(el.children, (c) => c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }));
      anim = el.animate([{ clipPath: clipTo(box, box, getComputedStyle(el).borderTopLeftRadius) }, { clipPath: clipTo(a, box, a.height / 2 + "px") }], { duration: m.close, easing: m.ease, fill: "forwards" });
    } else {
      anim = el.animate(narrow ? [{ transform: "none" }, { transform: "translateY(100%)" }] : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(16px) scale(.98)" }], { duration: narrow ? 280 : 200, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    }
    if (scrim.current) scrim.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: swiped.current ? 240 : m.close, fill: "forwards" });
    anim.onfinish = () => setMounted(false);
    return () => { anim.onfinish = null; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Entry: grow out of the anchor when it sits over the sheet, or rise. */
  useIsoLayoutEffect(() => {
    if (!open || !mounted) return;
    const el = panel.current;
    if (!el) return;
    el.scrollTop = 0;
    if (reduce || !el.animate) return;
    /* An opening that interrupts a closing starts from a clean slate. */
    [el, scrim.current].concat(Array.prototype.slice.call(el.children)).forEach((n) => n && n.getAnimations && n.getAnimations().forEach((x) => x.cancel()));
    const m = (motion.current = readMotion(el));
    const box = el.getBoundingClientRect();
    const a = anchor && anchor.current ? anchor.current.getBoundingClientRect() : null;
    if (a && a.width && inside(a, box)) {
      el.animate([{ clipPath: clipTo(a, box, a.height / 2 + "px") }, { clipPath: clipTo(box, box, getComputedStyle(el).borderTopLeftRadius) }], { duration: m.open, easing: m.ease });
    } else {
      el.animate(narrow ? [{ transform: "translateY(100%)" }, { transform: "none" }] : [{ opacity: 0, transform: "translateY(24px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: narrow ? m.open * 0.85 : m.open * 0.6, easing: m.ease });
    }
    if (content.current) content.current.animate([{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: m.open, delay: m.open * 0.3, easing: m.ease, fill: "backwards" });
    if (scrim.current) scrim.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: m.open * 0.8, easing: "ease-out" });
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Focus in, Tab kept inside, Escape (out of search first), a still page. */
  useModalFocus(!!open && mounted, panel, () => (searching ? leaveSearch() : close("escape")));

  /* Each new layer or the search swap eases in; focus goes to its first item,
     or back to the row that opened the layer we left. */
  const view = searching ? "search" : stack.join(".");
  useIsoLayoutEffect(() => {
    const step = move.current;
    move.current = null;
    if (!mounted || !step) return;
    const el = content.current;
    if (el) {
      el.style.transform = "";
      if (panel.current) panel.current.scrollTop = 0;
      const m = motion.current || (panel.current ? readMotion(panel.current) : null);
      if (m && !reduce && el.animate) {
        const from = step.swap ? "translateY(10px)" : `translateX(${step.dir * m.travel}px)`;
        el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: "none" }], { duration: m.layer, easing: m.ease });
      }
    }
    if (step.swap === "in") { if (field.current) field.current.focus({ preventScroll: true }); return; }
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse || !el) return;
    const target = step.back != null ? el.querySelector(`[data-menu-index="${step.back}"]`) : el.querySelector("[data-menu-index]");
    if (target) target.focus({ preventScroll: true });
  }, [view, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Focus the first item when it opens, so the keyboard starts in the menu. */
  React.useEffect(() => {
    if (!open || !mounted) return;
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const first = content.current && content.current.querySelector("[data-menu-index]");
    if (first && !coarse) first.focus({ preventScroll: true });
  }, [open, mounted]);

  const push = (i) => {
    opener.current = opener.current.concat(i);
    move.current = { dir: 1 };
    setFilter("all");
    setStack((s) => s.concat(i));
  };
  const goTo = (depth) => {
    if (depth >= stack.length) return;
    const back = opener.current[depth];
    opener.current = opener.current.slice(0, depth);
    move.current = { dir: -1, back };
    setFilter("all");
    setStack((s) => s.slice(0, depth));
  };
  const enterSearch = () => {
    move.current = { swap: "in" };
    setQuery("");
  };
  function leaveSearch() {
    move.current = { swap: "out" };
    setQuery(null);
  }

  const choose = (item, e) => {
    if (item.onSelect) item.onSelect(e);
    if (onSelect) onSelect(item, e);
    close("select");
  };

  /* Touch: down from the top closes, right in a layer goes back. */
  const drag = React.useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1 || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { drag.current = null; return; }
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, t: Date.now(), top: panel.current.scrollTop <= 0, axis: null, dx: 0, dy: 0 };
  };
  const onTouchMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const t = e.touches[0];
    d.dx = t.clientX - d.x;
    d.dy = t.clientY - d.y;
    if (!d.axis) {
      if (d.top && d.dy > 8 && d.dy > Math.abs(d.dx)) d.axis = "y";
      else if (stack.length && !searching && d.dx > 10 && d.dx > Math.abs(d.dy) * 1.3) d.axis = "x";
      else { if (Math.abs(d.dx) > 14 || d.dy < -6) drag.current = null; return; }
    }
    if (d.axis === "y") panel.current.style.transform = `translateY(${Math.max(0, d.dy)}px)`;
    else if (content.current) content.current.style.transform = `translateX(${Math.max(0, d.dx)}px)`;
  };
  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.axis) return;
    const el = panel.current;
    const ms0 = Math.max(1, Date.now() - d.t);
    const settle = (node) => {
      if (!node) return;
      node.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)";
      node.style.transform = "";
      setTimeout(() => { node.style.transition = ""; }, 240);
    };
    if (d.axis === "y") {
      if (d.dy > Math.min(140, el.offsetHeight * 0.3) || (d.dy / ms0 > 0.6 && d.dy > 30)) {
        swiped.current = true;
        close("swipe");
      } else settle(el);
    } else if (d.dx > Math.min(110, el.offsetWidth * 0.28) || (d.dx / ms0 > 0.5 && d.dx > 40)) {
      goTo(stack.length - 1);
    } else settle(content.current);
  };

  if (!mounted) return null;

  const { trail, node, list } = walk(items, stack);
  const entries = searching ? (onSearch ? (onSearch(query) || []).map((it) => ({ item: it, path: [] })) : matches(searchItems ? searchItems.map((it) => ({ item: it, path: [] })) : flatten(items), query)) : [];

  /* One way to draw a link or a button for an item; data-menu-index lets
     focus find it again. */
  const itemEl = ({ item, index, styleOf, opens }, children) => {
    const props = {
      key: index,
      "data-menu-index": index,
      "aria-current": item.current ? "page" : undefined,
      style: styleOf,
    };
    if (opens) return <button type="button" {...props} onClick={() => push(index)}>{children}</button>;
    if (item.href) return <a href={item.href} {...props} onClick={(e) => choose(item, e)}>{children}</a>;
    return <button type="button" {...props} onClick={(e) => choose(item, e)}>{children}</button>;
  };

  const row = (item, index, extra) => {
    const opens = !!(item.items && item.items.length) && !extra;
    return (
      itemEl({ item, index, opens, styleOf: {
        ...reset, display: "flex", alignItems: "center", gap: "var(--dt-space-inline-md)", width: "100%", minWidth: 0,
        padding: opens && item.icon ? "var(--dt-space-inset-md) 0" : "var(--dt-space-inset-sm) 0",
        borderBottom: "var(--dt-border-width-default) solid var(--dt-menu-sheet-divider)",
        color: "var(--dt-menu-sheet-fg)",
      } }, <>
        {tile(item.icon, opens)}
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: "block", fontWeight: "var(--dt-font-weight-regular)", fontSize: opens && item.icon ? "var(--dt-text-heading-sm-size)" : "var(--dt-text-body-lg-size)", lineHeight: "var(--dt-text-body-md-line)" }}>
            {item.label}{item.current && !(extra || item.description) ? <> {dot}</> : null}
          </b>
          {extra || item.description ? <span style={small}>{item.current ? dot : null}{extra || item.description}</span> : null}
        </span>
        {opens ? (
          <span style={{ flex: "none", minWidth: "var(--dt-size-control-xs)", padding: "var(--dt-space-inset-2xs) var(--dt-space-inset-xs)", borderRadius: "var(--dt-radius-pill)", background: "var(--dt-menu-sheet-fill)", color: "var(--dt-menu-sheet-muted)", fontSize: "var(--dt-text-body-xs-size)", textAlign: "center" }}>{item.items.length}</span>
        ) : null}
      </>)
    );
  };

  let body;
  if (searching) {
    const groups = [];
    entries.forEach((en) => {
      const g = en.path[0] || label;
      let at = groups.find((x) => x.label === g);
      if (!at) groups.push((at = { label: g, rows: [] }));
      at.rows.push(en);
    });
    let n = 0;
    body = entries.length ? groups.map((g) => (
      <section key={g.label} aria-label={g.label}>
        {groups.length > 1 ? <p style={{ ...small, margin: "var(--dt-space-stack-md) 0 0" }}>{g.label}</p> : null}
        {g.rows.map((en) => row(en.item, n++, en.item.description || en.path.join(" · ") || undefined))}
      </section>
    )) : <p style={{ margin: "var(--dt-space-stack-lg) 0", color: "var(--dt-menu-sheet-muted)" }}>{emptyLabel(query.trim())}</p>;
  } else if (!node) {
    body = (
      <>
        <nav aria-label={label} style={{ display: "flex", flexDirection: "column" }}>
          {list.map((it, i) => (
            itemEl({ item: it, index: i, opens: !!(it.items && it.items.length), styleOf: {
              ...reset, display: "block", width: "100%", padding: "var(--dt-space-inset-xs) 0",
              borderBottom: "var(--dt-border-width-default) solid var(--dt-menu-sheet-divider)",
              color: it.current ? "var(--dt-menu-sheet-muted)" : "var(--dt-menu-sheet-fg)",
            } }, <>
              <span style={{ display: "block", fontFamily: "var(--dt-text-display-sm-family)", fontSize: "var(--dt-menu-sheet-link-size)", fontWeight: "var(--dt-font-weight-regular)", letterSpacing: "var(--dt-text-display-sm-tracking)", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>
              {it.description ? <span style={{ ...small, marginTop: "var(--dt-space-stack-2xs)" }}>{it.description}</span> : null}
            </>)
          ))}
        </nav>
        {links && links.length ? (
          <nav aria-label={linksLabel} style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-xs)", marginTop: "var(--dt-space-stack-md)" }}>
            {links.map((it, i) => (
              itemEl({ item: it, index: list.length + i, styleOf: {
                ...reset, display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
                minHeight: "var(--dt-size-control-md)", padding: "0 var(--dt-space-inset-md)", borderRadius: "var(--dt-radius-pill)",
                background: "var(--dt-menu-sheet-fill)", color: "var(--dt-menu-sheet-fg)", fontSize: "var(--dt-text-body-md-size)",
              } }, <>{it.icon}{it.label}</>)
            ))}
          </nav>
        ) : null}
      </>
    );
  } else if (node.display === "cards") {
    body = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--dt-space-inline-xs)", paddingTop: "var(--dt-space-stack-2xs)" }}>
        {list.map((it, i) => (
          itemEl({ item: it, index: i, styleOf: {
            ...reset, display: "flex", flexDirection: i === 0 ? "row" : "column", alignItems: i === 0 ? "center" : "flex-start",
            gap: "var(--dt-space-inline-sm)", minWidth: 0, gridColumn: i === 0 ? "1 / -1" : undefined,
            padding: "var(--dt-space-inset-md)", borderRadius: "var(--dt-radius-container)",
            background: "var(--dt-menu-sheet-fill)", color: "var(--dt-menu-sheet-fg)",
            boxShadow: it.current ? "inset 0 0 0 var(--dt-border-width-strong) var(--dt-menu-sheet-fg)" : undefined,
          } }, <>
            {it.icon ? <span aria-hidden="true" style={{ display: "block", flex: "none" }}>{it.icon}</span> : null}
            <span style={{ minWidth: 0 }}>
              <b style={{ display: "block", fontWeight: "var(--dt-font-weight-medium)", fontSize: i === 0 ? "var(--dt-text-heading-xs-size)" : "var(--dt-text-body-md-size)", lineHeight: 1.25 }}>{it.label}</b>
              {it.description ? <span style={{ ...small, whiteSpace: "normal", marginTop: "var(--dt-space-stack-2xs)" }}>{it.description}</span> : null}
            </span>
          </>)
        ))}
      </div>
    );
  } else if (node.display === "filter") {
    const groups = list.filter((g) => g.items && g.items.length);
    const shown = groups.reduce((out, g, gi) => (filter === "all" || filter === String(gi) ? out.concat(g.items.map((it) => ({ it, g }))) : out), []);
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const chip = (id, text, n) => (
      <button key={id} type="button" aria-pressed={filter === id} onClick={() => {
        setFilter(id);
        const el = content.current && content.current.querySelector("[data-menu-list]");
        const m = motion.current;
        if (el && m && !reduce && el.animate) requestAnimationFrame(() => el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: m.layer * 0.8, easing: m.ease }));
      }} style={{
        ...reset, flex: "none", display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
        minHeight: "var(--dt-size-control-sm)", padding: "0 var(--dt-space-inset-sm)", borderRadius: "var(--dt-radius-pill)", whiteSpace: "nowrap",
        border: "var(--dt-border-width-default) solid " + (filter === id ? "var(--dt-menu-sheet-chip-on-bg)" : "var(--dt-menu-sheet-divider)"),
        background: filter === id ? "var(--dt-menu-sheet-chip-on-bg)" : "transparent",
        color: filter === id ? "var(--dt-menu-sheet-chip-on-fg)" : "var(--dt-menu-sheet-fg)",
        fontSize: "var(--dt-text-body-sm-size)",
        transition: "background var(--dt-motion-micro), color var(--dt-motion-micro), border-color var(--dt-motion-micro)",
      }}>{text}<span style={{ opacity: 0.7, fontSize: "var(--dt-text-body-xs-size)", fontVariantNumeric: "tabular-nums" }}>{n}</span></button>
    );
    body = (
      <>
        <div role="toolbar" aria-label={node.filterLabel || "Filter"} style={{
          display: "flex", gap: "var(--dt-space-inline-xs)", overflowX: "auto", scrollbarWidth: "none",
          margin: "var(--dt-space-stack-2xs) calc(-1 * var(--dt-menu-sheet-padding))",
          padding: "var(--dt-space-inset-2xs) var(--dt-menu-sheet-padding)",
        }}>
          {chip("all", allLabel, total)}
          {groups.map((g, gi) => chip(String(gi), g.label, g.items.length))}
        </div>
        <div data-menu-list style={{ display: "flex", flexDirection: "column" }}>
          {shown.map(({ it }, i) => row(it, i, it.description || undefined))}
        </div>
      </>
    );
  } else {
    body = <div style={{ display: "flex", flexDirection: "column" }}>{list.map((it, i) => row(it, i))}</div>;
  }

  const crumb = searching ? [searchLabel] : [label].concat(trail.map((t) => t.label));
  const homeEl = home && React.isValidElement(home) ? home : home && home.href ? (
    <a href={home.href} aria-current={home.current ? "page" : undefined} onClick={(e) => choose(home, e)} style={{ ...reset, flex: "none", padding: "var(--dt-space-inset-xs) 0", fontSize: "var(--dt-text-body-sm-size)", color: home.current ? "var(--dt-menu-sheet-fg)" : "var(--dt-menu-sheet-muted)" }}>{home.label || "Home"}</a>
  ) : null;

  const glassBg = GLASS_BG[surface];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--dt-z-dialog)", display: "flex", alignItems: narrow ? "flex-end" : "center", justifyContent: "center" }}>
      <div ref={scrim} onClick={() => close("scrim")} style={{ position: "absolute", inset: 0, background: "var(--dt-menu-sheet-scrim)" }} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          position: "relative", boxSizing: "border-box", display: "flex", flexDirection: "column",
          width: narrow ? "calc(100% - 2 * var(--dt-menu-sheet-inset))" : "min(calc(100% - 2 * var(--dt-menu-sheet-inset)), var(--dt-menu-sheet-width))",
          height: narrow ? "calc(100% - var(--dt-menu-sheet-top-gap) - env(safe-area-inset-top, 0px))" : "min(calc(100% - 2 * var(--dt-menu-sheet-top-gap)), var(--dt-dialog-max-height))",
          marginBottom: narrow ? "calc(var(--dt-menu-sheet-inset) + env(safe-area-inset-bottom, 0px))" : 0,
          padding: "var(--dt-menu-sheet-padding) var(--dt-menu-sheet-padding) 0",
          overflowX: "hidden", overflowY: "auto", overscrollBehavior: "contain",
          borderRadius: "var(--dt-menu-sheet-radius)",
          background: "var(--dt-menu-sheet-bg)", color: "var(--dt-menu-sheet-fg)",
          boxShadow: "var(--dt-menu-sheet-shadow)", outline: "none",
          fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)",
          ...(glassBg ? { "--dt-menu-sheet-bg": glassBg, ...BLUR } : null),
          ...style,
        }}
        {...rest}
      >
        <div ref={content} style={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", paddingBottom: "var(--dt-space-stack-xs)" }}>
            <nav aria-label={`${label} path`} style={{ flex: 1, minWidth: 0 }}>
              <p style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)", margin: 0, fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-menu-sheet-muted)" }}>
                {crumb.map((c, i) => i === crumb.length - 1 ? (
                  <span key={i} aria-current="location" style={{ color: "var(--dt-menu-sheet-fg)" }}>{c}</span>
                ) : (
                  <React.Fragment key={i}>
                    <button type="button" onClick={() => goTo(i)} style={{
                      ...reset, padding: "var(--dt-space-inset-xs) 0", margin: "calc(-1 * var(--dt-space-inset-xs)) 0", color: "var(--dt-menu-sheet-muted)",
                      textDecoration: "underline", textDecorationColor: "var(--dt-menu-sheet-divider)", textUnderlineOffset: "0.25em",
                    }}>{c}</button>
                    <span aria-hidden="true" style={{ opacity: 0.5 }}>/</span>
                  </React.Fragment>
                ))}
              </p>
            </nav>
            {homeEl}
          </div>
          <div style={{ flex: "1 0 auto" }}>{body}</div>
        </div>

        {searching ? <VisuallyHidden aria-live="polite">{entries.length ? resultsLabel(entries.length) : emptyLabel(query.trim())}</VisuallyHidden> : null}

        <div style={{
          position: "sticky", bottom: 0, zIndex: 2, flex: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-space-inline-sm)",
          margin: "var(--dt-space-stack-md) calc(-1 * var(--dt-menu-sheet-padding)) 0",
          padding: "var(--dt-space-inset-sm) var(--dt-space-inset-sm) calc(var(--dt-space-inset-sm) + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(to top, var(--dt-menu-sheet-bg) 68%, transparent)",
        }}>
          {searching ? (
            <label style={{
              flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
              height: "var(--dt-menu-sheet-control-size)", padding: "0 var(--dt-space-inset-2xs) 0 var(--dt-space-inset-md)",
              borderRadius: "var(--dt-radius-pill)", background: "var(--dt-menu-sheet-fill)", color: "var(--dt-menu-sheet-muted)",
            }}>
              <Glyph name="search" size="var(--dt-size-icon-sm)" />
              <input
                ref={field}
                type="text"
                role="searchbox"
                inputMode="search"
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  /* Enter takes the first result, through its own link or button. */
                  const first = content.current && content.current.querySelector("[data-menu-index]");
                  if (!first) return;
                  e.preventDefault();
                  first.click();
                }}
                style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", color: "var(--dt-menu-sheet-fg)", font: "inherit", fontSize: "max(16px, var(--dt-text-body-md-size))" }}
              />
              <button type="button" onClick={leaveSearch} aria-label={closeSearchLabel} style={{ ...roundButton, width: "var(--dt-size-control-sm)", height: "var(--dt-size-control-sm)", background: "var(--dt-menu-sheet-bg)" }}>
                <Glyph name="close" size="var(--dt-size-icon-sm)" />
              </button>
            </label>
          ) : (
            <>
              {search ? (
                <button type="button" onClick={enterSearch} aria-label={searchLabel} style={roundButton}><Glyph name="search" /></button>
              ) : <span />}
              <button type="button" onClick={() => close("close")} aria-label={closeLabel} style={roundButton}><Glyph name="close" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function inside(a, box) {
  const x = a.left + a.width / 2;
  const y = a.top + a.height / 2;
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

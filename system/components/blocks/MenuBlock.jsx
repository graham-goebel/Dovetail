import React from "react";
import { Section } from "../primitives/Section.jsx";
import { StoreHeader } from "../commerce/StoreHeader.jsx";
import { FulfilmentToggle } from "../commerce/FulfilmentToggle.jsx";
import { MenuSection } from "../commerce/MenuSection.jsx";
import { MenuItem } from "../commerce/MenuItem.jsx";

const role = (name) => ({
  fontFamily: `var(--dt-text-${name}-family)`,
  fontSize: `var(--dt-text-${name}-size)`,
  lineHeight: `var(--dt-text-${name}-line)`,
  fontWeight: `var(--dt-text-${name}-weight)`,
  letterSpacing: `var(--dt-text-${name}-tracking)`,
});

const GLASS = "var(--dt-backdrop-glass)";

/* The nearest ancestor that scrolls vertically: the AppShell in a device
   frame, a dialog, or none (the document). Read in effects and handlers only. */
function scrollParent(el) {
  for (let node = el && el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function reducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) { return false; }
}

/* A restaurant's ordering page: the store's header, delivery or pickup, a
   sticky row of categories that follows the reader down the menu, and the
   menu itself. Everything is data and callbacks; the basket lives in the app. */
export function MenuBlock({
  store,
  fulfilment,
  sections = [],
  onItemSelect,
  onItemAdd,
  quantities,
  onQuantityChange,
  layout = "list",
  currency,
  locale,
  navLabel = "Menu categories",
  stickyTop = "0px",
  tone = "base",
  dark,
  texture,
  spacing = "default",
  width = "default",
  ...rest
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const anchor = (id) => `${uid}-${id}`;
  const navRef = React.useRef(null);
  const listRef = React.useRef(null);
  const pending = React.useRef(null);
  const ids = sections.map((s) => s.id);
  const key = ids.join("|");
  const [active, setActive] = React.useState(ids[0]);
  const current = ids.includes(active) ? active : ids[0];

  /* The section in view: the first one crossing the band just under the
     sticky nav. Created in an effect, so a server render never touches it. */
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === "undefined") return undefined;
    const root = scrollParent(nav);
    const top = parseFloat(getComputedStyle(nav).top) || 0;
    const offset = Math.round(top + nav.offsetHeight);
    const visible = new Set();
    const els = ids.map((id) => document.getElementById(anchor(id))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) visible.add(en.target.id); else visible.delete(en.target.id);
      }
      const first = els.find((el) => visible.has(el.id));
      if (!first) return;
      const id = ids[els.indexOf(first)];
      if (pending.current) {
        if (pending.current === id) pending.current = null;
        return;
      }
      setActive(id);
    }, { root, rootMargin: `-${offset}px 0px -55% 0px`, threshold: 0 });
    els.forEach((el) => io.observe(el));
    /* A reader who scrolls by hand takes over from a jump still in flight. */
    const release = () => { pending.current = null; };
    const target = root || window;
    target.addEventListener("wheel", release, { passive: true });
    target.addEventListener("touchstart", release, { passive: true });
    target.addEventListener("keydown", release);
    return () => {
      io.disconnect();
      target.removeEventListener("wheel", release);
      target.removeEventListener("touchstart", release);
      target.removeEventListener("keydown", release);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stickyTop, uid]);

  /* Keep the current pill in view inside the row, sideways only. */
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const link = list.querySelector('[aria-current="true"]');
    if (!link) return;
    const l = link.offsetLeft, r = l + link.offsetWidth;
    if (l < list.scrollLeft || r > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, l - (list.clientWidth - link.offsetWidth) / 2), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }, [current]);

  const jump = (e, id) => {
    const el = document.getElementById(anchor(id));
    const nav = navRef.current;
    if (!el || !nav) return;
    e.preventDefault();
    pending.current = id;
    setActive(id);
    const root = scrollParent(nav);
    const rootTop = root ? root.getBoundingClientRect().top : 0;
    const stuck = rootTop + (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight;
    /* A little air between the nav and the heading: the row's own inset. */
    const gap = listRef.current ? parseFloat(getComputedStyle(listRef.current).paddingTop) || 0 : 0;
    const delta = el.getBoundingClientRect().top - stuck - gap;
    const behavior = reducedMotion() ? "auto" : "smooth";
    (root || window).scrollBy({ top: delta, behavior });
    try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
  };

  const pill = (on) => ({
    ...role("label-md"),
    display: "inline-flex", alignItems: "center", boxSizing: "border-box", whiteSpace: "nowrap",
    minHeight: "var(--dt-size-control-sm)", padding: "0 var(--dt-space-inset-sm)",
    borderRadius: "var(--dt-radius-pill)",
    border: `var(--dt-border-width-default) solid ${on ? "var(--dt-surface-inverse)" : "var(--dt-border-subtle)"}`,
    background: on ? "var(--dt-surface-inverse)" : "transparent",
    color: on ? "var(--dt-text-inverse)" : "var(--dt-text-secondary)",
    fontWeight: on ? "var(--dt-font-weight-semibold)" : "var(--dt-font-weight-medium)",
    textDecoration: "none",
    transition: "background var(--dt-motion-micro), color var(--dt-motion-micro), border-color var(--dt-motion-micro)",
  });

  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)", minWidth: 0 }}>
        {store && <StoreHeader locale={locale} currency={currency} {...store} />}
        {fulfilment && (
          <FulfilmentToggle
            label={fulfilment.label || "How to get your order"}
            value={fulfilment.value}
            onChange={fulfilment.onChange}
            options={fulfilment.options}
          />
        )}
        {sections.length > 1 && (
          <nav
            ref={navRef}
            aria-label={navLabel}
            style={{
              position: "sticky", top: stickyTop, zIndex: "var(--dt-z-sticky)",
              marginInline: "calc(-1 * var(--dt-space-gutter))",
              background: "var(--dt-surface-glass)",
              backdropFilter: GLASS, WebkitBackdropFilter: GLASS,
              borderBottom: "var(--dt-border-width-default) solid var(--dt-border-glass)",
            }}
          >
            <ul
              ref={listRef}
              role="list"
              style={{
                listStyle: "none", margin: 0, display: "flex", gap: "var(--dt-space-inline-xs)",
                overflowX: "auto", scrollbarWidth: "none", overscrollBehaviorX: "contain",
                padding: "var(--dt-space-inset-xs) var(--dt-space-gutter)",
              }}
            >
              {sections.map((s) => {
                const on = s.id === current;
                return (
                  <li key={s.id} style={{ flex: "none", display: "flex" }}>
                    <a href={`#${anchor(s.id)}`} aria-current={on ? "true" : undefined} onClick={(e) => jump(e, s.id)} style={pill(on)}>
                      {s.title}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)", minWidth: 0 }}>
          {sections.map((s) => (
            <MenuSection key={s.id} id={anchor(s.id)} tabIndex={-1} title={s.title} description={s.description} layout={layout} style={{ outline: "none" }}>
              {(s.items || []).map(({ id, ...item }) => (
                <MenuItem
                  key={id}
                  currency={currency}
                  locale={locale}
                  {...item}
                  quantity={quantities && quantities[id] != null ? quantities[id] : item.quantity}
                  onSelect={onItemSelect ? () => onItemSelect(id, s.id) : item.onSelect}
                  onAdd={onItemAdd ? () => onItemAdd(id, s.id) : item.onAdd}
                  onQuantityChange={onQuantityChange ? (n) => onQuantityChange(id, n) : item.onQuantityChange}
                />
              ))}
            </MenuSection>
          ))}
        </div>
      </div>
    </Section>
  );
}

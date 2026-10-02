import React from "react";
import { Drawer } from "../feedback/Drawer.jsx";
import { fillTone } from "../primitives/Section.jsx";

/* The bar's surface. A brand fill re-points the text, links, the current
   link's mark and the buttons on it, the same way a brand Section does, and
   the menu that opens on a narrow screen takes the same fill. Glass lets the
   page show through, blurred, for a bar over a picture or a sticky header. */
const MENU_SURFACE = { base: "raised", glass: "glass-strong", brand: "brand", "brand-muted": "brand-muted" };

function MenuIcon() {
  return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
  );
}

/* False while server rendering and hydrating, so the markup matches what the
   server sent; matchMedia is read after that, and at once in a client-only
   render. */
function useNarrow(below) {
  const query = below ? `(max-width: ${below - 1}px)` : null;
  const subscribe = React.useCallback((sync) => {
    if (!query || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return React.useSyncExternalStore(
    subscribe,
    () => !!(query && window.matchMedia && window.matchMedia(query).matches),
    () => false,
  );
}

export function Navbar({ brand, links = [], actions, current, onNavigate, label = "Main", sticky = false, collapseBelow = 640, surface = "base", style, ...rest }) {
  const narrow = useNarrow(collapseBelow) && links.length > 0;
  const [open, setOpen] = React.useState(false);
  const go = (id) => { setOpen(false); if (onNavigate) onNavigate(id); };
  const fill = surface === "brand" || surface === "brand-muted" ? fillTone(surface) : null;
  const glass = surface === "glass";
  return (
    <nav aria-label={label} style={{
      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-lg)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-lg)",
      background: "var(--dt-surface-base)",
      ...(fill || {}),
      ...(glass ? { background: "var(--dt-surface-glass)", backdropFilter: "var(--dt-backdrop-glass)", WebkitBackdropFilter: "var(--dt-backdrop-glass)" } : null),
      borderBottom: `var(--dt-border-width-default) solid ${glass ? "var(--dt-border-glass)" : "var(--dt-border-subtle)"}`,
      position: sticky ? "sticky" : "static", top: 0, zIndex: sticky ? "var(--dt-z-sticky)" : undefined, ...style,
    }} {...rest}>
      {brand && <span style={{ display: "flex", alignItems: "center", flex: "none" }}>{brand}</span>}
      {!narrow && <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "var(--dt-space-inline-md)", alignItems: "center", flex: 1, minWidth: 0, overflowX: "auto" }}>
        {links.map(l => {
          const on = l.id === current;
          return (
            <li key={l.id}>
              <a
                href={l.href || "#"}
                aria-current={on ? "page" : undefined}
                onClick={e => { if (onNavigate) { e.preventDefault(); onNavigate(l.id); } }}
                style={{
                  fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)",
                  fontWeight: "var(--dt-font-weight-medium)", textDecoration: "none", whiteSpace: "nowrap",
                  color: on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                  padding: "var(--dt-space-inset-2xs, 4px) 0",
                  borderBottom: `2px solid ${on ? "var(--dt-border-selected)" : "transparent"}`,
                }}
              >{l.label}</a>
            </li>
          );
        })}
      </ul>}
      {actions && !narrow && <span style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", flex: "none" }}>{actions}</span>}
      {narrow && (
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "var(--dt-size-control-md)", height: "var(--dt-size-control-md)",
            border: 0, borderRadius: "var(--dt-radius-control)", background: "transparent",
            color: "var(--dt-text-primary)", cursor: "pointer",
          }}
        ><MenuIcon /></button>
      )}
      {narrow && (
        <Drawer open={open} onClose={() => setOpen(false)} side="right" title="Menu" label={label + " menu"} footer={actions} surface={MENU_SURFACE[surface] || "raised"}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {links.map(l => {
              const on = l.id === current;
              return (
                <li key={l.id}>
                  <a
                    href={l.href || "#"}
                    aria-current={on ? "page" : undefined}
                    onClick={e => { if (onNavigate) e.preventDefault(); go(l.id); }}
                    style={{
                      display: "block", padding: "var(--dt-space-inset-sm) 0",
                      fontFamily: "var(--dt-text-label-lg-family)", fontSize: "var(--dt-text-label-lg-size)",
                      fontWeight: "var(--dt-font-weight-medium)", textDecoration: "none",
                      color: on ? "var(--dt-text-primary)" : "var(--dt-text-secondary)",
                      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                    }}
                  >{l.label}</a>
                </li>
              );
            })}
          </ul>
        </Drawer>
      )}
    </nav>
  );
}

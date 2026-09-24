import React from "react";

function MenuIcon() {
  return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)" }} aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
  );
}

function useNarrow(below) {
  const query = below ? `(max-width: ${below - 1}px)` : null;
  const [narrow, setNarrow] = React.useState(() => !!(query && typeof window !== "undefined" && window.matchMedia && window.matchMedia(query).matches));
  React.useEffect(() => {
    if (!query || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

export function Navbar({ brand, links = [], actions, current, onNavigate, label = "Main", sticky = false, collapseBelow = 640, style, ...rest }) {
  const narrow = useNarrow(collapseBelow) && links.length > 0;
  const [open, setOpen] = React.useState(false);
  const go = (id) => { setOpen(false); if (onNavigate) onNavigate(id); };
  return (
    <nav aria-label={label} style={{
      display: "flex", alignItems: "center", gap: "var(--dt-space-inline-lg)",
      padding: "var(--dt-space-inset-sm) var(--dt-space-inset-lg)",
      background: "var(--dt-surface-base)",
      borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
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
        <Drawer open={open} onClose={() => setOpen(false)} side="right" title="Menu" label={label + " menu"} footer={actions}>
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

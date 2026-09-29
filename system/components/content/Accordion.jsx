import React from "react";

export function Accordion({ items = [], allowMultiple = false, defaultOpen = [], label, style, ...rest }) {
  const [open, setOpen] = React.useState(() => new Set(defaultOpen));
  function toggle(id) {
    setOpen(prev => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return (
    <div role="group" aria-label={label} style={{ display: "flex", flexDirection: "column", ...style }} {...rest}>
      {items.map((it, i) => {
        const id = it.id ?? String(i);
        const on = open.has(id);
        return (
          <div key={id} style={{ borderTop: i === 0 ? "var(--dt-border-width-default) solid var(--dt-border-subtle)" : "none", borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={"acc-panel-" + id}
                id={"acc-btn-" + id}
                onClick={() => toggle(id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "var(--dt-space-inline-sm)", padding: "var(--dt-space-inset-sm) 0",
                  appearance: "none", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  fontFamily: "var(--dt-text-label-lg-family)", fontSize: "var(--dt-text-label-lg-size)",
                  fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-primary)",
                }}
              >
                <span style={{ minWidth: 0 }}>{it.title}</span>
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" style={{
                  flex: "none", color: "var(--dt-text-tertiary)",
                  transform: on ? "rotate(180deg)" : "none",
                  transition: "transform var(--dt-motion-emphasis)",
                }}>
                  <path d="M5 12h14" />
                  <path d="M12 5v14" style={{
                    transformOrigin: "12px 12px", transform: on ? "scaleY(0)" : "none",
                    transition: "transform var(--dt-motion-emphasis)",
                  }} />
                </svg>
              </button>
            </h3>
            {/* The panel stays mounted so its height can ease open and shut;
                closed, it is hidden from the tab order and the accessibility tree. */}
            <div style={{
              display: "grid", gridTemplateRows: on ? "1fr" : "0fr",
              visibility: on ? "visible" : "hidden",
              transition: "grid-template-rows var(--dt-motion-emphasis), visibility 0s linear " + (on ? "0s" : "var(--dt-duration-300)"),
            }}>
              <div style={{ overflow: "hidden", minHeight: 0 }}>
                <div id={"acc-panel-" + id} role="region" aria-labelledby={"acc-btn-" + id} style={{
                  padding: "0 0 var(--dt-space-inset-md)",
                  fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                  lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
                  maxWidth: "62ch", textWrap: "pretty",
                  opacity: on ? 1 : 0, transition: "opacity var(--dt-motion-emphasis)",
                }}>{it.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

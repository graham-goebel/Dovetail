import React from "react";

export function List({ items = [], divided = true, interactive = false, label, style, ...rest }) {
  return (
    <ul role="list" aria-label={label} style={{ listStyle: "none", margin: 0, padding: 0, ...style }} {...rest}>
      {items.map((it, i) => {
        const clickable = interactive && it.onClick;
        const Row = clickable ? "button" : "div";
        return (
          <li key={it.id ?? i} style={{ borderTop: i === 0 || !divided ? "none" : "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
            <Row
              onClick={it.onClick}
              type={clickable ? "button" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)",
                width: "100%", boxSizing: "border-box", textAlign: "left",
                padding: "var(--dt-space-inset-sm) var(--dt-space-inset-md)",
                background: "transparent", border: "none", font: "inherit", color: "inherit",
                cursor: clickable ? "pointer" : "default",
                transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
              }}
              onMouseEnter={clickable ? e => (e.currentTarget.style.background = "var(--dt-surface-hover)") : undefined}
              onMouseLeave={clickable ? e => (e.currentTarget.style.background = "transparent") : undefined}
            >
              {it.leading && <span style={{ flex: "none", display: "flex" }}>{it.leading}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: "block", fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)",
                  lineHeight: "var(--dt-text-body-md-line)", fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-primary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.title}</span>
                {it.description && (
                  <span style={{
                    display: "block", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                    lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)",
                  }}>{it.description}</span>
                )}
              </span>
              {it.trailing && <span style={{ flex: "none", display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>{it.trailing}</span>}
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

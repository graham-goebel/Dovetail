import React from "react";

export function Breadcrumbs({ items = [], label = "Breadcrumb", separator = "/", style, ...rest }) {
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--dt-space-inline-xs)" }}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.href || i} style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)", minWidth: 0 }}>
              {last ? (
                <span aria-current="page" style={{
                  fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                  color: "var(--dt-text-primary)", fontWeight: "var(--dt-font-weight-medium)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.label}</span>
              ) : (
                <a href={it.href} onClick={it.onClick} style={{
                  fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)",
                  color: "var(--dt-text-secondary)", textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{it.label}</a>
              )}
              {!last && <span aria-hidden="true" style={{ color: "var(--dt-text-tertiary)", fontSize: "var(--dt-text-body-sm-size)" }}>{separator}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import React from "react";

function pages(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (page >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", page - 1, page, page + 1, "…", total];
}

export function Pagination({ page = 1, totalPages = 1, onChange, label = "Pagination", style, ...rest }) {
  const btn = (on, disabled) => ({
    minWidth: 32, height: 32, padding: "0 var(--dt-space-inset-xs)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    borderRadius: "var(--dt-radius-control)",
    border: `var(--dt-border-width-default) solid ${on ? "var(--dt-border-selected)" : "var(--dt-border-default)"}`,
    background: on ? "var(--dt-surface-selected)" : "var(--dt-surface-base)",
    color: disabled ? "var(--dt-text-disabled)" : on ? "var(--dt-text-on-selected)" : "var(--dt-text-primary)",
    fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
    fontWeight: "var(--dt-font-weight-medium)", fontVariantNumeric: "tabular-nums",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background var(--dt-motion-duration-fast) var(--dt-motion-easing-standard)",
  });
  return (
    <nav aria-label={label} style={style} {...rest}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: "var(--dt-space-inline-2xs)", alignItems: "center", flexWrap: "wrap" }}>
        <li><button type="button" disabled={page <= 1} onClick={() => onChange && onChange(page - 1)} style={btn(false, page <= 1)} aria-label="Previous page">‹</button></li>
        {pages(page, totalPages).map((p, i) =>
          p === "…" ? (
            <li key={"gap" + i}><span aria-hidden="true" style={{ padding: "0 var(--dt-space-inline-2xs)", color: "var(--dt-text-tertiary)" }}>…</span></li>
          ) : (
            <li key={p}>
              <button type="button" aria-current={p === page ? "page" : undefined} aria-label={"Page " + p} onClick={() => onChange && onChange(p)} style={btn(p === page, false)}>{p}</button>
            </li>
          )
        )}
        <li><button type="button" disabled={page >= totalPages} onClick={() => onChange && onChange(page + 1)} style={btn(false, page >= totalPages)} aria-label="Next page">›</button></li>
      </ul>
    </nav>
  );
}

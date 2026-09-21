import React from "react";

export function Table({ columns = [], rows = [], caption, dense = false, zebra = false, style, ...rest }) {
  const pad = dense ? "var(--dt-space-inset-xs) var(--dt-space-inset-sm)" : "var(--dt-space-inset-sm) var(--dt-space-inset-md)";
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", ...style }} {...rest}>
      {caption && <caption style={{ captionSide: "top", textAlign: "left", padding: "0 0 var(--dt-space-stack-xs)", color: "var(--dt-text-secondary)", fontSize: "var(--dt-text-body-sm-size)" }}>{caption}</caption>}
      <thead>
        <tr>
          {columns.map(c => (
            <th key={c.key} scope="col" style={{
              textAlign: c.align || "left", padding: pad,
              fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
              fontWeight: "var(--dt-font-weight-medium)", color: "var(--dt-text-secondary)",
              borderBottom: "var(--dt-border-width-default) solid var(--dt-border-default)",
              whiteSpace: "nowrap", width: c.width,
            }}>{c.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id ?? i} style={{ background: zebra && i % 2 === 1 ? "var(--dt-surface-subtle)" : "transparent" }}>
            {columns.map(c => (
              <td key={c.key} style={{
                padding: pad, textAlign: c.align || "left", color: "var(--dt-text-primary)",
                borderBottom: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
                fontVariantNumeric: c.align === "right" ? "tabular-nums" : undefined,
              }}>{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

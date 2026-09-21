import React from "react";

const GAPS = { md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

export function Media({ media, eyebrow, title, body, actions, reverse = false, align = "center", gap = "xl", minColumnWidth = "300px", as: Tag = "section", style, ...rest }) {
  return (
    <Tag style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}), 1fr))`, gap: GAPS[gap] || GAPS.xl, alignItems: align === "center" ? "center" : "start", ...style }} {...rest}>
      <div style={{ order: reverse ? 2 : 1, minWidth: 0 }}>{media}</div>
      <div style={{ order: reverse ? 1 : 2, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)", alignItems: "flex-start" }}>
        {eyebrow && <span style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-font-size-xs)", letterSpacing: "var(--dt-tracking-wide)", textTransform: "uppercase", color: "var(--dt-text-tertiary)" }}>{eyebrow}</span>}
        {title && <h2 style={{ margin: 0, fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-2xl)", lineHeight: "var(--dt-line-height-2xl)", fontWeight: "var(--dt-font-weight-semibold)", letterSpacing: "var(--dt-tracking-tight)", color: "var(--dt-text-primary)", textWrap: "pretty" }}>{title}</h2>}
        {body && <div style={{ fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-font-size-md)", lineHeight: "var(--dt-line-height-md)", color: "var(--dt-text-secondary)", textWrap: "pretty" }}>{body}</div>}
        {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)" }}>{actions}</div>}
      </div>
    </Tag>
  );
}

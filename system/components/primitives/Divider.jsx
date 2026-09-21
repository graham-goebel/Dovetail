import React from "react";

export function Divider({ orientation = "horizontal", label, tone = "subtle", style, ...rest }) {
  const color = tone === "strong" ? "var(--dt-border-strong)" : tone === "default" ? "var(--dt-border-default)" : "var(--dt-border-subtle)";
  if (orientation === "vertical") {
    return <div role="separator" aria-orientation="vertical" style={{ width: "var(--dt-border-width-default)", alignSelf: "stretch", background: color, ...style }} {...rest} />;
  }
  if (label) {
    return (
      <div role="separator" style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-sm)", ...style }} {...rest}>
        <span style={{ height: "var(--dt-border-width-default)", background: color, flex: 1 }} />
        <span style={{ fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)", fontWeight: "var(--dt-text-label-sm-weight)", color: "var(--dt-text-tertiary)" }}>{label}</span>
        <span style={{ height: "var(--dt-border-width-default)", background: color, flex: 1 }} />
      </div>
    );
  }
  return <div role="separator" style={{ height: "var(--dt-border-width-default)", background: color, width: "100%", ...style }} {...rest} />;
}

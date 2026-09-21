import React from "react";

export function Stat({ label, value, unit, delta, deltaDirection, caption, align = "left", style, ...rest }) {
  const dc = deltaDirection === "up" ? "var(--dt-text-success)" : deltaDirection === "down" ? "var(--dt-text-danger)" : "var(--dt-text-secondary)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", textAlign: align, ...style }} {...rest}>
      <span style={{
        fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
        lineHeight: "var(--dt-text-label-sm-line)", color: "var(--dt-text-secondary)",
        fontWeight: "var(--dt-font-weight-medium)",
      }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: "var(--dt-space-inline-xs)", justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start" }}>
        <span style={{
          fontFamily: "var(--dt-text-heading-lg-family)", fontSize: "var(--dt-text-heading-lg-size)",
          lineHeight: "var(--dt-text-heading-lg-line)", fontWeight: "var(--dt-font-weight-semibold)",
          letterSpacing: "var(--dt-text-heading-lg-tracking)", color: "var(--dt-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-secondary)" }}>{unit}</span>}
        {delta && (
          <span style={{
            fontFamily: "var(--dt-text-label-sm-family)", fontSize: "var(--dt-text-label-sm-size)",
            fontWeight: "var(--dt-font-weight-medium)", color: dc, fontVariantNumeric: "tabular-nums",
          }}>{delta}</span>
        )}
      </span>
      {caption && <span style={{ fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)", lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-tertiary)" }}>{caption}</span>}
    </div>
  );
}

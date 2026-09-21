import React from "react";

export function Code({ children, block = false, label, style, ...rest }) {
  const shared = {
    fontFamily: "var(--dt-font-family-mono)",
    fontSize: "var(--dt-text-body-sm-size)",
    color: "var(--dt-text-primary)",
    background: "var(--dt-surface-sunken)",
    border: "var(--dt-border-width-default) solid var(--dt-border-subtle)",
  };
  if (!block) {
    return <code style={{ ...shared, padding: "1px var(--dt-space-inset-2xs, 4px)", borderRadius: "var(--dt-radius-control)", whiteSpace: "nowrap", ...style }} {...rest}>{children}</code>;
  }
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", ...style }} {...rest}>
      {label && <figcaption style={{ fontFamily: "var(--dt-font-family-mono)", fontSize: "var(--dt-text-body-xs-size)", color: "var(--dt-text-tertiary)" }}>{label}</figcaption>}
      <pre style={{
        ...shared, margin: 0, padding: "var(--dt-space-inset-md)", borderRadius: "var(--dt-radius-container)",
        overflowX: "auto", lineHeight: "var(--dt-line-height-relaxed, 1.6)",
      }}><code>{children}</code></pre>
    </figure>
  );
}

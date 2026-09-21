import React from "react";

const SIZES = { "2xs": "var(--dt-space-stack-2xs)", xs: "var(--dt-space-stack-xs)", sm: "var(--dt-space-stack-sm)", md: "var(--dt-space-stack-md)", lg: "var(--dt-space-stack-lg)", xl: "var(--dt-space-stack-xl)", "2xl": "var(--dt-space-stack-2xl)" };

export function Spacer({ size, axis = "vertical", style, ...rest }) {
  if (size === undefined) {
    return <div aria-hidden="true" style={{ flex: 1, ...style }} {...rest} />;
  }
  const value = SIZES[size] || SIZES.md;
  return <div aria-hidden="true" style={{ flex: "none", width: axis === "horizontal" ? value : undefined, height: axis === "vertical" ? value : undefined, ...style }} {...rest} />;
}

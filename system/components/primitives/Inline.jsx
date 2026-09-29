import React from "react";

const GAPS = { "2xs": "var(--dt-space-inline-2xs)", xs: "var(--dt-space-inline-xs)", sm: "var(--dt-space-inline-sm)", md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

/* Drawn at --dt-layout-scale, 1 on a page, so a surface at another size keeps
   its proportions. */
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;
const LAYERS = { related: scaled("--dt-layout-inline-related"), group: scaled("--dt-layout-inline-group"), block: scaled("--dt-layout-inline-block"), section: scaled("--dt-layout-inline-section") };

export function Inline({ gap = "sm", layer, spacing, align = "center", justify, wrap = true, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag data-layout={spacing} style={{ display: "flex", flexDirection: "row", gap: LAYERS[layer] || GAPS[gap] || GAPS.sm, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : "nowrap", ...style }} {...rest}>
      {children}
    </Tag>
  );
}

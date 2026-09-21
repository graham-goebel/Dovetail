import React from "react";

const GAPS = { "2xs": "var(--dt-space-inline-2xs)", xs: "var(--dt-space-inline-xs)", sm: "var(--dt-space-inline-sm)", md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

export function Inline({ gap = "sm", align = "center", justify, wrap = true, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag style={{ display: "flex", flexDirection: "row", gap: GAPS[gap] || GAPS.sm, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : "nowrap", ...style }} {...rest}>
      {children}
    </Tag>
  );
}

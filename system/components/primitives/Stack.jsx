import React from "react";

const GAPS = { "2xs": "var(--dt-space-stack-2xs)", xs: "var(--dt-space-stack-xs)", sm: "var(--dt-space-stack-sm)", md: "var(--dt-space-stack-md)", lg: "var(--dt-space-stack-lg)", xl: "var(--dt-space-stack-xl)", "2xl": "var(--dt-space-stack-2xl)" };

const LAYERS = { related: "var(--dt-layout-stack-related)", group: "var(--dt-layout-stack-group)", block: "var(--dt-layout-stack-block)", section: "var(--dt-layout-stack-section)" };

export function Stack({ gap = "md", layer, spacing, align, justify, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag data-layout={spacing} style={{ display: "flex", flexDirection: "column", gap: LAYERS[layer] || GAPS[gap] || GAPS.md, alignItems: align, justifyContent: justify, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

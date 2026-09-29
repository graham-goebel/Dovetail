import React from "react";

const GAPS = { "2xs": "var(--dt-space-stack-2xs)", xs: "var(--dt-space-stack-xs)", sm: "var(--dt-space-stack-sm)", md: "var(--dt-space-stack-md)", lg: "var(--dt-space-stack-lg)", xl: "var(--dt-space-stack-xl)", "2xl": "var(--dt-space-stack-2xl)" };

/* Each layer is drawn at --dt-layout-scale, 1 on a page, so a surface at
   another size (a social artboard) keeps its proportions. */
const scaled = (token) => `calc(var(${token}) * var(--dt-layout-scale, 1))`;
const LAYERS = {
  related: scaled("--dt-layout-stack-related"), group: scaled("--dt-layout-stack-group"), block: scaled("--dt-layout-stack-block"), section: scaled("--dt-layout-stack-section"),
  eyebrow: scaled("--dt-layout-text-eyebrow"), subcopy: scaled("--dt-layout-text-subcopy"), paragraph: scaled("--dt-layout-text-paragraph"),
};

export function Stack({ gap = "md", layer, spacing, align, justify, as: Tag = "div", children, style, ...rest }) {
  return (
    <Tag data-layout={spacing} style={{ display: "flex", flexDirection: "column", gap: LAYERS[layer] || GAPS[gap] || GAPS.md, alignItems: align, justifyContent: justify, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

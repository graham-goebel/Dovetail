import React from "react";

const GAPS = { xs: "var(--dt-space-inline-xs)", sm: "var(--dt-space-inline-sm)", md: "var(--dt-space-inline-md)", lg: "var(--dt-space-inline-lg)", xl: "var(--dt-space-inline-xl)", "2xl": "var(--dt-space-inline-2xl)" };

export function Grid({ columns = 2, gap = "md", minColumnWidth, align, as: Tag = "div", children, style, ...rest }) {
  const template = minColumnWidth
    ? `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`
    : `repeat(${columns}, minmax(0, 1fr))`;
  return (
    <Tag style={{ display: "grid", gridTemplateColumns: template, gap: GAPS[gap] || GAPS.md, alignItems: align, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

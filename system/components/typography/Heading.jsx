import React from "react";

const DEFAULT_SIZE = { 1: "heading-xl", 2: "heading-lg", 3: "heading-md", 4: "heading-sm", 5: "heading-xs", 6: "heading-xs" };
const SIZES = ["display-lg", "display-md", "display-sm", "heading-xl", "heading-lg", "heading-md", "heading-sm", "heading-xs"];
const TONES = { inherit: "inherit", primary: "var(--dt-text-primary)", secondary: "var(--dt-text-secondary)" };
const MEASURES = { narrow: "var(--dt-measure-narrow)", default: "var(--dt-measure-default)", wide: "var(--dt-measure-wide)", none: "none" };

export function Heading({ level = 2, size, tone = "inherit", align, measure = "none", balance = true, children, style, ...rest }) {
  const lvl = Math.min(6, Math.max(1, Number(level) || 2));
  const Tag = "h" + lvl;
  const role = SIZES.indexOf(size) !== -1 ? size : DEFAULT_SIZE[lvl];
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: `var(--dt-text-${role}-family)`,
        fontSize: `var(--dt-text-${role}-size)`,
        lineHeight: `var(--dt-text-${role}-line)`,
        fontWeight: `var(--dt-text-${role}-weight)`,
        letterSpacing: `var(--dt-text-${role}-tracking)`,
        color: TONES[tone] || TONES.inherit,
        textAlign: align,
        maxWidth: MEASURES[measure] || MEASURES.none,
        textWrap: balance ? "balance" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

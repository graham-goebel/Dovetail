import React from "react";

const VARIANTS = {
  eyebrow: { role: "eyebrow", tag: "span", tone: "secondary", measure: "none", upper: true },
  lead: { role: "body-lg", tag: "p", tone: "secondary", measure: "default" },
  body: { role: "body-md", tag: "p", tone: "inherit", measure: "default" },
  small: { role: "body-sm", tag: "p", tone: "inherit", measure: "default" },
  fine: { role: "body-xs", tag: "p", tone: "tertiary", measure: "default" },
  label: { role: "label-md", tag: "span", tone: "inherit", measure: "none" },
};
const TONES = {
  inherit: "inherit",
  primary: "var(--dt-text-primary)",
  secondary: "var(--dt-text-secondary)",
  tertiary: "var(--dt-text-tertiary)",
  link: "var(--dt-text-link)",
  brand: "var(--dt-text-brand, var(--dt-text-link))",
  "brand-secondary": "var(--dt-text-brand-secondary, var(--dt-color-secondary-700, var(--dt-text-link)))",
};
const MEASURES = { narrow: "var(--dt-measure-narrow)", default: "var(--dt-measure-default)", wide: "var(--dt-measure-wide)", none: "none" };
const WEIGHTS = { regular: "var(--dt-font-weight-regular)", medium: "var(--dt-font-weight-medium)", semibold: "var(--dt-font-weight-semibold)" };

export function Text({ variant = "body", tone, measure, weight, align, numeric = false, as, children, style, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.body;
  const Tag = as || v.tag;
  const role = v.role;
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: `var(--dt-text-${role}-family)`,
        fontSize: `var(--dt-text-${role}-size)`,
        lineHeight: `var(--dt-text-${role}-line)`,
        fontWeight: WEIGHTS[weight] || `var(--dt-text-${role}-weight)`,
        letterSpacing: `var(--dt-text-${role}-tracking)`,
        textTransform: v.upper ? "uppercase" : undefined,
        color: TONES[tone || v.tone] || TONES.inherit,
        maxWidth: MEASURES[measure || v.measure] || MEASURES.none,
        textAlign: align,
        textWrap: v.tag === "p" ? "pretty" : undefined,
        fontVariantNumeric: numeric ? "tabular-nums" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

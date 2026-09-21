import React from "react";

export function Prose({ children, size = "md", measure = "68ch", style, ...rest }) {
  const body = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";
  return (
    <div
      className="dt-prose"
      style={{
        maxWidth: measure,
        fontFamily: `var(--dt-text-body-${body}-family)`,
        fontSize: `var(--dt-text-body-${body}-size)`,
        lineHeight: `var(--dt-text-body-${body}-line)`,
        color: "var(--dt-text-primary)",
        textWrap: "pretty",
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

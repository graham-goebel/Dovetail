import React from "react";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { Inline } from "../primitives/Inline.jsx";

/* The eyebrow, title and lead every block opens with, so a page of blocks
   keeps one rhythm. Centred for a section that introduces a grid; start for
   one that sits beside media. */
export function BlockHeader({ eyebrow, title, lead, actions, align = "start", level = 2, size = "heading-lg", style, ...rest }) {
  const centred = align === "center";
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-sm)",
        alignItems: centred ? "center" : "flex-start", textAlign: centred ? "center" : "left",
        marginInline: centred ? "auto" : undefined,
        ...style,
      }}
      {...rest}
    >
      {eyebrow && <Text variant="eyebrow" tone="tertiary">{eyebrow}</Text>}
      {title && <Heading level={level} size={size} align={centred ? "center" : "left"} measure={centred ? "default" : "wide"} balance>{title}</Heading>}
      {lead && <Text variant="lead" tone="secondary" align={centred ? "center" : "left"} measure="default">{lead}</Text>}
      {actions && <div style={{ marginTop: "var(--dt-space-stack-xs)" }}><Inline gap="sm" wrap justify={centred ? "center" : "flex-start"}>{actions}</Inline></div>}
    </div>
  );
}

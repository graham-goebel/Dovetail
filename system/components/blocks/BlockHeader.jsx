import React from "react";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { Inline } from "../primitives/Inline.jsx";
import { Stack } from "../primitives/Stack.jsx";

/* The eyebrow, title and lead every block opens with, so a page of blocks
   keeps one rhythm. Centred for a section that introduces a grid; start for
   one that sits beside media. */
export function BlockHeader({ eyebrow, title, lead, actions, align = "start", level = 2, size = "heading-lg", style, ...rest }) {
  const centred = align === "center";
  const items = centred ? "center" : "flex-start";
  /* The gaps are the text layers of the layout: an eyebrow binds to the
     heading it introduces (eyebrow), and the lead follows the pair (subcopy),
     so Configure's Text control moves them apart from the rest. */
  return (
    <Stack
      layer="subcopy"
      align={items}
      style={{ textAlign: centred ? "center" : "left", marginInline: centred ? "auto" : undefined, ...style }}
      {...rest}
    >
      {(eyebrow || title) && (
        <Stack layer="eyebrow" align={items}>
          {eyebrow && <Text variant="eyebrow" tone="tertiary">{eyebrow}</Text>}
          {title && <Heading level={level} size={size} align={centred ? "center" : "left"} measure={centred ? "default" : "wide"} balance>{title}</Heading>}
        </Stack>
      )}
      {lead && <Text variant="lead" tone="secondary" align={centred ? "center" : "left"} measure="default">{lead}</Text>}
      {actions && <div style={{ marginTop: "var(--dt-space-stack-xs)" }}><Inline gap="sm" wrap justify={centred ? "center" : "flex-start"}>{actions}</Inline></div>}
    </Stack>
  );
}

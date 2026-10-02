import React from "react";
import { Section } from "../primitives/Section.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The close of a page: one ask and its buttons, on the brand fill by default.
   With media (an illustration, a product shot) the copy sits beside it. */
export function CtaBlock({ eyebrow, title, titleSize = "heading-lg", lead, actions, media, tone = "brand", dark, texture, spacing = "default", width = "default", ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      {media ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "center" }}>
          <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} />
          <div style={{ minWidth: 0, display: "flex", justifyContent: "center" }}>{media}</div>
        </div>
      ) : (
        <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} actions={actions} align="center" />
      )}
    </Section>
  );
}

import React from "react";
import { Section } from "../primitives/Section.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The top of a page. Split puts the copy beside a picture and stacks them on
   a phone; centred puts the copy over the picture; a background image turns
   the whole block into a photo band with the copy on a scrim. */
export function HeroBlock({ eyebrow, title, lead, actions, media, background, layout = "split", tone = "base", dark, texture, spacing = "default", width = "default", children, ...rest }) {
  const header = <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} level={1} size="display-sm" align={layout === "centered" || background ? (layout === "centered" ? "center" : "start") : "start"} />;
  if (background) {
    return (
      <Section media={background} align={layout === "centered" ? "center" : "bottom"} dark={dark} spacing={spacing} width={width} {...rest}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)", alignItems: layout === "centered" ? "center" : "flex-start" }}>
          {header}
          {children}
        </div>
      </Section>
    );
  }
  if (layout === "centered") {
    return (
      <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--dt-layout-module-gap)" }}>
          {header}
          {children}
          {media && <div style={{ width: "100%" }}>{media}</div>}
        </div>
      </Section>
    );
  }
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-lg)" }}>
          {header}
          {children}
        </div>
        {media && <div style={{ minWidth: 0 }}>{media}</div>}
      </div>
    </Section>
  );
}

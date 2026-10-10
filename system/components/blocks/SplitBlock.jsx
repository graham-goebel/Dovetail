import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", flex: "none", marginTop: 3, color: "var(--dt-text-brand)" }}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* Copy beside media: a picture, a video, a product shot, a live component.
   The two sit side by side on a wide screen and stack on a phone, the media
   first unless reverse puts the copy first. Points become a checked list. */
export function SplitBlock({ eyebrow, title, titleSize = "heading-lg", body, points, actions, media, reverse = false, align = "center", tone = "base", dark, texture, spacing = "default", width = "default", children, ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: align === "top" ? "start" : "center" }}>
        {media && <div style={{ minWidth: 0, order: reverse ? 2 : 1 }}>{media}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-md)", minWidth: 0, order: reverse ? 1 : 2 }}>
          <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={body} />
          {points && points.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)" }}>
              {points.map((p) => (
                <li key={typeof p === "string" ? p : undefined} style={{ display: "flex", gap: "var(--dt-space-inline-sm)", alignItems: "flex-start" }}>
                  {CHECK}<Text as="span" style={{ flex: "1 1 0%", minWidth: 0 }}>{p}</Text>
                </li>
              ))}
            </ul>
          )}
          {children}
          {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--dt-space-inline-sm)" }}>{actions}</div>}
        </div>
      </div>
    </Section>
  );
}

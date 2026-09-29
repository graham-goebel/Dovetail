import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Heading } from "../typography/Heading.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* The narrowest a column may get before the grid drops a column, per count:
   more columns ask for less room each, and a phone always ends up with one. */
const MIN = { 2: "360px", 3: "260px", 4: "200px" };

/* A header over a grid of features: an icon on a brand tint, a title and a
   sentence each. Cards puts each on a raised surface; plain leaves the band's
   own background. */
export function FeatureGridBlock({ eyebrow, title, lead, actions, items = [], columns = 3, align = "center", variant = "plain", tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const card = variant === "cards";
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} align={align} />}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MIN[columns] || MIN[3]}), 1fr))`, gap: "var(--dt-space-inline-lg)" }}>
          {items.map((it, i) => (
            <div key={it.title || i} style={{
              display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xs)",
              padding: card ? "var(--dt-card-padding)" : 0,
              background: card ? "var(--dt-card-bg)" : undefined,
              border: card ? "var(--dt-card-border-width) solid var(--dt-card-border-color)" : undefined,
              borderRadius: card ? "var(--dt-card-radius)" : undefined,
              color: card ? "var(--dt-card-fg)" : undefined,
            }}>
              {it.icon && (
                <span aria-hidden="true" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start",
                  width: "var(--dt-size-control-md)", height: "var(--dt-size-control-md)", marginBottom: "var(--dt-space-stack-xs)",
                  borderRadius: "var(--dt-radius-control)", background: "var(--dt-surface-brand-muted)", color: "var(--dt-text-on-brand-muted)",
                }}>{it.icon}</span>
              )}
              <Heading level={3} size="heading-sm">{it.title}</Heading>
              {it.description && <Text variant="small" tone="secondary">{it.description}</Text>}
              {it.href && <a href={it.href} style={{ marginTop: "var(--dt-space-stack-2xs)", color: "var(--dt-text-link)", fontSize: "var(--dt-text-body-sm-size)", textUnderlineOffset: 3 }}>{it.linkLabel || "Learn more"}</a>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

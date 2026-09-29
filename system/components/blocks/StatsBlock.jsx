import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Text } from "../typography/Text.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* A few numbers that make the case, set large, each over a hairline. */
export function StatsBlock({ eyebrow, title, lead, stats = [], align = "start", tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-xl)" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} lead={lead} align={align} />}
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "var(--dt-space-inline-lg)" }}>
          {stats.map((s, i) => (
            <div key={s.label || i} style={{ display: "flex", flexDirection: "column-reverse", gap: "var(--dt-space-stack-2xs)", paddingTop: "var(--dt-space-stack-sm)", borderTop: "var(--dt-border-width-default) solid var(--dt-border-subtle)" }}>
              <dt style={{ margin: 0 }}>
                <Text as="span" variant="label">{s.label}</Text>
                {s.caption && <Text as="span" variant="small" tone="tertiary" style={{ display: "block" }}>{s.caption}</Text>}
              </dt>
              <dd style={{
                margin: 0, fontFamily: "var(--dt-text-display-sm-family)", fontSize: "var(--dt-text-display-sm-size)",
                lineHeight: "var(--dt-text-display-sm-line)", fontWeight: "var(--dt-text-display-sm-weight)",
                letterSpacing: "var(--dt-text-display-sm-tracking)", fontVariantNumeric: "tabular-nums", color: "var(--dt-text-headline, var(--dt-text-primary))",
              }}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}

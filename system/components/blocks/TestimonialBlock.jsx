import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Quote } from "../content/Quote.jsx";
import { Avatar } from "../display/Avatar.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* What customers say. One quote is set large and centred; several sit in a
   grid on raised surfaces. */
export function TestimonialBlock({ eyebrow, title, titleSize = "heading-lg", lead, quotes = [], tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const one = quotes.length === 1;
  const quote = (q, size) => (
    <Quote size={size} attribution={q.name} role={q.role} avatar={q.avatar || (q.name ? <Avatar name={q.name} /> : undefined)}>{q.quote}</Quote>
  );
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={one ? "narrow" : width} {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)", alignItems: one ? "center" : "stretch" }}>
        {(eyebrow || title || lead) && <BlockHeader eyebrow={eyebrow} title={title} size={titleSize} lead={lead} align="center" />}
        {one ? quote(quotes[0], "lg") : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "var(--dt-space-inline-lg)" }}>
            {quotes.map((q, i) => (
              <div key={q.name || i} style={{ padding: "var(--dt-card-padding)", background: "var(--dt-card-bg)", color: "var(--dt-card-fg)", border: "var(--dt-card-border-width) solid var(--dt-card-border-color)", borderRadius: "var(--dt-card-radius)" }}>
                {quote(q, "md")}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

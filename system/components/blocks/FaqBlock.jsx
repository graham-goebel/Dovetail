import React from "react";
import { Section } from "../primitives/Section.jsx";
import { Accordion } from "../content/Accordion.jsx";
import { BlockHeader } from "./BlockHeader.jsx";

/* Questions before someone commits. Split puts the header beside the
   answers on a wide screen; stacked centres the header over them. */
export function FaqBlock({ eyebrow, title, lead, actions, items = [], layout = "split", defaultOpen, tone = "base", dark, texture, spacing = "default", width = "default", ...rest }) {
  const list = (
    <Accordion
      label={typeof title === "string" ? title : "Questions"}
      defaultOpen={defaultOpen}
      items={items.map((q, i) => ({ id: q.id || String(i), title: q.question, content: q.answer }))}
    />
  );
  const header = <BlockHeader eyebrow={eyebrow} title={title} lead={lead} actions={actions} align={layout === "split" ? "start" : "center"} />;
  return (
    <Section tone={tone} dark={dark} texture={texture} spacing={spacing} width={width} {...rest}>
      {layout === "split" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--dt-space-inline-2xl)", alignItems: "start" }}>
          {header}
          <div style={{ minWidth: 0 }}>{list}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-module-gap)", maxWidth: "var(--dt-size-container-narrow)", marginInline: "auto" }}>
          {header}
          {list}
        </div>
      )}
    </Section>
  );
}

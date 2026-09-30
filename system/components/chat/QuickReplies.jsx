import React from "react";
import { Button } from "../actions/Button.jsx";

/* Suggested answers, one tap each: a row of chip buttons that wraps onto as
   many lines as it needs, so every option stays visible on a phone and Tab
   reaches them in reading order. Choosing one is the app's to handle,
   usually by sending the label as the person's message. */

const ALIGN = { start: "flex-start", end: "flex-end" };

export function QuickReplies({ options = [], onSelect, label, align = "end", style, ...rest }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: "flex", flexWrap: "wrap", gap: "var(--dt-quick-replies-gap)",
        justifyContent: ALIGN[align] || ALIGN.end,
        marginTop: "var(--dt-bubble-run-gap)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {options.map((o) => (
        <Button
          key={o.id}
          type="button"
          variant="ghost"
          size="md"
          onClick={() => onSelect(o.id)}
          style={{
            /* A long suggestion wraps inside its chip rather than running off
               a phone screen. */
            maxWidth: "100%", height: "auto", minHeight: "var(--dt-button-height-md)",
            border: "var(--dt-button-border-width) solid var(--dt-quick-replies-border)",
            padding: "var(--dt-space-inset-2xs) var(--dt-button-padding-md)",
            whiteSpace: "normal", textAlign: "center", lineHeight: "var(--dt-text-label-md-line)",
          }}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

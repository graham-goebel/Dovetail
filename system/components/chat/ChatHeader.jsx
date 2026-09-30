import React from "react";
import { Avatar } from "../display/Avatar.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { VisuallyHidden } from "../primitives/VisuallyHidden.jsx";

/* The bar above a conversation: who it is with, whether they are there, and
   a way back. Presence is a prop; nothing here polls for it. */

const PRESENCE = {
  online: { color: "var(--dt-presence-online)", text: "Online" },
  away: { color: "var(--dt-presence-away)", text: "Away" },
  offline: { color: "var(--dt-presence-offline)", text: "Offline" },
};

const BACK = ["M19.5 12h-15", "m10.5 6-6 6 6 6"];

function Glyph({ paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)", display: "block" }}>
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

export function ChatHeader({ title, subtitle, avatar, presence, onBack, actions, headingLevel = 2, style, ...rest }) {
  const state = PRESENCE[presence];
  const Heading = `h${Math.min(6, Math.max(1, headingLevel))}`;
  return (
    <header
      style={{
        display: "flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
        padding: "var(--dt-space-inset-xs) var(--dt-space-inset-sm)",
        background: "var(--dt-chat-surface)", color: "var(--dt-text-primary)",
        borderBottom: "var(--dt-border-width-default) solid var(--dt-chat-border)",
        minWidth: 0,
        ...style,
      }}
      {...rest}
    >
      {onBack && (
        <IconButton label="Back" onClick={onBack} style={{ flex: "none" }}>
          <Glyph paths={BACK} />
        </IconButton>
      )}
      {avatar && (
        <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", flex: "none" }}>
          <Avatar name={avatar.name} src={avatar.src} size="md" />
          {state && (
            <span style={{
              position: "absolute", right: 0, bottom: 0,
              width: "var(--dt-presence-size)", height: "var(--dt-presence-size)",
              borderRadius: "var(--dt-radius-pill)", background: state.color,
              border: "var(--dt-border-width-strong) solid var(--dt-chat-surface)",
            }} />
          )}
        </span>
      )}
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Heading style={{
          margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "var(--dt-text-label-lg-family)", fontSize: "var(--dt-text-label-lg-size)",
          lineHeight: "var(--dt-text-label-lg-line)", fontWeight: "var(--dt-font-weight-semibold)",
          color: "var(--dt-text-primary)",
        }}>
          {title}
        </Heading>
        {(subtitle || state) && (
          <p style={{
            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "var(--dt-text-body-xs-family)", fontSize: "var(--dt-text-body-xs-size)",
            lineHeight: "var(--dt-text-body-xs-line)", color: "var(--dt-text-secondary)",
          }}>
            {state && (subtitle ? <VisuallyHidden>{state.text}. </VisuallyHidden> : state.text)}
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-space-inline-2xs)", flex: "none" }}>
          {actions}
        </div>
      )}
    </header>
  );
}

import React from "react";
import { AmbientBorder } from "./AmbientBorder.jsx";
import { IconButton } from "../actions/IconButton.jsx";
import { useModalFocus } from "../feedback/Dialog.jsx";

/* The same words, glyphs and text roles as VoiceInput, kept here so neither
   file has to export its helpers. */
const VOICE_LABELS = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking", error: "Didn't catch that" };
const MIC = ["M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z", "M19 11a7 7 0 0 1-14 0", "M12 18v3"];
const STOP = ["M8 8h8v8H8z"];
const CLOSE = ["M6 6l12 12", "M18 6 6 18"];

function voiceType(role) {
  return { fontFamily: `var(--dt-text-${role}-family)`, fontSize: `var(--dt-text-${role}-size)`, lineHeight: `var(--dt-text-${role}-line)`, fontWeight: `var(--dt-text-${role}-weight)`, letterSpacing: `var(--dt-text-${role}-tracking)` };
}

function VoiceGlyph({ paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-lg)", height: "var(--dt-size-icon-lg)", display: "block" }}>
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/* A voice conversation over the whole screen: the ambient border runs round
   the screen's edge and glows inward, the exchange is set large in the
   middle, and the microphone and End sit at the foot within thumb's reach.
   Controlled, like VoiceInput: the app owns the microphone and the reply.
   It is modal, as Dialog is: focus moves in, Tab stays inside, Escape ends
   the conversation, the page behind stops scrolling, and focus goes back
   where it came from. It is scoped dark by default, so it reads the same
   over any page. */

export function VoiceOverlay({
  open,
  onClose,
  state = "idle",
  level,
  inputStream,
  outputStream,
  transcript,
  response,
  placeholder = "Go ahead, I'm listening",
  assistantName = "Assistant",
  label = "Voice conversation",
  closeLabel = "End conversation",
  onToggle,
  dark = true,
  children,
  style,
  ...rest
}) {
  const panel = React.useRef(null);
  useModalFocus(open, panel, onClose);
  if (!open) return null;

  const listening = state === "listening";
  const status = VOICE_LABELS[state] || VOICE_LABELS.idle;
  const said = listening ? transcript : response || transcript;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={dark ? "dark" : undefined}
      style={{ position: "fixed", inset: 0, zIndex: "var(--dt-z-overlay)", background: "var(--dt-voice-overlay-bg)", color: "var(--dt-text-primary)", outline: "none", ...style }}
      {...rest}
    >
      <AmbientBorder
        state={state}
        level={level}
        inputStream={inputStream}
        outputStream={outputStream}
        radius="overlay"
        thickness="thick"
        surface="none"
        style={{ position: "absolute", inset: "var(--dt-space-inset-2xs)" }}
        contentStyle={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: "var(--dt-layout-stack-block)", padding: "var(--dt-layout-page-gutter)", textAlign: "center" }}
      >
        <span role="status" aria-live="polite" style={{ ...voiceType("eyebrow"), color: "var(--dt-voice-label-fg)", textTransform: "uppercase", paddingTop: "var(--dt-layout-stack-group)" }}>
          {status}
        </span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--dt-layout-text-subcopy)", maxWidth: "var(--dt-layout-page-width-narrow)", width: "100%" }}>
          {children}
          <p style={{ ...voiceType("heading-lg"), margin: 0, color: said ? "var(--dt-text-primary)" : "var(--dt-voice-placeholder-fg)", overflowWrap: "anywhere" }}>
            {said || placeholder}
          </p>
          {!listening && response && transcript && (
            <p style={{ ...voiceType("body-md"), margin: 0, color: "var(--dt-text-secondary)" }}>
              <span style={{ color: "var(--dt-text-tertiary)" }}>You: </span>{transcript}
            </p>
          )}
          {listening && response && (
            <p style={{ ...voiceType("body-md"), margin: 0, color: "var(--dt-text-tertiary)" }}>{assistantName}: {response}</p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--dt-layout-inline-block)", paddingBottom: "var(--dt-layout-stack-group)" }}>
          <IconButton label={listening ? "Stop listening" : "Speak"} aria-pressed={listening} variant={listening ? "solid" : "ghost"} size="lg" onClick={onToggle}>
            <VoiceGlyph paths={listening ? STOP : MIC} />
          </IconButton>
          <IconButton label={closeLabel} size="lg" onClick={onClose}>
            <VoiceGlyph paths={CLOSE} />
          </IconButton>
        </div>
      </AmbientBorder>
    </div>
  );
}

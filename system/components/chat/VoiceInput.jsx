import React from "react";
import { AmbientBorder } from "./AmbientBorder.jsx";
import { IconButton } from "../actions/IconButton.jsx";

/* Voice input for a conversation, at the size of a module: a bar that sits
   where a composer would, or a panel that holds the exchange. Controlled: the
   app owns the microphone, the recognition and the reply, and says which
   state the conversation is in; the component draws it, with an ambient
   border that turns in the person's colour while they speak and the
   assistant's while it answers, and follows the voice's level. */

/* A semantic text role, whole: family, size, line, weight and tracking. */
function voiceType(role) {
  return { fontFamily: `var(--dt-text-${role}-family)`, fontSize: `var(--dt-text-${role}-size)`, lineHeight: `var(--dt-text-${role}-line)`, fontWeight: `var(--dt-text-${role}-weight)`, letterSpacing: `var(--dt-text-${role}-tracking)` };
}

const VOICE_LABELS = { idle: "Ready", listening: "Listening", thinking: "Thinking", speaking: "Speaking", error: "Didn't catch that" };

const MIC = ["M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z", "M19 11a7 7 0 0 1-14 0", "M12 18v3"];
const STOP = ["M8 8h8v8H8z"];
const CLOSE = ["M6 6l12 12", "M18 6 6 18"];

function VoiceGlyph({ paths }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)", display: "block" }}>
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/* The words on screen: what the person is saying while they speak, the
   assistant's reply while it answers, the last thing said otherwise. */
function linesFor(state, transcript, response) {
  return { you: transcript, them: state === "listening" ? "" : response };
}

export function VoiceInput({
  state = "idle",
  tone = "brand",
  level,
  inputStream,
  outputStream,
  transcript,
  response,
  placeholder = "Press the microphone and speak",
  assistantName = "Assistant",
  layout = "bar",
  label = "Voice input",
  onToggle,
  onEnd,
  disabled = false,
  style,
  ...rest
}) {
  const listening = state === "listening";
  const active = state !== "idle";
  const status = VOICE_LABELS[state] || VOICE_LABELS.idle;
  const { you, them } = linesFor(state, transcript, response);
  const mic = (
    <IconButton
      label={listening ? "Stop listening" : "Speak"}
      aria-pressed={listening}
      variant={listening ? "solid" : "ghost"}
      size={layout === "panel" ? "lg" : "md"}
      disabled={disabled}
      onClick={onToggle}
    >
      <VoiceGlyph paths={listening ? STOP : MIC} />
    </IconButton>
  );
  const end = onEnd && active ? (
    <IconButton label="End voice" size="sm" disabled={disabled} onClick={onEnd}><VoiceGlyph paths={CLOSE} /></IconButton>
  ) : null;
  const statusText = (
    <span role="status" aria-live="polite" style={{ ...voiceType("eyebrow"), color: "var(--dt-voice-label-fg)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {status}
    </span>
  );

  if (layout === "panel") {
    return (
      <AmbientBorder state={state} tone={tone} level={level} inputStream={inputStream} outputStream={outputStream} radius="container" role="group" aria-label={label} style={style} {...rest}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-stack-group)", padding: "var(--dt-voice-panel-padding)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-voice-gap)", minHeight: "var(--dt-size-control-sm)" }}>
            <span style={{ flex: 1 }}>{statusText}</span>
            {end}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-layout-stack-related)", minHeight: "calc(var(--dt-size-control-lg) * 2)" }}>
            {you || them ? (
              <>
                {you && <p style={{ ...voiceType("body-sm"), margin: 0, color: "var(--dt-text-secondary)" }}><span style={{ color: "var(--dt-text-tertiary)" }}>You: </span>{you}</p>}
                {them && <p style={{ ...voiceType("body-lg"), margin: 0, color: "var(--dt-text-primary)" }}><span style={{ ...voiceType("body-sm"), color: "var(--dt-text-tertiary)" }}>{assistantName}: </span>{them}</p>}
              </>
            ) : (
              <p style={{ ...voiceType("body-lg"), margin: 0, color: "var(--dt-voice-placeholder-fg)" }}>{placeholder}</p>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>{mic}</div>
        </div>
      </AmbientBorder>
    );
  }

  const line = listening ? you : them || you;
  return (
    <AmbientBorder state={state} tone={tone} level={level} inputStream={inputStream} outputStream={outputStream} radius="pill" role="group" aria-label={label} style={style} {...rest}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--dt-voice-gap)", padding: "var(--dt-voice-padding)", minHeight: "var(--dt-size-control-lg)", boxSizing: "border-box" }}>
        {mic}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...voiceType("body-sm"), color: line ? "var(--dt-text-primary)" : "var(--dt-voice-placeholder-fg)" }}>
          {line || placeholder}
        </span>
        {active && statusText}
        {end}
      </div>
    </AmbientBorder>
  );
}

# VoiceInput

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [VoiceInput.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceInput.jsx), [VoiceInput.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceInput.d.ts), [VoiceInput.md](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceInput.md).

Live page: https://graham-goebel.github.io/Dovetail/components/VoiceInput.html

## Guidelines

Voice input for a conversation, sized to sit in a page. It comes as a bar that takes the place of a composer, or as a panel that holds the exchange. An ambient border turns around it in the brand colour while the person speaks and in the secondary colour while the assistant answers, and its glow follows their voices.

### Use it when
- People can talk to an assistant inside a page or a chat panel, without leaving what they're doing.
- Voice sits beside typing. Swap the `Composer` for the bar while the person is speaking.

### Don't use it when
- The conversation should take over the screen, for example a hands-free mode or a call on a phone. Use `VoiceOverlay`.
- You only need a microphone button that dictates into a field. Use an `IconButton` in the field.
- It's a recording or an audio player. VoiceInput shows a conversation, not a recording.

### Example
```jsx
const [state, setState] = useState("idle");

<VoiceInput
  layout="panel"
  state={state}
  inputStream={micStream}
  outputStream={replyStream}
  transcript={partialTranscript}
  response={reply}
  assistantName="Kiln & Co"
  onToggle={() => (state === "listening" ? stopListening() : startListening())}
  onEnd={endConversation}
/>
```

### Behaviour
- **Controlled.** Your app owns the microphone, the speech recognition and the reply. It tells the component which `state` the conversation is in: `idle`, `listening`, `thinking`, `speaking` or `error`. The component draws that state and never changes it itself.
- **The microphone** calls `onToggle`. While listening it's a solid stop button named "Stop listening" and marked `aria-pressed`. Otherwise it's a microphone named "Speak".
- **End** appears when you pass `onEnd` and the conversation isn't idle.
- **Words.** `transcript` is what the person is saying, live or final. `response` is the assistant's reply. While listening, only the transcript shows. Otherwise the panel shows both lines, labelled "You" and `assistantName`, and the bar shows the reply.
- **Level.** As for `AmbientBorder`: a `level` prop first, otherwise `inputStream` while listening and `outputStream` while speaking, otherwise a built-in rhythm.

### Layouts
- `bar`: a pill one control high, with the microphone, one line of words and the status. Put it where the composer goes.
- `panel`: a card with the status and End at the top, the exchange in the middle and a large microphone at the foot. Use it in a sidebar, a help panel or an empty chat.

### Tokens
- Layout: `--dt-voice-gap`, `--dt-voice-padding`, `--dt-voice-panel-padding`.
- Words: `--dt-voice-label-fg` for the status, `--dt-voice-placeholder-fg` for the placeholder. Text uses the `eyebrow`, `body-sm` and `body-lg` roles.
- The border reads every `AmbientBorder` token, and the buttons read `--dt-button-*`.

### Accessibility
- The whole input is a group named by `label` ("Voice input").
- The status ("Listening", "Thinking", "Speaking", "Didn't catch that") is a polite live region, so a change of state is announced without moving focus.
- The microphone is a toggle button with `aria-pressed` and a name that says what it will do.
- Never let voice be the only way in. Keep a `Composer` within reach.
- Under `prefers-reduced-motion` the border stands still. The status still names the state.

### Content
- `placeholder` says how to start: "Press the microphone and speak".
- `assistantName` is the name people know the assistant by, kept short.
- On `error`, show what to try next in `response`: "I didn't catch that. Try again?"

## Props

```ts
import * as React from "react";
import type { VoiceState } from "./AmbientBorder";

/**
 * Voice input for a conversation, at the size of a module: a bar where a
 * composer would sit, or a panel that holds the exchange. Controlled: the app
 * owns the microphone, the recognition and the reply, and passes the state.
 * An ambient border turns in the person's colour while they speak and the
 * assistant's while it answers, following the voice's level.
 */
export interface VoiceInputProps extends React.HTMLAttributes<HTMLElement> {
  /** Where the conversation is: idle, listening, thinking, speaking or error. @default "idle" */
  state?: VoiceState;
  /** The voice's loudness, 0 to 1, from your own meter. Wins over the streams. */
  level?: number;
  /** The person's microphone, read while listening. */
  inputStream?: MediaStream | null;
  /** The assistant's voice, read while speaking. */
  outputStream?: MediaStream | null;
  /** What the person is saying, or said last. */
  transcript?: string;
  /** The assistant's reply, shown while it thinks and speaks. */
  response?: string;
  /** Shown when nothing has been said yet. @default "Press the microphone and speak" */
  placeholder?: string;
  /** Who replies, before their words in the panel. @default "Assistant" */
  assistantName?: string;
  /** bar: one line, pill-shaped, where a composer sits. panel: the exchange in a card, with a large microphone. @default "bar" */
  layout?: "bar" | "panel";
  /** The group's accessible name. @default "Voice input" */
  label?: string;
  /** The microphone button: start listening, or stop. Its pressed state follows listening. */
  onToggle?: () => void;
  /** Shows an End button while the conversation isn't idle. */
  onEnd?: () => void;
  /** Turns the buttons off. @default false */
  disabled?: boolean;
}

export declare function VoiceInput(props: VoiceInputProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-voice-gap` | component | `var(--dt-space-inline-sm)` |
| `--dt-voice-label-fg` | component | `var(--dt-text-secondary)` |
| `--dt-voice-padding` | component | `var(--dt-space-inset-xs)` |
| `--dt-voice-panel-padding` | component | `var(--dt-space-inset-lg)` |
| `--dt-voice-placeholder-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-layout-stack-group` | semantic | `var(--dt-dim-4)` |
| `--dt-layout-stack-related` | semantic | `var(--dt-dim-2)` |
| `--dt-size-control-lg` | semantic | `var(--dt-dim-12)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-text-artboard-body-line` | semantic | `calc(var(--dt-line-height-md) * 2.35)` |
| `--dt-text-artboard-body-size` | semantic | `calc(var(--dt-font-size-md) * 2.5)` |
| `--dt-text-artboard-display-family` | semantic | `var(--dt-text-display-lg-family)` |
| `--dt-text-artboard-display-line` | semantic | `calc(var(--dt-line-height-7xl) * 2.55)` |
| `--dt-text-artboard-display-size` | semantic | `calc(var(--dt-font-size-7xl) * 2.8)` |
| `--dt-text-artboard-display-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-artboard-display-weight` | semantic | `var(--dt-text-display-lg-weight)` |
| `--dt-text-artboard-meta-size` | semantic | `calc(var(--dt-font-size-sm) * 2.2)` |
| `--dt-text-artboard-meta-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-artboard-title-line` | semantic | `calc(var(--dt-line-height-7xl) * 1.7)` |
| `--dt-text-artboard-title-size` | semantic | `calc(var(--dt-font-size-7xl) * 1.75)` |
| `--dt-text-body-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-lg-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-body-lg-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-body-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-lg-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-body-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-body-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-body-xs-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-brand-secondary` | semantic | `var(--dt-color-secondary-700)` |
| `--dt-text-code-md-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-code-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-code-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-md-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-code-sm-family` | semantic | `var(--dt-font-family-mono)` |
| `--dt-text-code-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-code-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-code-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-code-sm-weight` | semantic | `var(--dt-font-weight-regular)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-display-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-lg-line` | semantic | `var(--dt-line-height-7xl)` |
| `--dt-text-display-lg-size` | semantic | `var(--dt-font-size-7xl)` |
| `--dt-text-display-lg-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-md-line` | semantic | `var(--dt-line-height-6xl)` |
| `--dt-text-display-md-size` | semantic | `var(--dt-font-size-6xl)` |
| `--dt-text-display-md-tracking` | semantic | `var(--dt-tracking-tightest)` |
| `--dt-text-display-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-display-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-display-sm-line` | semantic | `var(--dt-line-height-5xl)` |
| `--dt-text-display-sm-size` | semantic | `var(--dt-font-size-5xl)` |
| `--dt-text-display-sm-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-display-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-eyebrow-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-eyebrow-line` | semantic | `var(--dt-line-height-2xs)` |
| `--dt-text-eyebrow-size` | semantic | `var(--dt-font-size-2xs)` |
| `--dt-text-eyebrow-tracking` | semantic | `var(--dt-tracking-wider)` |
| `--dt-text-eyebrow-weight` | semantic | `var(--dt-font-weight-semibold)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-sm-line` | semantic | `var(--dt-line-height-xl)` |
| `--dt-text-heading-sm-size` | semantic | `var(--dt-font-size-xl)` |
| `--dt-text-heading-sm-tracking` | semantic | `var(--dt-tracking-snug)` |
| `--dt-text-heading-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xl-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xl-line` | semantic | `var(--dt-line-height-4xl)` |
| `--dt-text-heading-xl-size` | semantic | `var(--dt-font-size-4xl)` |
| `--dt-text-heading-xl-tracking` | semantic | `var(--dt-tracking-tighter)` |
| `--dt-text-heading-xl-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-xs-line` | semantic | `var(--dt-line-height-lg)` |
| `--dt-text-heading-xs-size` | semantic | `var(--dt-font-size-lg)` |
| `--dt-text-heading-xs-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-heading-xs-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-headline` | semantic | `var(--dt-text-primary)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-inverse` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-label-lg-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-lg-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-label-md-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-label-sm-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-sm-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-label-sm-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-sm-tracking` | semantic | `var(--dt-tracking-normal)` |
| `--dt-text-label-sm-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-link` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-link-brand` | semantic | `var(--dt-color-primary-700)` |
| `--dt-text-link-brand-hover` | semantic | `var(--dt-color-primary-800)` |
| `--dt-text-link-hover` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-link-visited` | semantic | `var(--dt-color-neutral-700)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-action-disabled` | semantic | `var(--dt-color-neutral-400)` |
| `--dt-text-on-action-ghost` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-action-secondary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-brand` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-muted` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-brand-secondary` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-brand-secondary-muted` | semantic | `var(--dt-color-secondary-900)` |
| `--dt-text-on-danger` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-info` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-scrim` | semantic | `var(--dt-color-neutral-050)` |
| `--dt-text-on-scrim-brand` | semantic | `var(--dt-color-primary-200)` |
| `--dt-text-on-scrim-secondary` | semantic | `var(--dt-color-neutral-200)` |
| `--dt-text-on-scrim-strong` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-selected` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-on-selected-brand` | semantic | `var(--dt-color-primary-900)` |
| `--dt-text-on-success` | semantic | `var(--dt-color-white)` |
| `--dt-text-on-warning` | semantic | `var(--dt-color-neutral-950)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-text-wordmark` | semantic | `var(--dt-text-primary)` |

## Source

```jsx
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
      <AmbientBorder state={state} level={level} inputStream={inputStream} outputStream={outputStream} radius="container" role="group" aria-label={label} style={style} {...rest}>
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
    <AmbientBorder state={state} level={level} inputStream={inputStream} outputStream={outputStream} radius="pill" role="group" aria-label={label} style={style} {...rest}>
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
```

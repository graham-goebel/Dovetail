# VoiceOverlay

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [VoiceOverlay.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceOverlay.jsx), [VoiceOverlay.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceOverlay.d.ts), [VoiceOverlay.md](https://graham-goebel.github.io/Dovetail/system/components/chat/VoiceOverlay.md).

Live page: https://graham-goebel.github.io/Dovetail/components/VoiceOverlay.html

## Guidelines

A voice conversation over the whole screen. An ambient border runs round the edge of the screen and glows inward. The exchange is set large in the middle. The microphone and End sit at the foot, where a thumb reaches them. It's dark by default, so it looks the same over any page.

### Use it when
- Voice is the whole interaction for a while: a hands-free mode, an assistant on a phone, or a call with an agent.
- The person has asked to talk and the page behind doesn't matter until they're done.

### Don't use it when
- People should keep working on the page while they talk. Use `VoiceInput`.
- You need a confirmation or a form. Use `Dialog` or `Sheet`.
- You want a loading screen with no conversation in it. Use `Thinking` with `mode="overlay"`.

### Example
```jsx
const [open, setOpen] = useState(false);

<IconButton label="Talk to the assistant" onClick={() => setOpen(true)}><MicIcon /></IconButton>
<VoiceOverlay
  open={open}
  onClose={() => { endConversation(); setOpen(false); }}
  state={state}
  inputStream={micStream}
  outputStream={replyStream}
  transcript={partialTranscript}
  response={reply}
  onToggle={toggleListening}
/>
```

### Behaviour
- **Controlled**, like `VoiceInput`. The app opens and closes it and owns the microphone and the reply. `state` sets the border and the status.
- **The words.** While listening, the person's words are set large as they speak. Otherwise the assistant's reply is set large, with the person's last words underneath.
- **The microphone** calls `onToggle`. **End** calls `onClose`, and so does Escape.
- `children` go above the words, for example a `Thinking` orb, an avatar or the agent's name.
- `dark={false}` follows the page's own colour mode instead of forcing dark.

### Tokens
- `--dt-voice-overlay-bg` fills the screen.
- `--dt-voice-label-fg` and `--dt-voice-placeholder-fg` colour the status and the placeholder. Text uses the `eyebrow`, `heading-lg` and `body-md` roles.
- The column is as wide as `--dt-layout-page-width-narrow` and padded by `--dt-layout-page-gutter`.
- The border reads every `AmbientBorder` token. It uses the thick ring and the overlay radius.

### Accessibility
- A modal dialog named by `label` ("Voice conversation"). Focus moves in, Tab stays inside, Escape closes it, the page behind doesn't scroll, and focus goes back to the opener when it closes.
- The status is a polite live region, so each change of state is announced.
- The microphone is a toggle with `aria-pressed`. End is named by `closeLabel` ("End conversation").
- Under `prefers-reduced-motion` the border stands still in its state's colours.
- Show the words as well as speaking them. People who can't hear the reply still need to read it.

### Content
- `placeholder` invites the first words: "Go ahead, I'm listening".
- Keep the reply on screen short. Show the first sentence or two and leave the rest in the chat history.

## Props

```ts
import * as React from "react";
import type { VoiceState } from "./AmbientBorder";

/**
 * A voice conversation over the whole screen: the ambient border runs round
 * the screen's edge and glows inward, the exchange is set large in the
 * middle, and the microphone and End sit at the foot. Modal, as Dialog is:
 * focus moves in, Tab stays inside, Escape ends it, the page stops
 * scrolling, and focus goes back where it came from.
 */
export interface VoiceOverlayProps extends React.HTMLAttributes<HTMLElement> {
  /** Whether it is showing. */
  open: boolean;
  /** Ends the conversation: the End button and Escape. */
  onClose?: () => void;
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
  /** The assistant's reply. */
  response?: string;
  /** Shown large when nothing has been said yet. @default "Go ahead, I'm listening" */
  placeholder?: string;
  /** Who replies, before their words while the person speaks over them. @default "Assistant" */
  assistantName?: string;
  /** The dialog's accessible name. @default "Voice conversation" */
  label?: string;
  /** The End button's accessible name. @default "End conversation" */
  closeLabel?: string;
  /** The microphone button: start listening, or stop. */
  onToggle?: () => void;
  /** Scopes dark mode to the overlay, so it reads the same over any page. @default true */
  dark?: boolean;
  /** Shown above the words, such as an avatar or a Thinking figure. */
  children?: React.ReactNode;
}

export declare function VoiceOverlay(props: VoiceOverlayProps): React.JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-voice-label-fg` | component | `var(--dt-text-secondary)` |
| `--dt-voice-overlay-bg` | component | `var(--dt-surface-base)` |
| `--dt-voice-placeholder-fg` | component | `var(--dt-text-tertiary)` |
| `--dt-layout-inline-block` | semantic | `var(--dt-dim-6)` |
| `--dt-layout-page-gutter` | semantic | `var(--dt-space-gutter)` |
| `--dt-layout-page-width-narrow` | semantic | `var(--dt-size-container-narrow)` |
| `--dt-layout-stack-block` | semantic | `var(--dt-dim-8)` |
| `--dt-layout-stack-group` | semantic | `var(--dt-dim-4)` |
| `--dt-layout-text-subcopy` | semantic | `var(--dt-space-stack-sm)` |
| `--dt-size-icon-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
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
| `--dt-z-overlay` | semantic | `300` |

## Source

```jsx
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
```

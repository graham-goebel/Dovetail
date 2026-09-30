# ChatHeader

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Chat family. Files: [ChatHeader.jsx](https://graham-goebel.github.io/Dovetail/system/components/chat/ChatHeader.jsx), [ChatHeader.d.ts](https://graham-goebel.github.io/Dovetail/system/components/chat/ChatHeader.d.ts), [ChatHeader.md](https://graham-goebel.github.io/Dovetail/system/components/chat/ChatHeader.md).

Live page: https://graham-goebel.github.io/Dovetail/components/ChatHeader.html

## Guidelines

The bar above a conversation: who it is with, whether they are there, a way back, and a slot for a few actions.

### Use it when
- A screen or panel is one conversation, with a person, a team or an assistant.
- You need to show presence (online, away, offline) next to the person's name.

### Don't use it when
- It is the top of an ordinary page. Use `Navbar`, or `AppShell`'s title bar on a phone.
- It heads a list of conversations rather than one. That is a page heading and a `List`.

### Example
```jsx
<ChatHeader
  title="Maya Chen"
  subtitle="Typically replies in 5 min"
  avatar={{ name: "Maya Chen", src: maya.photo }}
  presence="online"
  onBack={() => navigate("/inbox")}
  actions={<IconButton label="More options"><MoreIcon /></IconButton>}
/>
```

### Props
| prop | what it is for |
| --- | --- |
| `title` | Required. The person, team or assistant. A heading (`h2` by default, `headingLevel` to change); truncates to one line. |
| `subtitle` | A second line: response time, role, "Answers from the help centre". |
| `avatar` | `{ name, src? }`, rendered with `Avatar`. Decorative, because the title already names them. |
| `presence` | `"online"`, `"away"` or `"offline"`: a dot on the avatar and the same word in text. |
| `onBack` | Shows a back button (`IconButton`, labelled "Back") before everything else. |
| `actions` | The right-hand slot. Two or three `IconButton`s at most. |

### Composition
The first child of a flex column that holds the conversation: `ChatHeader`, then `MessageList` with `flex: 1`, then `Composer`. It does not stick itself; the column keeps it at the top. It uses `Avatar` and `IconButton` inside. Keep `actions` to icon buttons with real labels; put anything more behind a More button.

### Tokens
Reads `--dt-chat-surface` (background), `--dt-chat-border` (bottom rule), `--dt-presence-online`, `--dt-presence-away`, `--dt-presence-offline` and `--dt-presence-size` for the dot, and the text roles `--dt-text-primary` and `--dt-text-secondary`. Exposes those `--dt-chat-*` and `--dt-presence-*` tokens (Tier 3, in `tokens/component/chat.css`); the colour ones are repeated under `.dark`.

### Accessibility
- Renders a `<header>` with the title as a real heading, so screen reader users can jump to the conversation.
- Presence is never colour alone. With no subtitle the word shows beside the title; with one, it is read before the subtitle ("Online. Typically replies in 5 min") in visually hidden text. The dot itself is hidden from assistive technology.
- The avatar is hidden from assistive technology, since the heading already says who it is.
- The back button is an `IconButton` named "Back". Every action you pass needs its own label.

### Content
- Title: the name as the person would recognise it. No "Chat with".
- Subtitle: sentence case, no full stop, short enough for one line on a phone.

## Props

```ts
import * as React from "react";

/** Who the conversation is with, shown in a ChatHeader. */
export interface ChatHeaderAvatar {
  /** Full name. The initials fall back to it when there is no image. */
  name: string;
  /** Image URL. */
  src?: string;
}

/** The bar above a conversation: title, avatar with presence, a back button and actions. Renders a `<header>`. */
export interface ChatHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The person, team or assistant the conversation is with. Rendered as a heading. */
  title: string;
  /** A second line, e.g. "Typically replies in 5 min". Shown under the title. */
  subtitle?: React.ReactNode;
  /** Shown before the title. Decorative: the title already names them. */
  avatar?: ChatHeaderAvatar;
  /** A dot on the avatar, with the same state in text: read by screen readers, and shown when there is no subtitle. */
  presence?: "online" | "away" | "offline";
  /** Shows a back button, labelled "Back", before everything else. */
  onBack?: () => void;
  /** The right-hand slot: a few IconButtons, e.g. call or more. */
  actions?: React.ReactNode;
  /** Level of the title's heading element. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export declare function ChatHeader(props: ChatHeaderProps): React.JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-chat-border` | component | `var(--dt-border-subtle)` |
| `--dt-chat-surface` | component | `var(--dt-surface-base)` |
| `--dt-presence-away` | component | `var(--dt-surface-warning)` |
| `--dt-presence-offline` | component | `var(--dt-text-tertiary)` |
| `--dt-presence-online` | component | `var(--dt-surface-success)` |
| `--dt-presence-size` | component | `var(--dt-size-icon-xs)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-border-width-strong` | semantic | `var(--dt-dim-hair-2)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-body-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-xs-line` | semantic | `var(--dt-line-height-xs)` |
| `--dt-text-body-xs-size` | semantic | `var(--dt-font-size-xs)` |
| `--dt-text-label-lg-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-lg-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-label-lg-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
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
```

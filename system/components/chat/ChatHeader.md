# ChatHeader

The bar above a conversation: who it is with, whether they are there, a way back, and a slot for a few actions.

## Use it when
- A screen or panel is one conversation, with a person, a team or an assistant.
- You need to show presence (online, away, offline) next to the person's name.

## Don't use it when
- It is the top of an ordinary page. Use `Navbar`, or `AppShell`'s title bar on a phone.
- It heads a list of conversations rather than one. That is a page heading and a `List`.

## Example
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

## Props
| prop | what it is for |
| --- | --- |
| `title` | Required. The person, team or assistant. A heading (`h2` by default, `headingLevel` to change); truncates to one line. |
| `subtitle` | A second line: response time, role, "Answers from the help centre". |
| `avatar` | `{ name, src? }`, rendered with `Avatar`. Decorative, because the title already names them. |
| `presence` | `"online"`, `"away"` or `"offline"`: a dot on the avatar and the same word in text. |
| `onBack` | Shows a back button (`IconButton`, labelled "Back") before everything else. |
| `actions` | The right-hand slot. Two or three `IconButton`s at most. |

## Composition
The first child of a flex column that holds the conversation: `ChatHeader`, then `MessageList` with `flex: 1`, then `Composer`. It does not stick itself; the column keeps it at the top. It uses `Avatar` and `IconButton` inside. Keep `actions` to icon buttons with real labels; put anything more behind a More button.

## Tokens
Reads `--dt-chat-surface` (background), `--dt-chat-border` (bottom rule), `--dt-presence-online`, `--dt-presence-away`, `--dt-presence-offline` and `--dt-presence-size` for the dot, and the text roles `--dt-text-primary` and `--dt-text-secondary`. Exposes those `--dt-chat-*` and `--dt-presence-*` tokens (Tier 3, in `tokens/component/chat.css`); the colour ones are repeated under `.dark`.

## Accessibility
- Renders a `<header>` with the title as a real heading, so screen reader users can jump to the conversation.
- Presence is never colour alone. With no subtitle the word shows beside the title; with one, it is read before the subtitle ("Online. Typically replies in 5 min") in visually hidden text. The dot itself is hidden from assistive technology.
- The avatar is hidden from assistive technology, since the heading already says who it is.
- The back button is an `IconButton` named "Back". Every action you pass needs its own label.

## Content
- Title: the name as the person would recognise it. No "Chat with".
- Subtitle: sentence case, no full stop, short enough for one line on a phone.

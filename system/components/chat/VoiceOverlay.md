# VoiceOverlay

A voice conversation over the whole screen. An ambient border runs round the edge of the screen and glows inward. The exchange is set large in the middle. The microphone and End sit at the foot, where a thumb reaches them. It's dark by default, so it looks the same over any page.

## Use it when
- Voice is the whole interaction for a while: a hands-free mode, an assistant on a phone, or a call with an agent.
- The person has asked to talk and the page behind doesn't matter until they're done.

## Don't use it when
- People should keep working on the page while they talk. Use `VoiceInput`.
- You need a confirmation or a form. Use `Dialog` or `Sheet`.
- You want a loading screen with no conversation in it. Use `Thinking` with `mode="overlay"`.

## Example
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

## Behaviour
- **Controlled**, like `VoiceInput`. The app opens and closes it and owns the microphone and the reply. `state` sets the border and the status.
- **The words.** While listening, the person's words are set large as they speak. Otherwise the assistant's reply is set large, with the person's last words underneath.
- **The microphone** calls `onToggle`. **End** calls `onClose`, and so does Escape.
- `children` go above the words, for example a `Thinking` orb, an avatar or the agent's name.
- `dark={false}` follows the page's own colour mode instead of forcing dark.

## Tokens
- `--dt-voice-overlay-bg` fills the screen.
- `--dt-voice-label-fg` and `--dt-voice-placeholder-fg` colour the status and the placeholder. Text uses the `eyebrow`, `heading-lg` and `body-md` roles.
- The column is as wide as `--dt-layout-page-width-narrow` and padded by `--dt-layout-page-gutter`.
- The border reads every `AmbientBorder` token. It uses the thick ring and the overlay radius.

## Accessibility
- A modal dialog named by `label` ("Voice conversation"). Focus moves in, Tab stays inside, Escape closes it, the page behind doesn't scroll, and focus goes back to the opener when it closes.
- The status is a polite live region, so each change of state is announced.
- The microphone is a toggle with `aria-pressed`. End is named by `closeLabel` ("End conversation").
- Under `prefers-reduced-motion` the border stands still in its state's colours.
- Show the words as well as speaking them. People who can't hear the reply still need to read it.

## Content
- `placeholder` invites the first words: "Go ahead, I'm listening".
- Keep the reply on screen short. Show the first sentence or two and leave the rest in the chat history.

# VoiceInput

Voice input for a conversation, sized to sit in a page. It comes as a bar that takes the place of a composer, or as a panel that holds the exchange. An ambient border turns around it in the brand colour while the person speaks and in the secondary colour while the assistant answers, and its glow follows their voices.

## Use it when
- People can talk to an assistant inside a page or a chat panel, without leaving what they're doing.
- Voice sits beside typing. Swap the `Composer` for the bar while the person is speaking.

## Don't use it when
- The conversation should take over the screen, for example a hands-free mode or a call on a phone. Use `VoiceOverlay`.
- You only need a microphone button that dictates into a field. Use an `IconButton` in the field.
- It's a recording or an audio player. VoiceInput shows a conversation, not a recording.

## Example
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

## Behaviour
- **Controlled.** Your app owns the microphone, the speech recognition and the reply. It tells the component which `state` the conversation is in: `idle`, `listening`, `thinking`, `speaking` or `error`. The component draws that state and never changes it itself.
- **The microphone** calls `onToggle`. While listening it's a solid stop button named "Stop listening" and marked `aria-pressed`. Otherwise it's a microphone named "Speak".
- **End** appears when you pass `onEnd` and the conversation isn't idle.
- **Words.** `transcript` is what the person is saying, live or final. `response` is the assistant's reply. While listening, only the transcript shows. Otherwise the panel shows both lines, labelled "You" and `assistantName`, and the bar shows the reply.
- **Level.** As for `AmbientBorder`: a `level` prop first, otherwise `inputStream` while listening and `outputStream` while speaking, otherwise a built-in rhythm.

## Layouts
- `bar`: a pill one control high, with the microphone, one line of words and the status. Put it where the composer goes.
- `panel`: a card with the status and End at the top, the exchange in the middle and a large microphone at the foot. Use it in a sidebar, a help panel or an empty chat.

## Tokens
- Layout: `--dt-voice-gap`, `--dt-voice-padding`, `--dt-voice-panel-padding`.
- Words: `--dt-voice-label-fg` for the status, `--dt-voice-placeholder-fg` for the placeholder. Text uses the `eyebrow`, `body-sm` and `body-lg` roles.
- The border reads every `AmbientBorder` token, and the buttons read `--dt-button-*`.

## Accessibility
- The whole input is a group named by `label` ("Voice input").
- The status ("Listening", "Thinking", "Speaking", "Didn't catch that") is a polite live region, so a change of state is announced without moving focus.
- The microphone is a toggle button with `aria-pressed` and a name that says what it will do.
- Never let voice be the only way in. Keep a `Composer` within reach.
- Under `prefers-reduced-motion` the border stands still. The status still names the state.

## Content
- `placeholder` says how to start: "Press the microphone and speak".
- `assistantName` is the name people know the assistant by, kept short.
- On `error`, show what to try next in `response`: "I didn't catch that. Try again?"

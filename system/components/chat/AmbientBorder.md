# AmbientBorder

A gradient border that turns around its container and answers to a voice conversation. The `state` says who has the floor and sets the colours. The voice's level brightens the glow behind the ring and speeds up the turn. VoiceInput and VoiceOverlay are built on it. Use it on its own to give any container the same voice treatment, such as a chat panel, a card or a call screen.

## Use it when
- A container should show that a voice conversation is live: whether the person is speaking, the assistant is thinking, or the assistant is answering.
- You're building a voice surface that VoiceInput and VoiceOverlay don't cover, and it should match them.

## Don't use it when
- It's decoration with no conversation behind it. A border that moves draws the eye, so keep it for something that's actually happening.
- You need a loading indicator with no voice. Use `Thinking` or `Spinner`.
- You need a focus ring or a selected state. Use the system's focus and border roles.

## Example
```jsx
const [state, setState] = useState("idle");
const [mic, setMic] = useState(null);

<AmbientBorder state={state} inputStream={mic} contentStyle={{ padding: "var(--dt-space-inset-lg)" }}>
  <Text>Ask about an order, a delivery or a return.</Text>
</AmbientBorder>
```

## States
- `idle`: the plain border scale, turning slowly. The conversation is open but nobody is speaking.
- `listening`: the brand colour. Follows the person's voice.
- `thinking`: two marks chase each other round a faint track, faster than any other state, in the brand, secondary and info colours. The system is working and there's no voice to follow.
- `speaking`: the secondary brand colour. Follows the assistant's voice. The person and the assistant use different colours so they're easy to tell apart.
- `error`: the danger colours, standing still.

A change of state crossfades from the old colours to the new ones, and the ring keeps turning from where it was.

## Level
The glow and the speed of the turn follow a level from 0 to 1. The component looks for one in this order:
1. **`level`**, a number you pass in every render. Use it when your speech SDK already reports loudness.
2. **A stream.** `inputStream` is used while listening and `outputStream` while speaking. Each is a `MediaStream` with an audio track, for example from `getUserMedia` or a WebRTC call. The component reads the stream's loudness with the Web Audio analyser. It never plays the stream, so the microphone doesn't echo.
3. **A built-in rhythm**, so a demo or a prototype still looks alive: a restless hum while listening and a syllable rhythm while speaking.

The level rises fast and falls slowly, so the glow doesn't flicker between words.

## Composition
- The ring and glow are drawn behind the content. The container keeps its own layout, and `contentStyle` sets the inner box's padding, layout and height.
- `radius` matches the shape of what it wraps: `pill` for a bar, `container` for a panel, `overlay` for a screen. The inner box's radius is reduced by the ring's width so the curves stay parallel.
- `surface` fills the inner box. Use `none` when the container sits over a background of its own, as VoiceOverlay does.
- `thickness="thick"` is for a whole screen, where a thin ring would be lost.
- `glow={false}` drops the blurred halo. Use it in dense layouts or where many rings would be on screen at once.
- The animation writes straight to the ring each frame without re-rendering React, so a live level doesn't cause a render 60 times a second.

## Tokens
- Ring: `--dt-voice-ring-width`, `--dt-voice-ring-width-thick`, `--dt-voice-track`.
- Glow: `--dt-voice-glow-width`, `--dt-voice-glow-blur`, `--dt-voice-glow-spread`, `--dt-voice-glow-rest`.
- Surface: `--dt-voice-surface`.
- Colours, three stops per state: `--dt-voice-idle-a`, `-b` and `-c`, and the same for `listening`, `thinking`, `speaking` and `error`. Re-point them to give a brand its own voice colours.
- The colours are repeated under `.dark`, so the ring follows a dark `Section` band.

## Accessibility
- The ring and glow are `aria-hidden`. The border is never the only signal: pair it with a visible, announced status. VoiceInput and VoiceOverlay do this for you.
- Pass `role` and `aria-label` through when the container is a landmark or a group.
- Under `prefers-reduced-motion` nothing turns, pulses or fades. The ring stays still in its state's colours, and the glow stays at its resting strength. The state still reads.
- Colour alone doesn't tell listening from speaking for everyone. Name the state in text.

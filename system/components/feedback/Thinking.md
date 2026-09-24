# Thinking

What an assistant is doing while you wait: connecting, listening, thinking, searching or speaking. Five states of one fluid animation, drawn from the system's tokens, that sit inline in a chat or fill the screen for a voice session.

## Use it when
- A chat is waiting on a reply. Put it inline where the reply will appear.
- A voice session is live. Use `mode="overlay"` and pass the microphone or reply amplitude as `level`.

## Don't use it when
- The wait has a known length or a known amount of work. Use `Progress`.
- It is a page or a button loading. Use `Spinner` or the button's own `loading`. This component speaks for an assistant, not for the interface.

## States
| state | motion | when |
| --- | --- | --- |
| `connecting` | satellites gather and breathe | before the session is live |
| `listening` | swells and wobbles with `level` | the person is speaking |
| `thinking` | bodies orbit and merge | the reply is being prepared |
| `searching` | a comet orbits the centre | tools or sources are being consulted |
| `speaking` | pulses outward with `level` | the reply is being spoken or streamed |

## Example
```jsx
{/* Chat */}
<Thinking state="thinking" />
<Thinking state="searching" shape="dots" label="Checking three sources" />

{/* Voice */}
<Thinking mode="overlay" state="listening" level={micLevel} tone="duotone" onDismiss={end}>
  {transcript}
</Thinking>
```

## Inputs
- **shape**: `blob` is free fluid. `orb` and `tile` hold the fluid in a well tinted with `--dt-thinking-surface`; the tile follows `--dt-radius-container`, so it changes with the Shape setting. `dots` and `bars` are the chat and voice conventions, animated the same five ways.
- **tone** or **colors**: the gradient the fluid sweeps. `brand` reads `--dt-thinking-color-start` and `-end`, which point at the primary ramp; `duotone` sweeps primary into secondary. `colors` takes any two CSS colours, token references included.
- **speed** multiplies the pace set by `--dt-thinking-duration`; **intensity** sets how far the fluid travels and deforms.
- **level** drives listening and speaking from a real signal. Without it they follow a built-in rhythm.

## Accessibility
The container is a polite live region, and the label is announced when the state changes, whether or not it is shown. The animation itself is hidden from assistive technology. Under `prefers-reduced-motion` the fluid holds still; it still follows `level`, because that is information rather than decoration. The overlay closes on Escape when `onDismiss` is set.

## Tokens
`--dt-thinking-*` (Tier 3): the start and end colour of each tone, the brand pair, the well surface, the label colour, the overlay scrim, the duration, and the inline and overlay sizes. Colour aliases are repeated under `.dark`, so the fluid keeps its contrast in a dark band and in the overlay.

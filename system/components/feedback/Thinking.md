# Thinking

What an assistant is doing while you wait: connecting, listening, thinking, searching or speaking. Five states, drawn as a fluid or as a texture of small marks, all read from the system's tokens, that sit inline in a chat or fill the screen for a voice session.

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
<Thinking state="thinking" shape="ascii" label="Drafting" />
<Thinking state="searching" shape="dots" label="Checking three sources" />

{/* Voice */}
<Thinking mode="overlay" state="listening" level={micLevel} tone="duotone" onDismiss={end}>
  {transcript}
</Thinking>
```

## Inputs
- **shape**: `blob` is free fluid. `orb` and `tile` hold the fluid in a well tinted with `--dt-thinking-surface`; the tile follows `--dt-radius-container`, so it changes with the Shape setting. `dots` and `bars` are the chat and voice conventions, animated the same five ways.
- **Textural shapes** build the figure from many small marks instead of a liquid, and animate the same five states:
  - `matrix`: a dot display. Every cell keeps a faint dot so the grid shows, and the figure swells the dots.
  - `ascii`: the same figure as glyphs of rising density, ` .·:-=+*#%@`, set in `--dt-font-family-mono`, so it changes with the Code font.
  - `particles`: a point cloud on a sphere, turning in perspective. Nearer points are larger and take the end colour; searching flattens it into a disc with a bright arc sweeping round.
  - `sequence`: a ring of dots lit in order, like a loader on a device panel.

  matrix and ascii share one field per state: a shrinking ring for connecting, a lit sphere that swells with `level` for listening, a spiral for thinking, a radar sweep for searching and ripples for speaking. The sphere is shaded as if lit from above left, which is what gives the flat marks their depth. These shapes draw on a canvas and read the tone colours back from the page about twice a second, so Configure and dark mode reach them without a re-render.
- **tone** or **colors**: the gradient the fluid sweeps. `brand` reads `--dt-thinking-color-start` and `-end`, which point at the primary ramp; `duotone` sweeps primary into secondary. `colors` takes any two CSS colours, token references included.
- **speed** multiplies the pace set by `--dt-thinking-duration`; **intensity** sets how far the fluid travels and deforms.
- **level** drives listening and speaking from a real signal. Without it they follow a built-in rhythm.

## Accessibility
The container is a polite live region, and the label is announced when the state changes, whether or not it is shown. The animation itself is hidden from assistive technology. Under `prefers-reduced-motion` the figure holds still; it still follows `level`, because that is information rather than decoration. The overlay closes on Escape when `onDismiss` is set.

## Tokens
`--dt-thinking-*` (Tier 3): the start and end colour of each tone, the brand pair, the well surface, the label colour, the overlay scrim, the duration, and the inline and overlay sizes. Colour aliases are repeated under `.dark`, so the fluid keeps its contrast in a dark band and in the overlay.

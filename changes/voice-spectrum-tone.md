---
type: added
bump: minor
area: components
components: [AmbientBorder, VoiceInput, VoiceOverlay]
tokens: [--dt-spectrum-1, --dt-spectrum-2, --dt-spectrum-3, --dt-spectrum-4, --dt-spectrum-5, --dt-spectrum-6, --dt-color-spectrum-red-400, --dt-color-spectrum-red-500, --dt-color-spectrum-amber-400, --dt-color-spectrum-amber-500, --dt-color-spectrum-green-400, --dt-color-spectrum-green-500, --dt-color-spectrum-cyan-400, --dt-color-spectrum-cyan-500, --dt-color-spectrum-blue-400, --dt-color-spectrum-blue-500, --dt-color-spectrum-magenta-400, --dt-color-spectrum-magenta-500, --dt-voice-spectrum-1, --dt-voice-spectrum-2, --dt-voice-spectrum-3, --dt-voice-spectrum-4, --dt-voice-spectrum-5, --dt-voice-spectrum-6]
visual: false
---
`AmbientBorder`, `VoiceInput` and `VoiceOverlay` take `tone="spectrum"`, which draws the border as a six-hue wheel instead of the brand colours. The state still sets the speed, the glow and the thinking marks, and `error` stays danger. `tone="brand"` is the default and is unchanged.

The wheel reads new tokens that belong to no brand:
- **Primitives:** `--dt-color-spectrum-{red,amber,green,cyan,blue,magenta}-{400,500}` are fixed hues that no theme, brand colour or Configure setting changes.
- **Semantic roles:** `--dt-spectrum-1` to `-6` are decorative and mean no status. They use the 500 steps on light and the 400 steps under `.dark`.
- **Voice tokens:** `--dt-voice-spectrum-1` to `-6` alias the semantic roles.

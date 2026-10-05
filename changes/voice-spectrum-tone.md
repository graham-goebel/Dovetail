---
type: added
bump: minor
area: components
components: [AmbientBorder, VoiceInput, VoiceOverlay]
tokens: [--dt-voice-spectrum-1, --dt-voice-spectrum-2, --dt-voice-spectrum-3, --dt-voice-spectrum-4, --dt-voice-spectrum-5, --dt-voice-spectrum-6]
visual: false
---
`AmbientBorder`, `VoiceInput` and `VoiceOverlay` take `tone="spectrum"`, which draws the border as a six-hue wheel instead of the brand colours. The hues come from `--dt-voice-spectrum-1` to `-6`, which alias the solid danger, warning, success, info and two brand fills, so the wheel stays saturated in light and dark. The state still sets the speed, the glow and the thinking marks, and `error` stays danger. `tone="brand"` is the default and is unchanged.

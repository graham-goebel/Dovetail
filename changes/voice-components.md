---
type: added
bump: minor
area: components
components: [AmbientBorder, VoiceInput, VoiceOverlay]
tokens: [--dt-voice-ring-width, --dt-voice-ring-width-thick, --dt-voice-glow-width, --dt-voice-glow-blur, --dt-voice-glow-spread, --dt-voice-glow-rest, --dt-voice-surface, --dt-voice-overlay-bg, --dt-voice-track, --dt-voice-gap, --dt-voice-padding, --dt-voice-panel-padding, --dt-voice-label-fg, --dt-voice-placeholder-fg, --dt-voice-idle-a, --dt-voice-idle-b, --dt-voice-idle-c, --dt-voice-listening-a, --dt-voice-listening-b, --dt-voice-listening-c, --dt-voice-thinking-a, --dt-voice-thinking-b, --dt-voice-thinking-c, --dt-voice-speaking-a, --dt-voice-speaking-b, --dt-voice-speaking-c, --dt-voice-error-a, --dt-voice-error-b, --dt-voice-error-c]
visual: false
---
Adds three voice components. `AmbientBorder` is a gradient border that turns around its container. Its `state` (`idle`, `listening`, `thinking`, `speaking` or `error`) sets the colours, and the voice's level, from `level`, `inputStream` or `outputStream`, brightens its glow and speeds up the turn. `VoiceInput` puts voice in a page, as a `bar` or a `panel`, with a microphone toggle and a live status. `VoiceOverlay` is a full-screen voice conversation. Their tokens are `--dt-voice-*` in `tokens/component/voice.css`, with three gradient stops per state.

---
type: fixed
bump: patch
area: components
components: [Card]
tokens: []
visual: false
---
`Card` with `backgroundVideo` starts its video from an effect rather than an `autoPlay` attribute, so the server and the browser render the same markup and React no longer warns about a mismatch for readers who prefer reduced motion. The video still plays unprompted (it is muted and inline), and stays on its poster when reduced motion is on.

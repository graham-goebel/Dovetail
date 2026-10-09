---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder's assistant checks its own work. After every reply that changes the canvas, five checks run on the frame and show under the change card: text contrast as drawn, nothing spilling past the edge at 390px wide (for structured frames), text contrast in the other colour mode, labels, alt text, heading order and primary buttons, and placeholder copy. Contrast and overflow are read from the frame drawn out of sight, so the canvas never changes while they run. A check that fails or warns has a Fix, which sends what failed and where to the assistant, and its title selects the layers it names. The assistant can run the same checks itself (lint) and measure the space between two layers as the nearest spacing token (measure).

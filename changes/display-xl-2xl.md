---
type: added
bump: minor
area: tokens
components: [Heading]
tokens: [--dt-text-display-xl-family, --dt-text-display-xl-size, --dt-text-display-xl-line, --dt-text-display-xl-weight, --dt-text-display-xl-tracking, --dt-text-display-2xl-family, --dt-text-display-2xl-size, --dt-text-display-2xl-line, --dt-text-display-2xl-weight, --dt-text-display-2xl-tracking, --dt-font-size-8xl, --dt-font-size-9xl, --dt-font-size-10xl, --dt-font-size-11xl, --dt-font-size-fluid-xl, --dt-font-size-fluid-2xl, --dt-line-height-8xl, --dt-line-height-9xl, --dt-line-height-10xl, --dt-line-height-11xl, --dt-line-height-fluid]
visual: false
---
`Heading` takes two larger sizes, `size="display-xl"` and `size="display-2xl"`, for a poster-sized headline or key number. Both are fluid: `--dt-text-display-xl-size` runs from `--dt-font-size-6xl` (58px) on a phone to `--dt-font-size-9xl` (100px) on a wide screen, and `--dt-text-display-2xl-size` from `--dt-font-size-7xl` (69px) to `--dt-font-size-11xl` (144px), with a line height that follows the size (`--dt-line-height-fluid`). The product and social contexts step them down to fixed sizes, the social type scale multiplies `--dt-font-size-8xl` and `--dt-font-size-9xl`, the editorial and mono themes set them like the other display roles, and a display face chosen in Configure reaches them. The size ramp gains `--dt-font-size-8xl` to `--dt-font-size-11xl` with matching line heights.

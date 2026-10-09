---
type: added
bump: none
area: site
components: []
tokens: []
visual: false
---
The Builder fills its size gaps. Width, height, min width and min height take every step from `x1` to `x12` of `--dt-size-step` where they had a few, and a width step never runs past its parent (`min(100%, …)`), so a wide one still fits a phone. Width gains `grow`, a share of the row that wraps with a min width. Grid's `minColumnWidth` goes up to ten steps, two columns across a 1440 page. Text and Heading take Lines (`textWrap`): one line, balanced, or even with no lone last word.

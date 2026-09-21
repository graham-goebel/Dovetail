# Stat

Puts one number where the eye lands first. Use it in dashboard headers, summary bars, and
report openers.

## Rules

- `deltaDirection` means good or bad, not up or down. A 12% drop in churn is `"up"`.
  Colour follows meaning; otherwise green reads as praise for a bad result.
- Format `value` before passing it. The component does not round, abbreviate, or add
  separators — your locale rules belong in your data layer.
- Always give `caption` a comparison period when a delta is shown. "+12.4%" against
  nothing is not a fact.
- Group stats with Grid, three or four across. More than that and none of them is
  headline.

## Tradeoffs

Big type buys attention at the cost of space. In a dense operational view a Table row
often communicates the same thing and lets the user compare twenty metrics instead of four.

# Slider

A range input for a value on a continuum where the approximate position matters more than the exact number — volume, opacity, a price ceiling.

## Not for precise numbers

If the user knows the value they want, a slider makes them hunt for it. Use a number input. A slider earns its place when the user is exploring rather than entering.

## Always show the value

\`showValue\` is on by default and should stay on. A track with no readout tells the user they have changed something but not to what. Use \`formatValue\` to add the unit, which is what makes the number mean anything:

\`\`\`jsx
<Slider label="Cache lifetime" min={0} max={60} step={5} defaultValue={15} formatValue={v => v + " min"} />
\`\`\`

## Range and step

Keep \`min\` and \`max\` to the range that is genuinely useful, not the range that is technically valid. A step coarse enough to be reachable with one arrow press beats a continuous track the keyboard cannot land on.

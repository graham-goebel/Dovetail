# Figure

Pairs media with a caption. Use it in editorial and article layouts where the image carries information the surrounding prose does not.

## Caption is not alt text

They serve different readers and must say different things. \`alt\` describes what the image shows, for someone who cannot see it. The caption adds context everyone needs: a date, a place, what to notice. Repeating one in the other wastes a screen reader's time.

\`\`\`jsx
<Figure caption="Throughput held steady through the March migration." credit="Photo: Internal">
  <Image src={chart} alt="Line chart of requests per second across three months" ratio="4:3" />
</Figure>
\`\`\`

## Credit

\`credit\` renders smaller and in the mono role, below the caption. Use it for attribution and licence text only. If the source matters to the argument, put it in the caption instead.

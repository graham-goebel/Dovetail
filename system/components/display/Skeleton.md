# Skeleton

Holds the shape of content that is still loading, so the layout does not jump when data
arrives.

## Rules

- Match the real content's dimensions. A skeleton that is the wrong size causes the
  reflow it exists to prevent.
- Skeletons are `aria-hidden`. Announce loading state on the container with
  `aria-busy`. A screen reader user gains nothing from grey rectangles.
- Use skeletons for content-shaped waits over roughly 300ms. Use Spinner for actions
  and indeterminate waits with no known shape.
- Do not skeleton an entire page. Show the chrome that is already known and skeleton
  only the parts that depend on the request.

## Tradeoffs

Skeletons make a wait feel shorter but a failed request feel longer, because the promise
of content never resolves. Pair every skeleton with an error state.

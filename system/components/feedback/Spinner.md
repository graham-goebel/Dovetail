# Spinner

Signals an indeterminate wait where the resulting content has no known shape.

## Rules

- Use a spinner for actions: saving, submitting, connecting. Use Skeleton for content
  that is about to fill a known layout.
- Below roughly 300ms, show nothing. A flash of spinner reads as a glitch.
- The `label` is announced via `role="status"`. Make it specific: "Saving changes"
  beats "Loading".
- Never centre a spinner in an empty page for more than a few seconds without a
  cancel path or a progress estimate.

## Tradeoffs

Spinners give no sense of duration, so long waits feel longer under one. If you know the
progress, use Progress instead.

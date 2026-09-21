# Progress

Shows how much of a known task is done. Use it for uploads, imports, quota meters, and
multi-file operations.

## Rules

- Only use a determinate bar when you can measure progress honestly. A bar that sits at
  90% for a minute costs more trust than a spinner.
- Pair `label` with `showValue` for operations over a few seconds. A bare bar tells the
  user something is happening but not what.
- Tone is semantic. Use `warning` and `danger` for quota meters approaching a limit,
  not to decorate a normal upload.
- For quota displays, `max` is the limit and the label states the units.

## Tradeoffs

Indeterminate bars look like progress without being progress. If you cannot measure,
Spinner is the more honest control.

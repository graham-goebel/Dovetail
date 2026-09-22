# Banner

Page-level message about the state of the whole view: trial expiry, degraded service,
a pending migration. Use Alert for messages scoped to one region or form.

## Rules

- Banners run edge to edge at the top of the region they describe. A floating banner in
  the middle of a page is an Alert.
- One banner at a time. Stacked banners push the actual page below the fold and train
  users to ignore the strip.
- `danger` announces as `role="alert"`; the rest announce politely. Do not use danger
  for anything the user can safely finish reading later.
- Persistent conditions get no dismiss button. Only offer `onDismiss` when dismissing
  it is a real decision.

## Tradeoffs

A banner buys attention from every user on the page, including the ones the message is
not for. Target it to the accounts that can act on it.

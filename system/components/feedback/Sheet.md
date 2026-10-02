# Sheet

A modal panel that rises from the bottom of a phone, inset from its edges, and opens as a centred dialog on a wide screen. It is the surface phone apps are built from: a detail view, a form, a picker, a settings page, or a sheet opened from another sheet.

## Use it when
- Showing detail or a short task on top of where the reader is, and they'll come straight back.
- Stepping into a sub-task from a sheet (a picker inside a form): open the next sheet with `onBack`.

## Don't use it when
- The reader must answer before anything else happens. Use `Dialog`.
- The panel should sit beside the page while the reader keeps working in it. Use `Drawer`.
- The content is a page someone will link to or come back to. Give it a route.

## Example
```jsx
const [open, setOpen] = React.useState(false);

<Button onClick={() => setOpen(true)}>Trip details</Button>
<Sheet
  open={open}
  onClose={() => setOpen(false)}
  eyebrow="Trip · 4 days"
  title="Alpine huts"
  description="Three huts, 42km, one pass."
  actions={[
    { label: "Book", primary: true, onClick: book },
    { label: "Share", onClick: share },
    { label: "Save", onClick: save },
  ]}
>
  <List label="Stops" items={stops} />
</Sheet>
```

A sheet opened from another keeps the reader's place with a back arrow:

```jsx
<Sheet open={picking} onBack={() => setPicking(false)} onClose={closeAll} title="Choose a hut" action={<Button size="sm">Done</Button>}>…</Sheet>
```

## Behaviour
- **Opening and closing.** It rises from the bottom on a phone and fades up on a wide screen. When `open` turns false it plays the exit, then unmounts. Reduced motion skips both.
- **The bar.** Close on the left, or back when `onBack` is set; the bar's small title fades in as the big one shrinks away over the first 72px of scroll; `action` goes on the right.
- **Actions.** `actions` float as chips along the bottom edge over a fade, scrolling sideways when they don't fit. Mark at most one `primary`. Use `footer` instead for a row of Buttons.
- **Dismissal.** The close button, Escape, the scrim, or on touch a drag down from the top of the sheet all call `onClose` with the reason. A drag right calls `onBack`. The sheet never closes itself: set `open` in response.

## Surfaces
`surface="glass"` or `"glass-strong"` re-points the sheet's surface (`--dt-dialog-bg`) to glass, and blurs what's behind the sheet and its sticky header.

## Tokens
Shares the overlay tokens with Dialog: `--dt-dialog-bg`, `--dt-dialog-fg`, `--dt-dialog-radius`, `--dt-dialog-scrim`, `--dt-dialog-width-sm|md|lg` and `--dt-dialog-max-height`. Its own are `--dt-sheet-inset` (the gap to a phone's edges), `--dt-sheet-top-gap` (the page left showing above it), `--dt-sheet-padding`, `--dt-sheet-button-size`, `--dt-sheet-button-bg` and `--dt-sheet-shadow`.

## Accessibility
- It is a `role="dialog"` with `aria-modal`, named by `title` (or `label` when there is no title).
- Focus moves to the close or back button on open, is kept inside the sheet while it is open, and returns to whatever opened it on close.
- The page behind stops scrolling while it is open.
- Drag gestures are a shortcut, never the only way: close and back are always buttons.

## Content
Eyebrow is a few words. Title is the thing's name. Description is one sentence. Chip labels are verbs.

# Dialog

A modal that interrupts. Every dialog costs the user their place, so open one only for a decision that genuinely cannot wait.

## Use it when
- Confirming something destructive.
- A short focused task that would lose context on its own page.

## Don't use it when
- It is a notification. Use `Toast` or `Alert`.
- The form has more than about five fields. Give it a page.
- Another dialog is already open. Stacked modals mean the flow is wrong.

## Example
```jsx
<Dialog
  open={open}
  onClose={close}
  title="Delete this project?"
  description="This removes all 42 documents inside it. You can't undo this."
  footer={<>
    <Button variant="secondary" onClick={close}>Cancel</Button>
    <Button variant="danger" onClick={confirm}>Delete project</Button>
  </>}
/>
```

## Accessibility
`role="dialog"` with `aria-modal`. Escape and the scrim both close it. Focus trapping and return-focus are not yet implemented, so track that before production use.

## Tokens
`--dt-dialog-*`, shared with Drawer and Popover so every overlay reads as one system.

## Content
Title is a question for a decision, a noun phrase for a task. The confirming button restates the verb: "Delete project", never "OK" or "Yes".

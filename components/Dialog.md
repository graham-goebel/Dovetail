# Dialog

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Dialog.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Dialog.jsx), [Dialog.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Dialog.d.ts), [Dialog.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Dialog.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Dialog.html

## Guidelines

A modal that interrupts. Every dialog costs the user their place, so open one only for a decision that genuinely cannot wait.

### Use it when
- Confirming something destructive.
- A short focused task that would lose context on its own page.

### Don't use it when
- It is a notification. Use `Toast` or `Alert`.
- The form has more than about five fields. Give it a page.
- Another dialog is already open. Stacked modals mean the flow is wrong.

### Example
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

### Accessibility
`role="dialog"` with `aria-modal`. Escape and the scrim both close it. Focus trapping and return-focus are not yet implemented, so track that before production use.

### Tokens
`--dt-dialog-*`, shared with Drawer and Popover so every overlay reads as one system.

### Content
Title is a question for a decision, a noun phrase for a task. The confirming button restates the verb: "Delete project", never "OK" or "Yes".

## Props

```ts
import * as React from "react";

/** Modal dialog. Interrupts the user, so reserve it for decisions that must be made now. */
export interface DialogProps {
  open: boolean;
  /** Called by the close button, the scrim, and Escape. */
  onClose?: () => void;
  title?: React.ReactNode;
  /** Supporting line below the title. */
  description?: React.ReactNode;
  /** Right-aligned action row. Put the confirming action last. */
  footer?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export declare function Dialog(props: DialogProps): React.JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-dialog-bg` | component | `var(--dt-surface-overlay)` |
| `--dt-dialog-border-color` | component | `var(--dt-border-subtle)` |
| `--dt-dialog-border-width` | component | `var(--dt-border-width-default)` |
| `--dt-dialog-elevation` | component | `var(--dt-elevation-4)` |
| `--dt-dialog-fg` | component | `var(--dt-text-primary)` |
| `--dt-dialog-gap` | component | `var(--dt-space-stack-md)` |
| `--dt-dialog-max-height` | component | `85vh` |
| `--dt-dialog-padding` | component | `var(--dt-space-inset-xl)` |
| `--dt-dialog-radius` | component | `var(--dt-radius-overlay)` |
| `--dt-dialog-scrim` | component | `var(--dt-surface-scrim)` |
| `--dt-dialog-width-lg` | component | `720px` |
| `--dt-dialog-width-md` | component | `520px` |
| `--dt-dialog-width-sm` | component | `400px` |
| `--dt-radius-control` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-control-sm` | semantic | `var(--dt-dim-8)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-stack-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-heading-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-md-line` | semantic | `var(--dt-line-height-2xl)` |
| `--dt-text-heading-md-size` | semantic | `var(--dt-font-size-2xl)` |
| `--dt-text-heading-md-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-md-weight` | semantic | `var(--dt-font-weight-medium)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-z-dialog` | semantic | `400` |

## Source

```jsx
import React from "react";

export function Dialog({ open, onClose, title, description, footer, size = "md", children }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: "var(--dt-z-dialog)",
        background: "var(--dt-dialog-scrim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--dt-space-inset-lg)",
      }}
    >
      <div
        role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          display: "flex", flexDirection: "column", gap: "var(--dt-dialog-gap)",
          width: `var(--dt-dialog-width-${size})`, maxWidth: "100%",
          maxHeight: "var(--dt-dialog-max-height)", overflowY: "auto",
          background: "var(--dt-dialog-bg)", color: "var(--dt-dialog-fg)",
          border: "var(--dt-dialog-border-width) solid var(--dt-dialog-border-color)",
          borderRadius: "var(--dt-dialog-radius)",
          padding: "var(--dt-dialog-padding)",
          boxShadow: "var(--dt-dialog-elevation)",
        }}
      >
        <button
          type="button" aria-label="Close" onClick={onClose}
          style={{
            position: "absolute", top: "var(--dt-space-inset-md)", right: "var(--dt-space-inset-md)",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "var(--dt-size-control-sm)", height: "var(--dt-size-control-sm)",
            padding: 0, border: 0, borderRadius: "var(--dt-radius-control)",
            background: "none", color: "var(--dt-text-secondary)", cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        {title && (
          <h2 style={{
            margin: 0, paddingRight: "var(--dt-space-inset-xl)",
            fontFamily: "var(--dt-text-heading-md-family)", fontSize: "var(--dt-text-heading-md-size)",
            lineHeight: "var(--dt-text-heading-md-line)", fontWeight: "var(--dt-text-heading-md-weight)",
            letterSpacing: "var(--dt-text-heading-md-tracking)",
          }}>{title}</h2>
        )}
        {description && (
          <p style={{ margin: 0, fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{description}</p>
        )}
        {children}
        {footer && <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", justifyContent: "flex-end", marginTop: "var(--dt-space-stack-xs)" }}>{footer}</div>}
      </div>
    </div>
  );
}
```

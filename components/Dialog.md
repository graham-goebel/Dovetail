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
`role="dialog"` with `aria-modal`, named by `title` (`aria-labelledby`) and described by `description`. A dialog with no visible title needs `label`. When it opens, focus moves into the panel; Tab and Shift+Tab stay inside it; the page behind stops scrolling. Escape, the scrim and the close button close it, and focus returns to whatever opened it.

### Tokens
`--dt-dialog-*`, shared with Drawer and Popover so every overlay reads as one system.

### Content
Title is a question for a decision, a noun phrase for a task. The confirming button restates the verb: "Delete project", never "OK" or "Yes".

## Props

```ts
import * as React from "react";

/** Modal dialog. Interrupts the user, so reserve it for decisions that must be made now. */
export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  /** Called by the close button, the scrim, and Escape. */
  onClose?: () => void;
  /** Heading, and the dialog's accessible name. */
  title?: React.ReactNode;
  /** Supporting line below the title, and the dialog's accessible description. */
  description?: React.ReactNode;
  /** Right-aligned action row. Put the confirming action last. */
  footer?: React.ReactNode;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Accessible name for a dialog with no visible title. */
  label?: string;
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

const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* What a modal surface does while it is open: focus moves into the panel,
   Tab and Shift+Tab cycle inside it, Escape closes it, the page behind stops
   scrolling, and focus goes back where it came from on close. Drawer shares
   it; Sheet keeps its own copy, tied to its entry and exit animation. The
   panel needs tabIndex={-1} so it can take focus itself when it has no
   tabbable child. onClose is read through a ref, so a new inline callback on
   every render does not re-run the effect and bounce focus. */
export function useModalFocus(open, panel, onClose) {
  const close = React.useRef(onClose);
  React.useEffect(() => { close.current = onClose; });
  React.useEffect(() => {
    if (!open) return undefined;
    const el = panel.current;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (el) el.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") { close.current && close.current(); return; }
      if (e.key !== "Tab" || !el) return;
      const items = Array.prototype.filter.call(el.querySelectorAll(TABBABLE), (n) => n.offsetParent !== null);
      if (!items.length) { e.preventDefault(); el.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = el.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, [open, panel]);
}

export function Dialog({ open, onClose, title, description, footer, size = "md", label, style, children, ...rest }) {
  const panel = React.useRef(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  useModalFocus(open, panel, onClose);

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
        {...rest}
        ref={panel}
        role="dialog" aria-modal="true" tabIndex={-1}
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? label : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(e) => { e.stopPropagation(); rest.onClick && rest.onClick(e); }}
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
          ...style,
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
          <h2 id={titleId} style={{
            margin: 0, paddingRight: "var(--dt-space-inset-xl)",
            fontFamily: "var(--dt-text-heading-md-family)", fontSize: "var(--dt-text-heading-md-size)",
            lineHeight: "var(--dt-text-heading-md-line)", fontWeight: "var(--dt-text-heading-md-weight)",
            letterSpacing: "var(--dt-text-heading-md-tracking)",
          }}>{title}</h2>
        )}
        {description && (
          <p id={descriptionId} style={{ margin: 0, fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{description}</p>
        )}
        {children}
        {footer && <div style={{ display: "flex", gap: "var(--dt-space-inline-xs)", justifyContent: "flex-end", marginTop: "var(--dt-space-stack-xs)" }}>{footer}</div>}
      </div>
    </div>
  );
}
```

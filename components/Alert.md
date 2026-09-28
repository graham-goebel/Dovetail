# Alert

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Alert.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Alert.jsx), [Alert.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Alert.d.ts), [Alert.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Alert.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Alert.html

## Guidelines

An inline message about the state of the page or a form. It sits in the layout and stays until the condition clears.

### Use it when
- A form failed validation at the form level.
- The page is in a state the user should know about: trial ending, sync paused.

### Don't use it when
- The message confirms an action the user just took. Use `Toast`.
- It relates to one field. Use that field's `error` prop.
- It is permanent marketing copy. That is page content, not an alert.

### Example
```jsx
<Alert tone="danger" title="We couldn't save your changes">
  Your session expired. Sign in again and retry.
</Alert>
```

### Accessibility
`danger` renders `role="alert"` and interrupts; the other tones render `role="status"` and wait for a pause. Omit `onDismiss` when the user must act. A dismissible blocker is a dead end.

### Content
Title says what happened. Body says what to do next. Never lead with an apology.

## Props

```ts
import * as React from "react";

/** Inline message about the state of the page or a form. Stays until the condition clears. */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default "info" */
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  /** Action slot, usually a ghost or secondary Button. */
  action?: React.ReactNode;
  /** Renders a dismiss button. Omit for messages the user must resolve. */
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export declare function Alert(props: AlertProps): JSX.Element;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-border-danger` | semantic | `var(--dt-color-red-200)` |
| `--dt-border-info` | semantic | `var(--dt-color-cyan-200)` |
| `--dt-border-success` | semantic | `var(--dt-color-green-200)` |
| `--dt-border-warning` | semantic | `var(--dt-color-amber-200)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-container` | semantic | `var(--dt-radius-raw-8)` |
| `--dt-size-icon-md` | semantic | `var(--dt-dim-5)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-surface-danger-subtle` | semantic | `var(--dt-color-red-050)` |
| `--dt-surface-info-subtle` | semantic | `var(--dt-color-cyan-050)` |
| `--dt-surface-success-subtle` | semantic | `var(--dt-color-green-050)` |
| `--dt-surface-warning-subtle` | semantic | `var(--dt-color-amber-050)` |
| `--dt-text-body-sm-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-danger` | semantic | `var(--dt-color-red-800)` |
| `--dt-text-info` | semantic | `var(--dt-color-cyan-900)` |
| `--dt-text-label-md-family` | semantic | `var(--dt-font-family-secondary)` |
| `--dt-text-label-md-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-label-md-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-primary` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-success` | semantic | `var(--dt-color-green-800)` |
| `--dt-text-warning` | semantic | `var(--dt-color-amber-900)` |
| `--dt-font-weight-semibold` | primitive | `600` |

## Source

```jsx
import React from "react";

const TONES = {
  info: { bg: "var(--dt-surface-info-subtle)", bd: "var(--dt-border-info)", fg: "var(--dt-text-info)", icon: "M12 16v-4 M12 8h.01", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
  success: { bg: "var(--dt-surface-success-subtle)", bd: "var(--dt-border-success)", fg: "var(--dt-text-success)", icon: "m9 12 2 2 4-4", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
  warning: { bg: "var(--dt-surface-warning-subtle)", bd: "var(--dt-border-warning)", fg: "var(--dt-text-warning)", icon: "M12 9v4 M12 17h.01", ring: "m10.3 3.6-8 14A2 2 0 0 0 4 20.5h16a2 2 0 0 0 1.7-2.9l-8-14a2 2 0 0 0-3.4 0" },
  danger: { bg: "var(--dt-surface-danger-subtle)", bd: "var(--dt-border-danger)", fg: "var(--dt-text-danger)", icon: "M15 9l-6 6 M9 9l6 6", ring: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" },
};

export function Alert({ tone = "info", title, action, onDismiss, children, style, ...rest }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      style={{
        display: "flex", gap: "var(--dt-space-inline-sm)",
        padding: "var(--dt-space-inset-md)",
        background: t.bg,
        border: `var(--dt-border-width-default) solid ${t.bd}`,
        borderRadius: "var(--dt-radius-container)",
        ...style,
      }}
      {...rest}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={t.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ width: "var(--dt-size-icon-md)", height: "var(--dt-size-icon-md)", flex: "none", marginTop: 1 }}>
        <path d={t.ring} />
        {t.icon.split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)", flex: 1, minWidth: 0 }}>
        {title && (
          <span style={{ fontFamily: "var(--dt-text-label-md-family)", fontSize: "var(--dt-text-label-md-size)", lineHeight: "var(--dt-text-label-md-line)", fontWeight: "var(--dt-font-weight-semibold)", color: "var(--dt-text-primary)" }}>{title}</span>
        )}
        {children && (
          <span style={{ fontFamily: "var(--dt-text-body-sm-family)", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{children}</span>
        )}
        {action && <div style={{ marginTop: "var(--dt-space-stack-2xs)" }}>{action}</div>}
      </div>
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss}
          style={{ display: "flex", padding: 0, border: 0, background: "none", color: "var(--dt-text-secondary)", cursor: "pointer", flex: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}
    </div>
  );
}
```

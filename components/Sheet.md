# Sheet

Part of the Dovetail design system (https://graham-goebel.github.io/Dovetail/), in the Feedback family. Files: [Sheet.jsx](https://graham-goebel.github.io/Dovetail/system/components/feedback/Sheet.jsx), [Sheet.d.ts](https://graham-goebel.github.io/Dovetail/system/components/feedback/Sheet.d.ts), [Sheet.md](https://graham-goebel.github.io/Dovetail/system/components/feedback/Sheet.md).

Live page: https://graham-goebel.github.io/Dovetail/components/Sheet.html

## Guidelines

A modal panel that rises from the bottom of a phone, inset from its edges, and opens as a centred dialog on a wide screen. It is the surface phone apps are built from: a detail view, a form, a picker, a settings page, or a sheet opened from another sheet.

### Use it when
- Showing detail or a short task on top of where the reader is, and they'll come straight back.
- Stepping into a sub-task from a sheet (a picker inside a form): open the next sheet with `onBack`.

### Don't use it when
- The reader must answer before anything else happens. Use `Dialog`.
- The panel should sit beside the page while the reader keeps working in it. Use `Drawer`.
- The content is a page someone will link to or come back to. Give it a route.

### Example
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

### Behaviour
- **Opening and closing.** It rises from the bottom on a phone and fades up on a wide screen. When `open` turns false it plays the exit, then unmounts. Reduced motion skips both.
- **The bar.** Close on the left, or back when `onBack` is set; the bar's small title fades in as the big one shrinks away over the first 72px of scroll; `action` goes on the right.
- **Actions.** `actions` float as chips along the bottom edge over a fade, scrolling sideways when they don't fit. Mark at most one `primary`. Use `footer` instead for a row of Buttons.
- **Dismissal.** The close button, Escape, the scrim, or on touch a drag down from the top of the sheet all call `onClose` with the reason. A drag right calls `onBack`. The sheet never closes itself: set `open` in response.

### Tokens
Shares the overlay tokens with Dialog: `--dt-dialog-bg`, `--dt-dialog-fg`, `--dt-dialog-radius`, `--dt-dialog-scrim`, `--dt-dialog-width-sm|md|lg` and `--dt-dialog-max-height`. Its own are `--dt-sheet-inset` (the gap to a phone's edges), `--dt-sheet-top-gap` (the page left showing above it), `--dt-sheet-padding`, `--dt-sheet-button-size`, `--dt-sheet-button-bg` and `--dt-sheet-shadow`.

### Accessibility
- It is a `role="dialog"` with `aria-modal`, named by `title` (or `label` when there is no title).
- Focus moves to the close or back button on open, is kept inside the sheet while it is open, and returns to whatever opened it on close.
- The page behind stops scrolling while it is open.
- Drag gestures are a shortcut, never the only way: close and back are always buttons.

### Content
Eyebrow is a few words. Title is the thing's name. Description is one sentence. Chip labels are verbs.

## Props

```ts
import * as React from "react";

/** One action chip along the bottom of a sheet. */
export interface SheetAction {
  /** The chip's text. Also its key, so keep labels unique within a sheet. */
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** An icon before the label, drawn at `--dt-size-icon-sm`. */
  icon?: React.ReactNode;
  /** Fills the chip with the action colour. Use it for one chip at most. */
  primary?: boolean;
  disabled?: boolean;
}

/**
 * A modal panel that rises from the bottom of a phone, inset from its edges,
 * and opens as a centred dialog on a wide screen. A sticky bar holds close
 * (or back) and an optional action; the big title shrinks into the bar as the
 * sheet scrolls. On touch, a drag down from the top closes it, and a drag
 * right goes back when `onBack` is set.
 */
export interface SheetProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Whether the sheet is showing. It animates out before it unmounts. */
  open: boolean;
  /**
   * Called when the reader dismisses the sheet, with how they did it. Set
   * `open` to false in response; the sheet does not close itself.
   */
  onClose?: (reason: "close" | "escape" | "scrim" | "swipe") => void;
  /**
   * Makes this a sheet opened from another: the leading button becomes a back
   * arrow, close moves to the right (unless `action` is set), and a drag right
   * calls this.
   */
  onBack?: () => void;
  /** The big title. Also the accessible name, and the small title in the bar once scrolled. */
  title?: React.ReactNode;
  /** A short line above the title: the item's type, a date, a count. */
  eyebrow?: React.ReactNode;
  /** One sentence under the title. */
  description?: React.ReactNode;
  /** The bar's trailing slot, usually one small Button such as Save or Done. */
  action?: React.ReactNode;
  /**
   * Chips pinned along the bottom edge, scrolling sideways when they don't
   * fit. Takes precedence over `footer`.
   */
  actions?: SheetAction[];
  /** A footer pinned to the bottom edge, for a row of Buttons. Ignored when `actions` is set. */
  footer?: React.ReactNode;
  /** Width on a wide screen, from `--dt-dialog-width-*`. Phones always use the full width less the inset. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Accessible name when there is no title. */
  label?: string;
  children?: React.ReactNode;
}

export declare function Sheet(props: SheetProps): JSX.Element | null;
```

## Tokens it reads

| Token | Tier | Declared as |
| --- | --- | --- |
| `--dt-dialog-bg` | component | `var(--dt-surface-overlay)` |
| `--dt-dialog-border-color` | component | `var(--dt-border-subtle)` |
| `--dt-dialog-fg` | component | `var(--dt-text-primary)` |
| `--dt-dialog-max-height` | component | `85vh` |
| `--dt-dialog-radius` | component | `var(--dt-radius-overlay)` |
| `--dt-dialog-scrim` | component | `var(--dt-surface-scrim)` |
| `--dt-dialog-width-lg` | component | `720px` |
| `--dt-dialog-width-md` | component | `520px` |
| `--dt-dialog-width-sm` | component | `400px` |
| `--dt-sheet-button-bg` | component | `var(--dt-surface-sunken)` |
| `--dt-sheet-button-size` | component | `var(--dt-size-control-sm)` |
| `--dt-sheet-inset` | component | `var(--dt-space-inset-xs)` |
| `--dt-sheet-padding` | component | `var(--dt-space-inset-xl)` |
| `--dt-sheet-shadow` | component | `var(--dt-elevation-4)` |
| `--dt-sheet-top-gap` | component | `var(--dt-space-stack-2xl)` |
| `--dt-border-width-default` | semantic | `var(--dt-dim-hair)` |
| `--dt-radius-pill` | semantic | `var(--dt-radius-raw-full)` |
| `--dt-size-control-md` | semantic | `var(--dt-dim-10)` |
| `--dt-size-icon-sm` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inline-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inline-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-inset-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-inset-md` | semantic | `var(--dt-dim-4)` |
| `--dt-space-inset-sm` | semantic | `var(--dt-dim-3)` |
| `--dt-space-inset-xl` | semantic | `var(--dt-dim-8)` |
| `--dt-space-inset-xs` | semantic | `var(--dt-dim-2)` |
| `--dt-space-stack-2xs` | semantic | `var(--dt-dim-1)` |
| `--dt-space-stack-lg` | semantic | `var(--dt-dim-6)` |
| `--dt-surface-action` | semantic | `var(--dt-color-neutral-900)` |
| `--dt-text-body-md-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-body-md-line` | semantic | `var(--dt-line-height-md)` |
| `--dt-text-body-md-size` | semantic | `var(--dt-font-size-md)` |
| `--dt-text-body-sm-line` | semantic | `var(--dt-line-height-sm)` |
| `--dt-text-body-sm-size` | semantic | `var(--dt-font-size-sm)` |
| `--dt-text-heading-lg-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-heading-lg-line` | semantic | `var(--dt-line-height-3xl)` |
| `--dt-text-heading-lg-size` | semantic | `var(--dt-font-size-3xl)` |
| `--dt-text-heading-lg-tracking` | semantic | `var(--dt-tracking-tight)` |
| `--dt-text-heading-xs-family` | semantic | `var(--dt-font-family-sans)` |
| `--dt-text-on-action` | semantic | `var(--dt-color-white)` |
| `--dt-text-secondary` | semantic | `var(--dt-color-neutral-600)` |
| `--dt-text-tertiary` | semantic | `var(--dt-color-neutral-500)` |
| `--dt-z-overlay` | semantic | `300` |
| `--dt-font-family-sans` | primitive | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| `--dt-font-weight-medium` | primitive | `500` |
| `--dt-font-weight-regular` | primitive | `400` |
| `--dt-sheet-p` | none | not declared |

## Source

```jsx
import React from "react";

/* The sheet the phone apps are built from: a panel that rises from the
   bottom of a phone, inset from its edges, and opens as a centred dialog on a
   wide screen. A sticky bar carries close (or back, for a sheet opened from
   another) and an optional action; a big title under it shrinks into the bar
   as the sheet scrolls. Actions float along the bottom as chips, or a footer
   holds buttons. On touch, a drag down from the top closes it and a drag
   right goes back.

   Styles are inline and read tokens, so motion that needs keyframes runs
   through the Web Animations API instead, and stops for reduced motion. */

const NARROW = "(max-width: 699px)";
const EASE = "cubic-bezier(.2,.8,.2,1)";

const WIDTHS = { sm: "var(--dt-dialog-width-sm)", md: "var(--dt-dialog-width-md)", lg: "var(--dt-dialog-width-lg)" };

function useMedia(query) {
  const get = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches;
  const [on, setOn] = React.useState(get);
  React.useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(query);
    const sync = () => setOn(m.matches);
    sync();
    if (m.addEventListener) m.addEventListener("change", sync);
    else m.addListener(sync);
    return () => (m.removeEventListener ? m.removeEventListener("change", sync) : m.removeListener(sync));
  }, [query]);
  return on;
}

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ width: "var(--dt-size-icon-sm)", height: "var(--dt-size-icon-sm)", display: "block" }}>
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
);
const CLOSE = ["M6 6l12 12", "M18 6 6 18"];
const BACK = ["M19.5 12h-15", "m10.5 6-6 6 6 6"];

const roundButton = {
  appearance: "none", border: 0, cursor: "pointer", flex: "none",
  display: "grid", placeItems: "center",
  width: "var(--dt-sheet-button-size)", height: "var(--dt-sheet-button-size)",
  borderRadius: "var(--dt-radius-pill)",
  background: "var(--dt-sheet-button-bg)", color: "var(--dt-dialog-fg)",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  onBack,
  title,
  eyebrow,
  description,
  action,
  actions,
  footer,
  size = "md",
  label,
  children,
  style,
  ...rest
}) {
  const narrow = useMedia(NARROW);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const [mounted, setMounted] = React.useState(open);
  const box = React.useRef(null);
  const scrim = React.useRef(null);
  const titleId = React.useId ? React.useId() : "dt-sheet-title";

  /* Mount on open; on close, play the exit and then unmount. */
  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    const el = box.current;
    if (!el || reduce || !el.animate) {
      setMounted(false);
      return undefined;
    }
    const out = narrow
      ? [{ transform: "none" }, { transform: "translateY(100%)" }]
      : [{ transform: "none", opacity: 1 }, { transform: "translateY(20px) scale(.98)", opacity: 0 }];
    const a = el.animate(out, { duration: narrow ? 260 : 200, easing: "cubic-bezier(.5,0,.9,.6)", fill: "forwards" });
    if (scrim.current) scrim.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
    a.onfinish = () => setMounted(false);
    return () => { a.onfinish = null; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Entry motion, focus, Escape, a focus trap and a still page behind. */
  React.useEffect(() => {
    if (!open || !mounted) return undefined;
    const el = box.current;
    const prev = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (el && !reduce && el.animate) {
      el.animate(
        narrow ? [{ transform: "translateY(100%)" }, { transform: "none" }] : [{ transform: "translateY(28px) scale(.98)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: narrow ? 420 : 300, easing: EASE }
      );
      if (scrim.current) scrim.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
    }
    if (el) {
      el.scrollTop = 0;
      el.style.setProperty("--dt-sheet-p", "0");
      const first = el.querySelector("[data-sheet-lead]");
      (first || el).focus({ preventScroll: true });
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose && onClose("escape");
      } else if (e.key === "Tab" && el) {
        const items = Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), (n) => n.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The title shrinks into the bar over the first 72px of scroll. */
  const onScroll = (e) => {
    e.currentTarget.style.setProperty("--dt-sheet-p", String(Math.min(1, e.currentTarget.scrollTop / 72)));
  };

  /* Touch: down from the top closes, right goes back when there is a back. */
  const drag = React.useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1 || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { drag.current = null; return; }
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, t: Date.now(), top: box.current.scrollTop <= 0, axis: null, dx: 0, dy: 0 };
  };
  const onTouchMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const t = e.touches[0];
    d.dx = t.clientX - d.x;
    d.dy = t.clientY - d.y;
    if (!d.axis) {
      if (d.top && d.dy > 8 && d.dy > Math.abs(d.dx)) d.axis = "y";
      else if (onBack && d.dx > 10 && d.dx > Math.abs(d.dy) * 1.3) d.axis = "x";
      else { if (Math.abs(d.dx) > 14 || d.dy < -6) drag.current = null; return; }
    }
    const el = box.current;
    if (d.axis === "y") el.style.transform = `translateY(${Math.max(0, d.dy)}px)`;
    else el.style.transform = `translateX(${Math.max(0, d.dx)}px)`;
  };
  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    const el = box.current;
    if (!d || !d.axis || !el) return;
    const ms = Math.max(1, Date.now() - d.t);
    const spring = () => {
      el.style.transition = "transform .2s ease";
      el.style.transform = "";
      setTimeout(() => { el.style.transition = ""; }, 220);
    };
    if (d.axis === "y" && (d.dy > Math.min(140, el.offsetHeight * 0.3) || (d.dy / ms > 0.6 && d.dy > 30))) {
      el.style.transform = "";
      onClose && onClose("swipe");
    } else if (d.axis === "x" && (d.dx > Math.min(110, el.offsetWidth * 0.28) || (d.dx / ms > 0.5 && d.dx > 40))) {
      el.style.transform = "";
      onBack();
    } else spring();
  };

  if (!mounted) return null;

  const hasActions = Array.isArray(actions) && actions.length > 0;
  const trailing = action || (onBack ? (
    <button type="button" onClick={() => onClose && onClose("close")} aria-label="Close" style={roundButton}><Icon d={CLOSE} /></button>
  ) : <span />);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--dt-z-overlay)", display: "flex", alignItems: narrow ? "flex-end" : "center", justifyContent: "center" }}>
      <div ref={scrim} onClick={() => onClose && onClose("scrim")} style={{ position: "absolute", inset: 0, background: "var(--dt-dialog-scrim)" }} />
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          position: "relative", boxSizing: "border-box",
          width: narrow ? "calc(100% - 2 * var(--dt-sheet-inset))" : "100%",
          maxWidth: narrow ? "none" : WIDTHS[size] || WIDTHS.md,
          maxHeight: narrow ? "calc(100% - var(--dt-sheet-top-gap))" : "var(--dt-dialog-max-height)",
          marginBottom: narrow ? "calc(var(--dt-sheet-inset) + env(safe-area-inset-bottom, 0px))" : 0,
          overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain",
          padding: "0 var(--dt-sheet-padding)",
          paddingBottom: hasActions || footer ? 0 : "var(--dt-sheet-padding)",
          background: "var(--dt-dialog-bg)", color: "var(--dt-dialog-fg)",
          borderRadius: "var(--dt-dialog-radius)",
          boxShadow: "var(--dt-sheet-shadow)",
          outline: "none",
          ...style,
        }}
        {...rest}
      >
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "grid", gridTemplateColumns: action ? "auto minmax(0, 1fr) auto" : "var(--dt-sheet-button-size) minmax(0, 1fr) var(--dt-sheet-button-size)",
          alignItems: "center", gap: "var(--dt-space-inline-sm)",
          margin: "0 calc(-1 * var(--dt-space-inset-sm))",
          padding: "var(--dt-space-inset-md) var(--dt-space-inset-sm) var(--dt-space-inset-xs)",
          background: "var(--dt-dialog-bg)",
          boxShadow: "0 var(--dt-border-width-default) 0 color-mix(in oklab, var(--dt-dialog-border-color) calc(var(--dt-sheet-p, 0) * 100%), transparent)",
        }}>
          {onBack ? (
            <button type="button" data-sheet-lead onClick={onBack} aria-label="Back" style={roundButton}><Icon d={BACK} /></button>
          ) : (
            <button type="button" data-sheet-lead onClick={() => onClose && onClose("close")} aria-label="Close" style={roundButton}><Icon d={CLOSE} /></button>
          )}
          <p aria-hidden="true" style={{
            margin: 0, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontFamily: "var(--dt-text-heading-xs-family)", fontSize: "var(--dt-text-body-md-size)", fontWeight: "var(--dt-font-weight-medium)",
            opacity: "clamp(0, calc((var(--dt-sheet-p, 0) - .6) * 2.5), 1)",
          }}>{title}</p>
          <div style={{ justifySelf: "end" }}>{trailing}</div>
        </div>

        {(eyebrow || title || description) && (
          <div style={{
            padding: "var(--dt-space-inset-2xs, 4px) 0 var(--dt-space-inset-sm)",
            transform: "scale(calc(1 - .08 * var(--dt-sheet-p, 0)))", transformOrigin: "0 0",
            opacity: "calc(1 - .8 * var(--dt-sheet-p, 0))",
          }}>
            {eyebrow && <p style={{ margin: "0 0 2px", fontSize: "var(--dt-text-body-sm-size)", color: "var(--dt-text-tertiary)" }}>{eyebrow}</p>}
            {title && <h2 id={titleId} style={{
              margin: 0, fontFamily: "var(--dt-text-heading-lg-family)", fontSize: "var(--dt-text-heading-lg-size)",
              lineHeight: "var(--dt-text-heading-lg-line)", fontWeight: "var(--dt-font-weight-regular)", letterSpacing: "var(--dt-text-heading-lg-tracking)",
            }}>{title}</h2>}
            {description && <p style={{ margin: "var(--dt-space-stack-2xs) 0 0", fontSize: "var(--dt-text-body-sm-size)", lineHeight: "var(--dt-text-body-sm-line)", color: "var(--dt-text-secondary)" }}>{description}</p>}
          </div>
        )}

        <div style={{ fontFamily: "var(--dt-text-body-md-family)", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)" }}>{children}</div>

        {hasActions && (
          <div role="toolbar" aria-label="Actions" style={{
            position: "sticky", bottom: 0, zIndex: 2,
            display: "flex", gap: "var(--dt-space-inline-xs)", overflowX: "auto", scrollbarWidth: "none",
            margin: "var(--dt-space-stack-lg) calc(-1 * var(--dt-sheet-padding)) 0",
            padding: "var(--dt-space-inset-xl) var(--dt-sheet-padding) var(--dt-space-inset-sm)",
            background: "linear-gradient(to top, var(--dt-dialog-bg) 58%, transparent)",
          }}>
            {actions.map((a) => (
              <button key={a.label} type="button" onClick={a.onClick} disabled={a.disabled} style={{
                appearance: "none", border: 0, cursor: a.disabled ? "default" : "pointer", flex: "none",
                display: "inline-flex", alignItems: "center", gap: "var(--dt-space-inline-xs)",
                height: "var(--dt-size-control-md)", padding: "0 var(--dt-space-inset-md)",
                borderRadius: "var(--dt-radius-pill)", whiteSpace: "nowrap",
                background: a.primary ? "var(--dt-surface-action)" : "var(--dt-sheet-button-bg)",
                color: a.primary ? "var(--dt-text-on-action)" : "var(--dt-dialog-fg)",
                fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-text-body-sm-size)",
                opacity: a.disabled ? 0.4 : 1,
              }}>{a.icon}{a.label}</button>
            ))}
          </div>
        )}

        {footer && !hasActions && (
          <div style={{
            position: "sticky", bottom: 0, zIndex: 2,
            display: "flex", justifyContent: "flex-end", gap: "var(--dt-space-inline-sm)", flexWrap: "wrap",
            margin: "var(--dt-space-stack-lg) calc(-1 * var(--dt-sheet-padding)) 0",
            padding: "var(--dt-space-inset-md) var(--dt-sheet-padding)",
            background: "var(--dt-dialog-bg)",
            borderTop: "var(--dt-border-width-default) solid var(--dt-dialog-border-color)",
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
}
```

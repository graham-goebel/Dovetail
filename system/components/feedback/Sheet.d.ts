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

import * as React from "react";

/** Modal panel that slides in from an edge. */
export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  open: boolean;
  onClose?: () => void;
  /** Header, and the accessible name unless `label` is given. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer slot, usually the action buttons. */
  footer?: React.ReactNode;
  /** @default "right" */
  side?: "right" | "left" | "bottom";
  /** Applies to left and right drawers. @default 380 */
  width?: number | string;
  /** The panel's fill. "glass" and "glass-strong" let what's behind show through, blurred. "brand" and "brand-muted" are the brand fills, with the text, links, borders and buttons that read on them (the same as Section's tones), for a menu opened from a brand bar. @default "raised" */
  surface?: "raised" | "glass" | "glass-strong" | "brand" | "brand-muted";
  /** Accessible name instead of the title, or for a drawer with no title. */
  label?: string;
}

export declare function Drawer(props: DrawerProps): React.JSX.Element | null;

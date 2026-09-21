import * as React from "react";

/** Modal panel that slides in from an edge. */
export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose?: () => void;
  /** Header text. Also the accessible name when it is a string. */
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Footer slot, usually the action buttons. */
  footer?: React.ReactNode;
  /** @default "right" */
  side?: "right" | "left" | "bottom";
  /** Applies to left and right drawers. @default 380 */
  width?: number | string;
  /** Accessible name when title is not a string. */
  label?: string;
}

export declare function Drawer(props: DrawerProps): JSX.Element | null;

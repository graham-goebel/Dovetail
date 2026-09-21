import * as React from "react";

/** Anchored panel for secondary content and controls. */
export interface PopoverProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The element that opens the popover. Cloned with aria-expanded. */
  trigger: React.ReactNode;
  children?: React.ReactNode;
  /** Controlled open state. Omit to let the component manage it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @default "bottom-start" */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  /** Accessible name for the panel. Required. */
  label: string;
  /** @default 260 */
  width?: number | string;
}

export declare function Popover(props: PopoverProps): JSX.Element;

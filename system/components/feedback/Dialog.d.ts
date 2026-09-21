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

export declare function Dialog(props: DialogProps): JSX.Element | null;

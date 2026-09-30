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

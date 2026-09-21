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

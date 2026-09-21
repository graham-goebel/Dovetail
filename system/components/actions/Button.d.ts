import * as React from "react";

/**
 * The system's primary action control.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary is the single main action in a view; everything else is secondary, ghost, or danger. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Shows a spinner and blocks interaction. Keep the label — never swap it for "Loading…". */
  loading?: boolean;
  fullWidth?: boolean;
  /** Icon before the label. 16px, currentColor. */
  iconStart?: React.ReactNode;
  /** Icon after the label. Reserve for external links and disclosure. */
  iconEnd?: React.ReactNode;
  /** Render as another element, e.g. "a" for a link that looks like a button. @default "button" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;

import * as React from "react";

/**
 * The system's primary action control.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary is the single main action in a view; everything else is secondary, ghost, or danger. brand and brand-secondary fill the button with the primary or secondary brand colour, with text that passes contrast on it. Inside a Section toned brand-muted or secondary-muted, primary and secondary take the brand colours on their own. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "brand" | "brand-secondary";
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
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): React.JSX.Element;

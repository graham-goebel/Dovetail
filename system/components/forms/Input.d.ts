import * as React from "react";

/**
 * Single-line text field.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Sets aria-invalid and the error border. */
  error?: string;
  required?: boolean;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Leading icon, 20px. Decorative — it is aria-hidden. */
  iconStart?: React.ReactNode;
}

export declare function Input(props: InputProps): JSX.Element;

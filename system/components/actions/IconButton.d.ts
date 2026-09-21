import * as React from "react";

/** Icon-only button. The accessible label is required, not optional. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name and tooltip. Required — an unlabelled icon button is a bug. */
  label: string;
  /** @default "ghost" */
  variant?: "ghost" | "solid";
  /** @default "md" */
  size?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
  /** A single icon, 20px, currentColor. */
  children: React.ReactNode;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;

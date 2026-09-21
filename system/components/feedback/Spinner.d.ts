import * as React from "react";

/** Indeterminate loading indicator. */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Announced to screen readers. @default "Loading" */
  label?: string;
  /** Render inline with text rather than as a block. @default false */
  inline?: boolean;
}

export declare function Spinner(props: SpinnerProps): JSX.Element;

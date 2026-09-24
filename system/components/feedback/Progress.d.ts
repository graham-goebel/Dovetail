import * as React from "react";

/** Determinate or indeterminate progress bar. */
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value. Omit for an indeterminate bar. */
  value?: number;
  /** @default 100 */
  max?: number;
  /** Visible label above the bar. Also the accessible name. */
  label?: React.ReactNode;
  /** Show the percentage on the right. @default false */
  showValue?: boolean;
  /** @default "primary" */
  tone?: "primary" | "success" | "warning" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
}

export declare function Progress(props: ProgressProps): JSX.Element;

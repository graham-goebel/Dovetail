import * as React from "react";

export interface Step {
  id?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Shows position in a linear, multi-step task. */
export interface StepperProps extends React.HTMLAttributes<HTMLElement> {
  steps: Step[];
  /** Index of the active step, 0-based. Earlier steps render as complete. */
  current: number;
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical";
  /** @default "Progress" */
  label?: string;
}

export declare function Stepper(props: StepperProps): JSX.Element;

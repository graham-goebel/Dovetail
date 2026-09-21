import * as React from "react";

/** Groups related buttons and manages their spacing or shared edges. */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accessible group name, e.g. "Text alignment". Required. */
  label: string;
  /** Join the buttons into one segmented control with shared edges. @default false */
  attached?: boolean;
  children?: React.ReactNode;
}

export declare function ButtonGroup(props: ButtonGroupProps): JSX.Element;

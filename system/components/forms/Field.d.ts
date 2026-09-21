import * as React from "react";

/** Label, control, hint, and error wrapper. Every form control in a form goes inside one. */
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  /** Helper text shown below the control. */
  hint?: string;
  /** Replaces the hint and renders in an alert live region. */
  error?: string;
  /** Adds a required marker to the label. Also set the required attribute on the control. */
  required?: boolean;
  /** id of the control this labels. */
  htmlFor?: string;
  children?: React.ReactNode;
}

export declare function Field(props: FieldProps): JSX.Element;

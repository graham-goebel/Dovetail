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
  /** id for the label element, so a control that isn't a single input (a group) can point aria-labelledby at it. */
  labelId?: string;
  /** id for the hint or error line, so a control can point aria-describedby at it. */
  messageId?: string;
  children?: React.ReactNode;
}

export declare function Field(props: FieldProps): React.JSX.Element;

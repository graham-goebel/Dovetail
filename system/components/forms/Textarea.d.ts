import * as React from "react";

/** Multi-line text field. Resizes vertically only. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** @default 4 */
  rows?: number;
}

export declare function Textarea(props: TextareaProps): JSX.Element;

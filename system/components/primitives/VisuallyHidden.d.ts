import * as React from "react";

/** Content available to screen readers but not shown. Never use it to hide something from everyone. */
export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLElement> {
  /** @default "span" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function VisuallyHidden(props: VisuallyHiddenProps): React.JSX.Element;

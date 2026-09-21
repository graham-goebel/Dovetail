import * as React from "react";

/** Monospace code, inline or as a block. */
export interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  /** Renders a scrollable <pre> block instead of inline <code>. @default false */
  block?: boolean;
  /** Caption above a block, e.g. a filename. Ignored when inline. */
  label?: React.ReactNode;
}

export declare function Code(props: CodeProps): JSX.Element;

import * as React from "react";

/** Horizontal layout. Wraps by default so button rows survive narrow viewports. */
export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the inline axis of the space scale. @default "sm" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** @default "center" */
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Allow children to wrap onto a new row. @default true */
  wrap?: boolean;
  /** @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Inline(props: InlineProps): JSX.Element;

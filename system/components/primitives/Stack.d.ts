import * as React from "react";

/** Vertical layout. Owns the gap between children so they never set their own margins. */
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the stack axis of the space scale. @default "md" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Element to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Stack(props: StackProps): JSX.Element;

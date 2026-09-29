import * as React from "react";

/** Vertical layout. Owns the gap between children so they never set their own margins. */
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the stack axis of the space scale. @default "md" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** How closely the things either side of this gap belong together, from the layout layers: `related` (parts of one thing), `group` (members of a set), `block` (one unit from the next), `section` (a theme from the next). Sets the gap from `--dt-layout-stack-*`, which the layout's character moves as one, and wins over `gap`. */
  layer?: "related" | "group" | "block" | "section";
  /** The layout's character for this element and everything inside it: `tight` (technical), `balanced` or `open` (breathing room). Sets `data-layout`, which re-declares the layer tokens here. Inherited from the page when not set. */
  spacing?: "tight" | "balanced" | "open";
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Element to render. @default "div" */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Stack(props: StackProps): JSX.Element;

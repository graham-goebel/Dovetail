import * as React from "react";

/** Horizontal layout. Wraps by default so button rows survive narrow viewports. */
export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
  /** Gap from the inline axis of the space scale. @default "sm" */
  gap?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** How closely the things either side of this gap belong together, from the layout layers: `related` (parts of one thing), `group` (members of a set), `block` (one unit from the next), `section` (a theme from the next). Sets the gap from `--dt-layout-inline-*`, which the layout's character moves as one, and wins over `gap`. */
  layer?: "related" | "group" | "block" | "section";
  /** The layout's character for this element and everything inside it: `tight` (technical), `balanced` or `open` (breathing room). Sets `data-layout`, which re-declares the layer tokens here. Inherited from the page when not set. */
  spacing?: "tight" | "balanced" | "open";
  /** @default "center" */
  align?: React.CSSProperties["alignItems"];
  justify?: React.CSSProperties["justifyContent"];
  /** Allow children to wrap onto a new row. @default true */
  wrap?: boolean;
  /** @default "div" */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

export declare function Inline(props: InlineProps): React.JSX.Element;

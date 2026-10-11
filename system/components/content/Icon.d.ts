import * as React from "react";

/** One glyph from Dovetail Icons v1, the system's own library of 320 icons. */
export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "name"> {
  /** The icon's name in the library, such as "home", "search" or "arrow-right". Icon.names lists them all. Unknown names draw "star". @default "star" */
  name?: string;
  /** Size from --dt-size-icon-*: xs 12, sm 16, md 20, lg 24, xl 32. xs and sm use the drawings made for the 16px grid. @default "lg" */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Accessible name. Give one when the icon means something on its own; leave it out when text beside it says the same, and the icon is hidden from screen readers. */
  label?: string;
}

export declare function Icon(props: IconProps): React.JSX.Element;
export declare namespace Icon {
  /** Every icon name, in catalogue order. */
  const names: string[];
  /** The names by category, as [category, names] pairs. */
  const groups: Array<[string, string[]]>;
}

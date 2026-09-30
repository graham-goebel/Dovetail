import * as React from "react";

/** A titled group of menu items: "Starters", "Noodles", "Drinks". */
export interface MenuSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The section's heading. */
  title: string;
  /** One line under the heading: "Served with jasmine rice". */
  description?: string;
  /** id of the section element, the anchor a category nav links to (href="#noodles"). */
  id?: string;
  /**
   * list: dishes stacked with dividers, the phone layout. grid: dishes as cards, two
   * up when there is room and one up on a phone. Passed on to each MenuItem child.
   * @default "list"
   */
  layout?: "list" | "grid";
  /** Level of the heading element. Each MenuItem's name is one level below. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  /** The MenuItems. Each becomes an item of a list, so its count is announced. */
  children?: React.ReactNode;
}

export declare function MenuSection(props: MenuSectionProps): React.JSX.Element;

import * as React from "react";
import type { StoreHeaderProps } from "../commerce/StoreHeader";
import type { FulfilmentOption } from "../commerce/FulfilmentToggle";
import type { MenuItemProps } from "../commerce/MenuItem";

/** Delivery or pickup, shown as a FulfilmentToggle under the store's header. */
export interface MenuBlockFulfilment {
  /** The chosen option's value. Controlled. */
  value: string;
  /** Called with the newly chosen value. */
  onChange: (value: string) => void;
  /** The segments. @default Delivery and Pickup */
  options?: FulfilmentOption[];
  /** The toggle's accessible name. @default "How to get your order" */
  label?: string;
}

/** One dish in a MenuBlock section: MenuItem's props plus an id. */
export type MenuBlockItem = MenuItemProps & {
  /** Unique within the menu. Passed back to onItemSelect, onItemAdd and onQuantityChange, and the key into quantities. */
  id: string;
};

/** One category of the menu, with a pill in the sticky category nav. */
export interface MenuBlockSection {
  /** Unique within the menu. Also the section's anchor, prefixed so two menus on a page never share an id. */
  id: string;
  /** The heading, and the pill's label: "Popular", "Noodles", "Drinks". */
  title: string;
  /** One line under the heading: "Served with jasmine rice". */
  description?: string;
  /** The dishes, in order. */
  items: MenuBlockItem[];
}

/** A restaurant's ordering page body: StoreHeader, an optional FulfilmentToggle, a sticky category nav and the menu. */
export interface MenuBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The store, rendered as a StoreHeader at the top. Its headingLevel defaults to 1: the name is the page's heading. */
  store?: StoreHeaderProps;
  /** Shows a FulfilmentToggle under the header. Omit when the store offers one way only. */
  fulfilment?: MenuBlockFulfilment;
  /** The menu's categories, each a MenuSection with a pill in the category nav (shown when there are two or more). */
  sections: MenuBlockSection[];
  /** Makes each dish's row a button; called with the dish's and its section's ids. Usually opens a Sheet of options. */
  onItemSelect?: (itemId: string, sectionId: string) => void;
  /** Shows each dish's add button; called with the dish's and its section's ids. */
  onItemAdd?: (itemId: string, sectionId: string) => void;
  /** How many of each dish (by id) are in the basket. Overrides an item's own quantity. */
  quantities?: Record<string, number>;
  /** With a quantity above 0, shows the dish's in-basket stepper; called with the dish's id and the next quantity (0 removes it). */
  onQuantityChange?: (itemId: string, next: number) => void;
  /** list: dishes stacked with dividers, the phone layout. grid: dishes as cards, two up when there is room. @default "list" */
  layout?: "list" | "grid";
  /** ISO 4217 currency code for the store and every dish that does not set its own. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the store and every dish that does not set its own. Set it when server rendering. */
  locale?: string;
  /** Accessible name of the category nav. @default "Menu categories" */
  navLabel?: string;
  /**
   * How far from the top of the scrolling area the category nav sticks, as a CSS length. Inside an
   * AppShell, pass "var(--dt-appshell-bar-height)" so it sits under the top bar. @default "0px"
   */
  stickyTop?: string;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Padding above and below, passed to Section: `sm`, `md`, `lg`, `xl` or `none`, from the module padding steps; `default` is `md` and `compact` is `sm`. @default "default" */
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "default" | "compact";
  /** Padding above, when it differs from `spacing`. */
  spacingTop?: "none" | "sm" | "md" | "lg" | "xl";
  /** Padding below, when it differs from `spacing`. */
  spacingBottom?: "none" | "sm" | "md" | "lg" | "xl";
  /** `full` spans the screen; `inset` sets the band in from the page edges with the container radius. Passed to Section. @default "full" */
  bleed?: "full" | "inset";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function MenuBlock(props: MenuBlockProps): React.JSX.Element;

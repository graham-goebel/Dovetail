import * as React from "react";

/** A small label on a dish. */
export interface MenuItemTag {
  /** Always shown, so colour is never the only signal: "Vegan", "Spicy", "Popular". */
  label: string;
  /** Picks the tag's colour tokens. spicy and popular also get an icon. @default "default" */
  kind?: "vegetarian" | "vegan" | "spicy" | "gluten-free" | "popular" | "new" | "default";
}

/** One dish on a menu: name, description, price, tags, a thumbnail and an add button. */
export interface MenuItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "children"> {
  /** The dish's name, rendered as a heading. */
  name: string;
  /** What is in it. Clamped to two lines. */
  description?: string;
  /** Price in major units, shown with Price. */
  price: number;
  /** Original price. When higher than price, it shows struck through. */
  compareAt?: number;
  /** ISO 4217 currency code. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Square thumbnail on the right, at --dt-menu-thumb-size. Its space is reserved before it loads. */
  image?: { src?: string; alt: string };
  /** Dietary and highlight tags, shown as small badges. */
  tags?: MenuItemTag[];
  /** Dims the dish, shows soldOutLabel and removes the add button and stepper. */
  soldOut?: boolean;
  /** How many are in the basket. Above 0 it shows quantityLabel as a badge, and a stepper when onQuantityChange is given. @default 0 */
  quantity?: number;
  /** Shows an add button, named `Add ${name}`. Usually opens a Sheet of ModifierGroups. */
  onAdd?: () => void;
  /** With quantity above 0, shows a QuantityStepper; its remove button calls this with 0. */
  onQuantityChange?: (next: number) => void;
  /** Makes the whole row a button that opens the dish's details. The add button stays a separate target. */
  onSelect?: () => void;
  /** list: a row in a list. grid: a card. Set by MenuSection; set it yourself only outside one. @default "list" */
  layout?: "list" | "grid";
  /** Level of the name's heading. MenuSection sets it one below its own. @default 3 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Accessible name of the add button. @default `Add ${name}` */
  addLabel?: string;
  /** Badge text for a sold-out dish. @default "Sold out" */
  soldOutLabel?: string;
  /** Badge text for the basket count. @default (n) => `${n} in basket` */
  quantityLabel?: (quantity: number) => string;
}

export declare function MenuItem(props: MenuItemProps): React.JSX.Element;

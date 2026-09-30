import * as React from "react";

/** A product image, with the alt text the page needs. */
export interface ProductCardImage {
  /** URL of the image. */
  src: string;
  /** What the image shows, e.g. "Green ceramic mug, side view". Pass "" when it would only repeat the name. */
  alt: string;
}

/** One colour a product comes in, shown as a dot. */
export interface ProductCardSwatch {
  /** The colour's name, read to a screen reader and shown as a tooltip: "Sand", "Forest green". */
  name: string;
  /** Any CSS colour from the product data, e.g. "#c8b79a". It is content, not a design token. */
  color: string;
}

/** A product in a grid, a carousel, a list or search results: picture, name, price and an optional action. */
export interface ProductCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "children" | "title"> {
  /** The product's name. It is the card's heading text and, with href, its one link. */
  name: string;
  /**
   * The product page. The name becomes the one link a screen reader hears, and a copy
   * stretches over the whole card for a pointer, as Card's href does. The action and the
   * quick-add button stay separately focusable and clickable above it.
   */
  href?: string;
  /** The product photo. Without one the frame keeps its space and shows the Image placeholder. */
  image?: ProductCardImage;
  /** Shape of the photo frame. "4:5" suits apparel; a number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /** The price in major units, passed to Price as amount. */
  price: number;
  /** The original price. When greater than price, the card shows a sale. */
  compareAt?: number;
  /** ISO 4217 currency code, passed to Price. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price and the review count. Set it when server rendering. */
  locale?: string;
  /** The average rating and, optionally, how many reviews it comes from. Shown as a small Rating. */
  rating?: { value: number; count?: number };
  /**
   * A flag over the top corner of the photo: "New", "-20%". A string becomes a solid neutral
   * Badge; pass a Badge of your own for another tone. Hidden while soldOut, whose label takes
   * its place.
   */
  badge?: React.ReactNode;
  /** A line under the name: the brand, or a summary of the variants ("3 sizes"). */
  subtitle?: string;
  /** Colours the product comes in, as small dots. Display only; choose a colour with VariantPicker. */
  swatches?: ProductCardSwatch[];
  /** How many swatches show before the rest collapse into "+3". @default 5 */
  maxSwatches?: number;
  /** Washes out the photo, shows soldOutLabel over it, and disables the quick-add button and the action. */
  soldOut?: boolean;
  /** The sold-out flag's text. @default "Sold out" */
  soldOutLabel?: string;
  /**
   * An action at the foot of the card, e.g. a Button that adds to the cart. It sits above the
   * stretched link. While soldOut it is cloned with disabled: true.
   */
  action?: React.ReactNode;
  /** Renders a compact add button over the photo's bottom corner and calls this when it is pressed. */
  onQuickAdd?: () => void;
  /** Accessible name of the quick-add button. @default `Add ${name} to cart` */
  quickAddLabel?: string;
  /** vertical stacks the photo over the text, for grids; horizontal puts it beside, for lists and search results. @default "vertical" */
  layout?: "vertical" | "horizontal";
  /** The element the card renders as, passed to Card: "article" or "li" in a list of products. @default "div" */
  as?: React.ElementType;
}

export declare function ProductCard(props: ProductCardProps): React.JSX.Element;

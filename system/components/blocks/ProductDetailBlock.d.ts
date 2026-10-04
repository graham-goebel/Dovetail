import * as React from "react";
import type { ProductGalleryImage } from "../commerce/ProductGallery";
import type { VariantPickerProps } from "../commerce/VariantPicker";

/** One collapsible section under the buy box: materials, shipping, returns. */
export interface ProductDetailSection {
  /** The section's heading, e.g. "Materials and care". */
  title: string;
  /** What it says: a paragraph, a list, a table. */
  content: React.ReactNode;
}

/** The top of a product page: a gallery beside a buy box with the name, price, variants, quantity and add to cart. */
export interface ProductDetailBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The product images, in order, shown in a ProductGallery. At least one. */
  images: ProductGalleryImage[];
  /** Accessible name of the gallery. @default `Images of ${name}` */
  galleryLabel?: string;
  /** Shape of the gallery images. A number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /** The product's name: the block's heading. */
  name: string;
  /** A line under the name: the brand, the colour, a short description. */
  subtitle?: string;
  /** The price in major units, passed to Price. Pass the price of the chosen variant. */
  price: number;
  /** The original price. When greater than price, the price shows as a sale. */
  compareAt?: number;
  /** ISO 4217 currency code, passed to Price. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the price and the review count. Set it when server rendering. */
  locale?: string;
  /** The average rating and, optionally, how many reviews it comes from. */
  rating?: { value: number; count?: number };
  /** A paragraph or two about the product. A string is set as secondary body text. */
  description?: React.ReactNode;
  /** One VariantPicker per option (colour, size), each spread from these props. The block holds no selection: pass value and onChange. */
  variants?: VariantPickerProps[];
  /** The quantity to add. Controlled. @default 1 */
  quantity?: number;
  /** Called with the next quantity. Shows a QuantityStepper above the add button when given. */
  onQuantityChange?: (next: number) => void;
  /** Highest quantity the stepper allows, e.g. the stock left. */
  maxQuantity?: number;
  /** Called when the add button is pressed. Not called while the button is disabled. */
  onAddToCart?: () => void;
  /** The add button's text. @default "Add to cart" */
  addToCartLabel?: string;
  /**
   * false disables the add button, e.g. while a required variant is unset. The block does not know
   * which variants are required: work it out from your selection and pass it here, with addToCartNote
   * saying what is missing. @default true
   */
  canAddToCart?: boolean;
  /** A line under the add button, linked to it by aria-describedby: "Choose a size", "Free delivery over $75". */
  addToCartNote?: React.ReactNode;
  /** Disables the add button and the stepper, and the button reads soldOutLabel. @default false */
  soldOut?: boolean;
  /** The add button's text while soldOut. @default "Sold out" */
  soldOutLabel?: string;
  /** Collapsible sections under the buy box, as an Accordion that allows several open. */
  details?: ProductDetailSection[];
  /** Badges above the name: "New", "Bestseller", "Low stock". */
  badges?: React.ReactNode;
  /** The name's heading level. The product page's h1 unless something above it is. @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
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

export declare function ProductDetailBlock(props: ProductDetailBlockProps): React.JSX.Element;

import * as React from "react";
import type { ProductCardProps } from "../commerce/ProductCard";

/** One product in a ProductGridBlock: ProductCard's props, plus a stable id. */
export interface ProductGridItem extends ProductCardProps {
  /** A stable, unique id, such as the product's handle or SKU. It is the React key and is not rendered. */
  id: string;
}

/** A header over a responsive grid of ProductCards: a collection, search results, "You may also like". */
export interface ProductGridBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  /** The title's type size, on the system's heading and display scale. @default "heading-lg" */
  titleSize?: "display-lg" | "display-md" | "display-sm" | "heading-xl" | "heading-lg" | "heading-md";
  /** One or two sentences under the title. */
  lead?: React.ReactNode;
  /** The products, each spread into a ProductCard rendered as a list item. Give every one an href so the card is a link. */
  products: ProductGridItem[];
  /** Columns on a wide screen. Each card keeps a least width, so the grid gives up columns as the width runs out and shows two on a phone. @default 4 */
  columns?: 2 | 3 | 4;
  /** Beside the header, at its end: a "View all" Link, a sort Select. */
  action?: React.ReactNode;
  /** Shown instead of the grid when products is empty. @default an EmptyState, "No products to show" */
  emptyState?: React.ReactNode;
  /** The title's heading level, for the page outline. @default 2 */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** The band's surface, passed to Section. @default "base" */
  tone?: "base" | "subtle" | "brand" | "brand-muted" | "secondary" | "secondary-muted";
  /** Scopes dark mode to this block, so everything inside reads light on dark. */
  dark?: boolean;
  /** Layers the texture token over the tone. */
  texture?: boolean;
  /** Vertical padding: the section rhythm, the compact one, or none. @default "default" */
  spacing?: "default" | "compact" | "none";
  /** The inner column's width. @default "default" */
  width?: "narrow" | "default" | "wide" | "full";
}

export declare function ProductGridBlock(props: ProductGridBlockProps): React.JSX.Element;

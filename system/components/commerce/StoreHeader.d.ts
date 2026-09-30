import * as React from "react";

/** An image with its alternative text. */
export interface StoreHeaderImage {
  /** Image URL. Without one the reserved space shows the empty surface. */
  src?: string;
  /** Alternative text. Pass "" when the picture is decoration and says nothing the name does not. */
  alt: string;
}

/** Whether the store takes orders now, and the words for it. */
export interface StoreHeaderStatus {
  /** false greys the cover and logo, lays the cover under a scrim and turns the label the danger colour. */
  open: boolean;
  /** What to show, and what a screen reader hears: "Open until 10pm", "Closed · opens 11am". */
  label: string;
}

/** The top of a restaurant or store page: cover, logo, name, rating, facts, delivery and opening status. */
export interface StoreHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The store's name, rendered as the heading. */
  name: string;
  /** Cover image. Its space (3:1, at most --dt-store-cover-max-height tall) is reserved before it loads. Omit for no cover. */
  image?: StoreHeaderImage;
  /** Square logo. With a cover it overlaps the cover's lower edge; without one it sits above the name. */
  logo?: StoreHeaderImage;
  /** Average rating and review count, shown as a small Rating. */
  rating?: { value: number; count?: number };
  /** Short facts after the rating, separated by middle dots: "Thai", "$$", "1.2 mi". */
  meta?: string[];
  /** Delivery or preparation time, shown with a clock: "25–35 min". */
  deliveryTime?: string;
  /** Delivery fee in major units, shown with Price. 0 shows freeDeliveryLabel. Omit to show no fee. */
  deliveryFee?: number;
  /** ISO 4217 currency code for the fee. @default "USD" */
  currency?: string;
  /** BCP 47 locale for the fee and the review count. Defaults to the runtime's; set it when server rendering. */
  locale?: string;
  /** Opening status. A closed store dims and says so. */
  status?: StoreHeaderStatus;
  /** Buttons beside the name, such as favourite and share IconButtons, each with its own label. */
  actions?: React.ReactNode;
  /** Level of the name's heading element. Use 1 when the header tops the store's own page. @default 1 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Shown instead of a fee of 0. @default "Free delivery" */
  freeDeliveryLabel?: string;
  /** Shown after a non-zero fee, as its unit: "$2.99 delivery". @default "delivery" */
  deliveryFeeLabel?: string;
}

export declare function StoreHeader(props: StoreHeaderProps): React.JSX.Element;

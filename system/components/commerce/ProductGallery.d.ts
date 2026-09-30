import * as React from "react";

/** One image in the gallery. */
export interface ProductGalleryImage {
  /** URL of the image. */
  src: string;
  /** What this image shows, e.g. "Back view, strap detail". It names the image and its thumbnail. */
  alt: string;
}

/** The images on a product page: a main image with previous and next buttons, and a strip of thumbnails. */
export interface ProductGalleryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** The images, in order. At least one; with one there are no buttons, thumbnails or counter. */
  images: ProductGalleryImage[];
  /** Accessible name of the gallery region, e.g. "Images of the canvas tote". */
  label: string;
  /** The shown image's index, for a controlled gallery. Leave it out for an uncontrolled one. */
  value?: number;
  /** Called with the next index when the buttons, a thumbnail, the arrow keys or a swipe change the image. */
  onChange?: (index: number) => void;
  /** The index an uncontrolled gallery starts on. @default 0 */
  defaultIndex?: number;
  /** Shape of the main image and the thumbnails. A number is width / height. @default "1:1" */
  ratio?: "1:1" | "4:5" | "3:4" | "4:3" | number;
  /**
   * Where the thumbnails sit. "left" moves them under the image when the gallery itself is
   * narrower than collapseBelow; "none" hides them and always shows the counter. @default "bottom"
   */
  thumbnails?: "bottom" | "left" | "none";
  /**
   * Width in CSS pixels of the gallery (not the viewport) under which "left" thumbnails move
   * below and the "2 / 5" counter shows on the image. Measured with ResizeObserver. @default 480
   */
  collapseBelow?: number;
  /** Accessible name of the previous button. @default "Previous image" */
  previousLabel?: string;
  /** Accessible name of the next button. @default "Next image" */
  nextLabel?: string;
  /** Accessible name of the thumbnail group. @default "Thumbnails" */
  thumbnailsLabel?: string;
  /** Builds the position announced to screen readers, from a 1-based number and the total. @default (n, total) => `Image ${n} of ${total}` */
  counterLabel?: (n: number, total: number) => string;
}

export declare function ProductGallery(props: ProductGalleryProps): React.JSX.Element;

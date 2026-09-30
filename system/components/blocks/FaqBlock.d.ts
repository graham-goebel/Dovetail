import * as React from "react";

/** One question in a FaqBlock. */
export interface FaqItem {
  id?: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

/** Questions and answers in an Accordion, beside or under a header. */
export interface FaqBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** A few words above the title. */
  eyebrow?: React.ReactNode;
  /** The block's heading. */
  title?: React.ReactNode;
  lead?: React.ReactNode;
  /** A link to support, under the lead. */
  actions?: React.ReactNode;
  items: FaqItem[];
  /** split puts the header beside the answers; stacked centres it above. @default "split" */
  layout?: "split" | "stacked";
  /** Ids open at first. Items without an id are numbered from "0". */
  defaultOpen?: string[];
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

export declare function FaqBlock(props: FaqBlockProps): React.JSX.Element;

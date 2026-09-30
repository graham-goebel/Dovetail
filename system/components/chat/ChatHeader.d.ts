import * as React from "react";

/** Who the conversation is with, shown in a ChatHeader. */
export interface ChatHeaderAvatar {
  /** Full name. The initials fall back to it when there is no image. */
  name: string;
  /** Image URL. */
  src?: string;
}

/** The bar above a conversation: title, avatar with presence, a back button and actions. Renders a `<header>`. */
export interface ChatHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The person, team or assistant the conversation is with. Rendered as a heading. */
  title: string;
  /** A second line, e.g. "Typically replies in 5 min". Shown under the title. */
  subtitle?: React.ReactNode;
  /** Shown before the title. Decorative: the title already names them. */
  avatar?: ChatHeaderAvatar;
  /** A dot on the avatar, with the same state in text: read by screen readers, and shown when there is no subtitle. */
  presence?: "online" | "away" | "offline";
  /** Shows a back button, labelled "Back", before everything else. */
  onBack?: () => void;
  /** The right-hand slot: a few IconButtons, e.g. call or more. */
  actions?: React.ReactNode;
  /** Level of the title's heading element. @default 2 */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export declare function ChatHeader(props: ChatHeaderProps): React.JSX.Element;

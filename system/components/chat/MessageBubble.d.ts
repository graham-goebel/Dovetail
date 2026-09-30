import * as React from "react";

/** Who wrote a received message, for group conversations. */
export interface MessageAuthor {
  /** Shown above the first bubble of a run, and read before the others. */
  name: string;
  /** Avatar image URL. Initials are used without it. */
  src?: string;
}

/** One message: sent on the right in the action colours, received on the left in a quiet surface (sunken, or overlay in dark). */
export interface MessageBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whose message it is. Sets alignment and colours. */
  from: "me" | "them";
  /** The message: text, or content such as a link. Newlines are kept and long words and URLs wrap. */
  children?: React.ReactNode;
  /** Preformatted time, e.g. "9:41". Shown under the bubble. */
  time?: string;
  /** Delivery state of a sent message; ignored when `from` is "them". An icon with a text alternative; failed shows "Not sent". */
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  /** With status "failed", shows a Retry button that calls this. */
  onRetry?: () => void;
  /** For received messages in a group: avatar beside the first bubble of a run, name above it. */
  author?: MessageAuthor;
  /** Position in a run of messages from one author. Tightens the corners and the gap where bubbles meet. @default "single" */
  grouped?: "first" | "middle" | "last" | "single";
}

export declare function MessageBubble(props: MessageBubbleProps): React.JSX.Element;

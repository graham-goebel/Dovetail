import * as React from "react";
import type { ChatHeaderProps } from "../chat/ChatHeader.js";
import type { MessageAuthor, MessageBubbleProps } from "../chat/MessageBubble.js";
import type { QuickRepliesProps, QuickReplyOption } from "../chat/QuickReplies.js";
import type { ComposerProps } from "../chat/Composer.js";

/** One message in a ChatBlock conversation. */
export interface ChatBlockMessage {
  /** Unique and stable: the React key, and what onRetry is called with. */
  id: string;
  /** Always a message; only events set kind. */
  kind?: "message";
  /** Whose message it is: the person using the app ("me") or the other side ("them"). */
  from: "me" | "them";
  /** Who wrote a received message. Names and avatars show on each run once more than one author answers (a group chat). */
  author?: MessageAuthor;
  /** The message text. Newlines are kept. */
  text?: string;
  /** Rich content shown in the bubble, under the text if there is some: a ProductCard, an OrderStatus, a CartLine. */
  content?: React.ReactNode;
  /** Preformatted time, e.g. "9:41". Shown under the bubble. */
  time?: string;
  /** Delivery state of a sent message; ignored for "them". "failed" shows Retry when onRetry is set. */
  status?: MessageBubbleProps["status"];
  /** The day this message belongs to, e.g. "Today". A divider is inserted before it when it differs from the last day given. */
  day?: string;
}

/** A system event shown across the log as a divider, e.g. "Maya joined the conversation". It ends a run of bubbles. */
export interface ChatBlockEvent {
  /** Unique and stable: the React key. */
  id: string;
  /** Marks the item as an event rather than a message. */
  kind: "event";
  /** The event, sentence case, past tense or a state: "Maya joined the conversation". */
  text: string;
  /** The day the event happened. Like a message's day, it inserts a divider when it changes. */
  day?: string;
}

/** An item of ChatBlock's messages: a message or an event. */
export type ChatBlockItem = ChatBlockMessage | ChatBlockEvent;

/** Suggested replies shown under the last message. */
export interface ChatBlockQuickReplies {
  /** The suggestions, in reading and Tab order. */
  options: QuickReplyOption[];
  /** Called with the chosen option's id. Usually sends its label and clears the suggestions. */
  onSelect: (id: string) => void;
  /** Accessible name of the group. @default "Suggested replies" */
  label?: string;
  /** Which side the chips gather on. @default "end" */
  align?: QuickRepliesProps["align"];
}

/** The composer under the conversation. Controlled: the app owns the draft. */
export interface ChatBlockComposer {
  /** The draft. */
  value: string;
  /** Called with the new draft on every edit. */
  onChange: (next: string) => void;
  /** Called with the trimmed text on Enter or Send. Append the message and clear value here. */
  onSend: (text: string) => void;
  /** Hint shown while the field is empty, e.g. "Write a message". */
  placeholder?: string;
  /** Shows an attach button. */
  onAttach?: () => void;
  /** Accessible name of the field. @default `Message ${title}`, or `Ask ${title}` for the assistant */
  label?: string;
  /** Disables the field and its buttons; say why in the placeholder. */
  disabled?: ComposerProps["disabled"];
}

/**
 * A whole conversation from data: header, a scrolling log with computed runs,
 * day dividers and events, typing, quick replies and a composer, in one
 * fixed-height panel.
 */
export interface ChatBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Who the conversation is with. The header's heading, and the default names of the log and the composer. */
  title: string;
  /** The header's second line, e.g. "Typically replies in 5 min". */
  subtitle?: ChatHeaderProps["subtitle"];
  /** The header's avatar. */
  avatar?: ChatHeaderProps["avatar"];
  /** The dot on the header's avatar, with the state in text. Not shown for the assistant variant. */
  presence?: ChatHeaderProps["presence"];
  /** Shows a back button in the header. */
  onBack?: ChatHeaderProps["onBack"];
  /** The header's right-hand slot: a few IconButtons. */
  actions?: ChatHeaderProps["actions"];
  /** Level of the header's heading element. @default 2 */
  headingLevel?: ChatHeaderProps["headingLevel"];
  /** The conversation, oldest first: messages, and events as `{ id, kind: "event", text }`. Runs, dividers and group names are computed from it. */
  messages: ChatBlockItem[];
  /** The other side is replying. support: a TypingIndicator, with the string as the typist's name. assistant: a Thinking indicator, with the string as its label. @default false */
  typing?: string | boolean;
  /** Suggested replies under the last message. Omit, or pass no options, to hide them. */
  quickReplies?: ChatBlockQuickReplies;
  /** The composer at the bottom. */
  composer: ChatBlockComposer;
  /** Called with a failed message's id when its Retry is pressed. */
  onRetry?: (id: string) => void;
  /** support: a person or team, with presence and typing dots. assistant: an AI assistant, with no presence and a Thinking indicator while it works. @default "support" */
  variant?: "support" | "assistant";
  /** The panel's height; the log fills what the header and composer leave, and scrolls. A number is pixels. @default "min(calc(var(--dt-size-container-narrow) * 0.8), 80dvh)" */
  height?: number | string;
  /** Accessible name of the log. @default `Conversation with ${title}` */
  label?: string;
}

export declare function ChatBlock(props: ChatBlockProps): React.JSX.Element;

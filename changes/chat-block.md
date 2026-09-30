---
type: added
bump: minor
area: components
components: [ChatBlock]
tokens: []
visual: false
---
`ChatBlock` draws a whole conversation from a `messages` array: it passes `title`, `subtitle`, `avatar`, `presence`, `onBack` and `actions` to `ChatHeader`, computes runs (`grouped` first, middle, last), inserts a `MessageDivider` where `day` changes and for `{ kind: "event" }` items, shows author names in group chats, and takes `typing`, `quickReplies`, `composer`, `onRetry`, `height`, `label` and `variant="assistant"` (a `Thinking` indicator and no presence).

A new Chat template (`previews/ChatKit.html`) composes two working prototypes from it: a customer support conversation with delivery statuses, a retry and canned replies, and an in-app assistant whose answer streams in word by word.

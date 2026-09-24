/* Playground specs — per-component metadata the harness renders from.

   One entry per component: the props it exposes as controls, how to render it, how to
   emit source for the current values, its state matrix, and its accessibility contract.

   `code` emits only non-default props, so what the user copies is the minimum that
   reproduces the canvas rather than a wall of defaults.

   Add a component by adding an entry here and a three-line page that sets
   window.DT_PLAYGROUND to its name. */

const DT_SPECS = {};

/* ---------- shared helpers ---------- */

function emit(tag, values, defaults, childKey) {
  const parts = [];
  for (const k in values) {
    if (k === childKey) continue;
    const v = values[k];
    if (v === undefined || v === "" || v === defaults[k]) continue;
    if (typeof v === "boolean") { if (v) parts.push(k); continue; }
    if (typeof v === "number") { parts.push(`${k}={${v}}`); continue; }
    parts.push(`${k}="${v}"`);
  }
  const children = childKey ? values[childKey] : undefined;
  const attrs = parts.length ? " " + parts.join(" ") : "";
  const oneLine = `<${tag}${attrs}>`;
  if (!children) return parts.length > 2 ? multiline(tag, parts, null) : `<${tag}${attrs} />`;
  if (oneLine.length + String(children).length + tag.length + 3 <= 62 && parts.length <= 2) {
    return `<${tag}${attrs}>${children}</${tag}>`;
  }
  return multiline(tag, parts, children);
}

function multiline(tag, parts, children) {
  const body = parts.map(p => "  " + p).join("\n");
  if (!children) return `<${tag}\n${body}\n/>`;
  return `<${tag}\n${body}\n>\n  ${children}\n</${tag}>`;
}

const e = React.createElement;

/* ---------- Button ---------- */

DT_SPECS.Button = {
  name: "Button",
  needs: ["Button"],
  summary: "The system's primary action control. One primary per view; everything else is secondary, ghost, or danger.",
  props: [
    { name: "children", control: "text", default: "Save changes", notes: "Verb-first, one to three words." },
    { name: "variant", control: "select", options: ["primary", "secondary", "ghost", "danger"], default: "primary" },
    { name: "size", control: "select", options: ["sm", "md", "lg"], default: "md" },
    { name: "loading", control: "boolean", default: false, notes: "Adds a spinner and blocks interaction. The label stays." },
    { name: "disabled", control: "boolean", default: false, notes: "Gives no reason for being off. Prefer an enabled button that explains itself." },
    { name: "fullWidth", control: "boolean", default: false },
  ],
  render: (p, NS) => e(NS.Button, { ...p, children: undefined }, p.children),
  code: (v, d) => emit("Button", v, d, "children"),
  states: [
    { label: "Rest", props: { children: "Save changes" } },
    { label: "Hover and focus", props: { children: "Hover or tab to me" }, note: "Focus rings are system-owned — never removed, never restyled per component." },
    { label: "Loading", props: { children: "Saving", loading: true }, note: "The label is kept so the button does not resize or change meaning mid-action." },
    { label: "Disabled", props: { children: "Save changes", disabled: true } },
    { label: "Every variant", props: { children: "Action" } },
  ],
  a11y: {
    notes: [
      "A button is for changing data. If it navigates, it should be a Link — assistive technology announces the two differently and users rely on that.",
      "The visible label is the accessible name. Do not add an aria-label that says something else; a voice-control user says what they see.",
      "loading keeps the label and blocks clicks. Announce the result afterwards with a Toast rather than relying on the spinner alone.",
      "Disabled buttons are skipped by keyboard navigation, so the reason they are off is unreachable. Prefer an enabled control that explains the problem when pressed.",
    ],
    keys: [["Enter", "Activate"], ["Space", "Activate"], ["Tab", "Move to the next control"]],
    audit: v => {
      const out = [];
      if (!v.children || !String(v.children).trim()) out.push({ ok: false, text: "No label. A button with no text has no accessible name." });
      else if (String(v.children).trim().split(/\s+/).length > 3) out.push({ ok: false, text: "Label runs past three words. Buttons are verb-first and short." });
      else out.push({ ok: true, text: `Accessible name: “${String(v.children).trim()}”.` });
      if (v.disabled) out.push({ ok: false, text: "Disabled: not focusable, so the reason it is off cannot be read." });
      if (v.loading) out.push({ ok: true, text: "Loading blocks interaction while keeping the name stable." });
      return out;
    },
  },
  usage: [
    "One primary action per view. Everything else is secondary, ghost, or a link.",
    "Never swap the label for “Loading…”. The loading prop adds a spinner and keeps the word, so the button does not change width or meaning mid-action.",
    "danger is for destructive confirmation, not for anything merely important. A red button pressed daily stops reading as a warning.",
    "fullWidth belongs in narrow columns and mobile sheets. On a wide form it makes a single action look like a section.",
  ],
};

/* ---------- IconButton ---------- */

DT_SPECS.IconButton = {
  name: "IconButton",
  needs: ["IconButton"],
  summary: "Icon-only button. The accessible label is a required prop, not an optional extra.",
  props: [
    { name: "label", control: "text", default: "More actions", notes: "Accessible name. Required." },
    { name: "glyph", control: "select", options: ["⋯", "+", "×", "⌕", "↻"], default: "⋯", notes: "Stands in for a Lucide icon here." },
    { name: "variant", control: "select", options: ["ghost", "solid"], default: "ghost" },
    { name: "size", control: "select", options: ["xs", "sm", "md", "lg"], default: "md" },
    { name: "disabled", control: "boolean", default: false },
  ],
  render: (p, NS) => e(NS.IconButton, { label: p.label, variant: p.variant, size: p.size, disabled: p.disabled }, p.glyph),
  code: (v, d) => {
    const attrs = [`label="${v.label}"`];
    if (v.variant !== d.variant) attrs.push(`variant="${v.variant}"`);
    if (v.size !== d.size) attrs.push(`size="${v.size}"`);
    if (v.disabled) attrs.push("disabled");
    const head = attrs.length > 2 ? `<IconButton\n  ${attrs.join("\n  ")}\n>` : `<IconButton ${attrs.join(" ")}>`;
    return `${head}\n  <MoreHorizontal />\n</IconButton>`;
  },
  states: [
    { label: "Rest", props: { label: "More actions", glyph: "⋯" } },
    { label: "Solid", props: { label: "More actions", glyph: "⋯", variant: "solid" } },
    { label: "Disabled", props: { label: "More actions", glyph: "⋯", disabled: true } },
  ],
  a11y: {
    notes: [
      "label is required because there is no visible text. Without it a screen reader announces “button” and nothing else.",
      "Pair with Tooltip for sighted users. The tooltip repeats the label; it never replaces it, and it does not exist on touch.",
      "Only use an icon alone when the icon is unambiguous — close, more, search. Everything else needs a word.",
      "Keep the touch target at 44px even when the visual size is xs. Padding, not the icon, provides it.",
    ],
    keys: [["Enter", "Activate"], ["Space", "Activate"]],
    audit: v => {
      const out = [];
      if (!v.label || !v.label.trim()) out.push({ ok: false, text: "No label. An unlabelled icon button is a bug, not a style choice." });
      else out.push({ ok: true, text: `Accessible name: “${v.label}”.` });
      if (v.size === "xs" || v.size === "sm") out.push({ ok: true, text: "Small visual size — confirm the touch target still reaches 44px." });
      return out;
    },
  },
  usage: [
    "Reserve icon-only controls for actions whose icon is universally understood.",
    "xs and sm are for dense toolbars and table rows, not for primary page actions.",
    "Do not put an icon button alone in an empty toolbar. If there is room for a word, use a Button.",
  ],
};

/* ---------- ButtonGroup ---------- */

DT_SPECS.ButtonGroup = {
  name: "ButtonGroup",
  needs: ["ButtonGroup", "Button"],
  summary: "Groups related buttons. Attached mode joins them into one segmented control with shared edges.",
  props: [
    { name: "label", control: "text", default: "Text alignment", notes: "Accessible group name. Required." },
    { name: "attached", control: "boolean", default: false, notes: "Join into a segmented control." },
    { name: "size", control: "select", options: ["sm", "md", "lg"], default: "sm", notes: "Applied to every button in the group." },
    { name: "variant", control: "select", options: ["secondary", "ghost"], default: "secondary" },
  ],
  render: (p, NS) => e(NS.ButtonGroup, { label: p.label, attached: p.attached },
    ["Left", "Centre", "Right"].map(t => e(NS.Button, { key: t, size: p.size, variant: p.variant }, t))),
  code: (v, d) => `<ButtonGroup label="${v.label}"${v.attached ? " attached" : ""}>
  <Button variant="${v.variant}" size="${v.size}">Left</Button>
  <Button variant="${v.variant}" size="${v.size}">Centre</Button>
  <Button variant="${v.variant}" size="${v.size}">Right</Button>
</ButtonGroup>`,
  states: [
    { label: "Spaced", props: { label: "Invoice actions", size: "sm", variant: "secondary" } },
    { label: "Attached", props: { label: "Text alignment", attached: true, size: "sm", variant: "secondary" } },
  ],
  a11y: {
    notes: [
      "label is required. Without it a screen reader announces three unrelated buttons rather than one set.",
      "An attached group looks like a segmented control but is still a set of buttons. If only one can be active at a time, that is Tabs or a RadioGroup.",
      "Every button in the group keeps its own accessible name. Do not rely on position to convey meaning.",
    ],
    keys: [["Tab", "Into and out of the group"], ["Enter / Space", "Activate the focused button"]],
    audit: v => {
      const out = [];
      if (!v.label || !v.label.trim()) out.push({ ok: false, text: "No group label. The set has no accessible name." });
      else out.push({ ok: true, text: `Group name: “${v.label}”.` });
      if (v.attached) out.push({ ok: true, text: "Attached: confirm these are the same kind of action. Save and Cancel should never share an edge." });
      return out;
    },
  },
  usage: [
    "Attached groups are for mutually exclusive choices of the same kind. Do not attach Save and Cancel — they are not the same kind.",
    "Keep every button the same variant and size. Mixing a primary into an attached group breaks the shared edge.",
    "Three or four buttons. Past that, the group reads as a toolbar and needs labels or overflow.",
  ],
};

/* ---------- Link ---------- */

DT_SPECS.Link = {
  name: "Link",
  needs: ["Link"],
  summary: "Navigation. If it changes the page it is a Link; if it changes data it is a Button.",
  props: [
    { name: "children", control: "text", default: "the DTCG format", notes: "Describes the destination. Never “here”." },
    { name: "href", control: "text", default: "#" },
    { name: "external", control: "boolean", default: false, notes: "New tab, safe rel, and an indicator icon." },
    { name: "underline", control: "select", options: ["always", "hover", "never"], default: "always" },
    { name: "tone", control: "select", options: ["primary", "inherit"], default: "primary" },
  ],
  render: (p, NS) => e("p", {
    style: { margin: 0, maxWidth: "48ch", fontSize: "var(--dt-text-body-md-size)", lineHeight: "var(--dt-text-body-md-line)", color: "var(--dt-text-secondary)", textAlign: "left" },
  }, "Tokens are authored in ", e(NS.Link, { href: p.href, external: p.external, underline: p.underline, tone: p.tone }, p.children), " and build to CSS custom properties."),
  code: (v, d) => emit("Link", v, d, "children"),
  states: [
    { label: "In prose", props: { children: "the DTCG format", href: "#" } },
    { label: "External", props: { children: "designtokens.org", href: "#", external: true }, note: "Opens a new tab, which takes control away from the user. Reserve it for genuinely off-site destinations." },
    { label: "Underline on hover", props: { children: "Settings", href: "#", underline: "hover" } },
  ],
  a11y: {
    notes: [
      "Link text must make sense read out of context. Screen reader users list every link on a page, where “read more” five times is useless.",
      "Keep underline on in body copy. Colour alone fails for readers who cannot distinguish it from surrounding text.",
      "external adds rel=\"noopener noreferrer\" and a visible indicator, so the new tab is not a surprise.",
      "A link with no href is not focusable. If it does something rather than going somewhere, it is a Button.",
    ],
    keys: [["Enter", "Follow the link"], ["Tab", "Move to the next link"]],
    audit: v => {
      const out = [];
      const t = String(v.children || "").trim().toLowerCase();
      if (!t) out.push({ ok: false, text: "No link text." });
      else if (["here", "read more", "more", "click here", "link"].includes(t)) out.push({ ok: false, text: `“${v.children}” is meaningless out of context. Name the destination.` });
      else out.push({ ok: true, text: `Link text: “${v.children}”.` });
      if (v.underline === "never") out.push({ ok: false, text: "No underline: in body copy this leaves colour as the only signal, which fails for some readers." });
      if (v.external) out.push({ ok: true, text: "External: rel=\"noopener noreferrer\" and a visible new-tab indicator are applied." });
      return out;
    },
  },
  usage: [
    "Behaviour decides this, not styling. A Button styled as a link is still a button.",
    "Keep underline=\"always\" in prose. Reserve hover and never for navigation lists where position already marks the links.",
    "tone=\"inherit\" is for links inside a coloured block where the primary colour would clash.",
  ],
};

/* ---------- index shown in the sidebar ---------- */

const DT_INDEX = [
  { group: "Actions", items: [
    { name: "Button", href: "./Button.play.html" },
    { name: "ButtonGroup", href: "./ButtonGroup.play.html" },
    { name: "IconButton", href: "./IconButton.play.html" },
    { name: "Link", href: "./Link.play.html" },
  ]},
  { group: "Primitives", items: ["Stack","Inline","Grid","Spacer","Divider","VisuallyHidden"].map(n => ({ name: n })) },
  { group: "Forms", items: ["Field","Input","Textarea","Select","Checkbox","CheckboxGroup","Radio","RadioGroup","Switch","Slider"].map(n => ({ name: n })) },
  { group: "Display", items: ["Card","Badge","Tag","Avatar","AvatarGroup","List","Table","Stat","EmptyState","Skeleton","Code"].map(n => ({ name: n })) },
  { group: "Navigation", items: ["Tabs","Breadcrumbs","Pagination","Stepper","Navbar","Sidebar"].map(n => ({ name: n })) },
  { group: "Feedback", items: ["Alert","Dialog","Toast","Drawer","Popover","Tooltip","Progress","Spinner","Banner"].map(n => ({ name: n })) },
  { group: "Content", items: ["Prose","Quote","Accordion","Callout","AspectRatio","Image","Figure","Media"].map(n => ({ name: n })) },
];

Object.assign(window, { DT_SPECS, DT_INDEX });

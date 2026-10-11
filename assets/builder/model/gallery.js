/* What can be built from a component: the examples its page in Assets shows
   under the preview, as its docs page does. Each is a node to place, its
   props and, where it has them, what goes in its slots or inside it. A
   component with none written here shows one example for each option of
   its main choice (variant, layout, tone…). */

import { META, words } from "../config.js";
import { make } from "./tree.js";

function n(type, props, kids) { return { type: type, props: props || {}, children: kids || null }; }
function slot(name, kids) { return n("Slot", { name: name }, kids); }
function btn(label, props) { return n("Button", Object.assign({ size: "sm", children: label }, props || {})); }

/* Blocks share their band's choices: a tone, dark, texture. */
var GALLERY = {
  Card: [
    { label: "Plan", props: { eyebrow: "Plan", title: "Starter", description: "One editor, 100 invoices a month." }, kids: [slot("footer", [btn("Choose", { variant: "secondary" })])] },
    { label: "Interactive", props: { interactive: true, eyebrow: "Plan", title: "Team", description: "Five editors, unlimited invoices." }, kids: [slot("footer", [btn("Choose", { variant: "secondary" })])] },
    { label: "Selected", props: { selected: true, eyebrow: "Plan", title: "Business", description: "Unlimited editors, SSO, audit log." }, kids: [slot("footer", [btn("Current plan")])] },
    { label: "With media", props: { eyebrow: "Guide", title: "Migrating to tokens", description: "Replace literal values one screen at a time." }, kids: [slot("media", [n("Image", { alt: "Cover picture", ratio: "16:9" })])] },
    { label: "Settings panel", props: { title: "Profile", description: "How the workspace appears to its members." }, kids: [
      n("Stack", { layer: "group" }, [n("Input", { label: "Workspace name", size: "sm" }), n("Switch", { label: "Two-factor authentication", defaultChecked: true })]),
    ] },
    { label: "Panel", props: { title: "Revenue", description: "Last 30 days." }, kids: [n("Stat", { label: "Paid", value: "$48,200", delta: "+12%", deltaDirection: "up" })] },
  ],
  Button: [
    { label: "Primary", props: { children: "Save changes" } },
    { label: "Secondary", props: { variant: "secondary", children: "Cancel" } },
    { label: "Ghost", props: { variant: "ghost", children: "Learn more" } },
    { label: "Brand", props: { variant: "brand", children: "Get started" } },
    { label: "Danger", props: { variant: "danger", children: "Delete project" } },
    { label: "Large, full width", props: { size: "lg", fullWidth: true, children: "Continue" } },
  ],
  Badge: [
    { label: "Status", props: { tone: "success", dot: true, children: "Live" } },
    { label: "Warning", props: { tone: "warning", children: "Due soon" } },
    { label: "Danger", props: { tone: "danger", children: "Past due" } },
    { label: "Solid", props: { tone: "primary", variant: "solid", children: "New" } },
    { label: "Category", props: { children: "Owner" } },
    { label: "Brand", props: { tone: "brand", children: "Beta" } },
  ],
  Alert: [
    { label: "Info", props: { tone: "info", title: "Read-only mode", children: "Your trial ended. Add a payment method to keep editing." } },
    { label: "Success", props: { tone: "success", title: "Invoice sent", children: "INV-2043 was emailed to Pallas Freight." } },
    { label: "With action", props: { tone: "warning", title: "Unverified domain", children: "Emails may be marked as spam until it's verified." }, kids: [slot("action", [btn("Verify", { variant: "secondary" })])] },
    { label: "Danger", props: { tone: "danger", title: "Payment failed", children: "The card ending 4242 was declined." }, kids: [slot("action", [btn("Update card", { variant: "secondary" })])] },
  ],
  EmptyState: [
    { label: "First run", props: { title: "No projects yet", description: "Projects you make or are invited to show up here." }, kids: [slot("action", [btn("New project")])] },
    { label: "No results", props: { size: "sm", title: "Nothing matches", description: "Try fewer filters or a different word." }, kids: [slot("action", [btn("Clear filters", { variant: "secondary" })])] },
  ],

  HeroBlock: [
    { label: "Split", props: {} },
    { label: "Centred", props: { layout: "centered" } },
    { label: "Brand", props: { tone: "brand" } },
    { label: "Big and centred", props: { layout: "centered", titleSize: "display-lg", tone: "subtle" } },
    { label: "Dark", props: { dark: true } },
  ],
  FeatureGridBlock: [
    { label: "Plain", props: {} },
    { label: "Cards", props: { variant: "cards", tone: "subtle" } },
    { label: "Four across, left", props: { columns: 4, align: "start" } },
    { label: "Two across, brand", props: { columns: 2, tone: "brand-muted", variant: "cards" } },
    { label: "Dark", props: { dark: true, variant: "cards" } },
  ],
  SplitBlock: [
    { label: "Picture right", props: {} },
    { label: "Picture left", props: { reverse: true } },
    { label: "Top aligned, subtle", props: { align: "top", tone: "subtle" } },
    { label: "Brand", props: { tone: "brand-muted", reverse: true } },
    { label: "Dark", props: { dark: true } },
  ],
  StatsBlock: [
    { label: "Left", props: {} },
    { label: "Centred", props: { align: "center", tone: "subtle" } },
    { label: "Brand", props: { tone: "brand", align: "center" } },
    { label: "Dark", props: { dark: true } },
  ],
  TestimonialBlock: [
    { label: "Plain", props: {} },
    { label: "Subtle", props: { tone: "subtle" } },
    { label: "Brand", props: { tone: "brand-muted" } },
    { label: "Dark", props: { dark: true } },
  ],
  FaqBlock: [
    { label: "Split", props: {} },
    { label: "Stacked", props: { layout: "stacked", width: "narrow" } },
    { label: "Subtle", props: { tone: "subtle" } },
    { label: "Dark", props: { dark: true, layout: "stacked", width: "narrow" } },
  ],
  CtaBlock: [
    { label: "Brand", props: {} },
    { label: "Quiet brand", props: { tone: "brand-muted" } },
    { label: "Textured", props: { texture: true } },
    { label: "Plain", props: { tone: "base" } },
    { label: "Dark", props: { tone: "base", dark: true } },
  ],
  BlockHeader: [
    { label: "Left", props: {} },
    { label: "Centred", props: { align: "center" } },
    { label: "Display", props: { align: "center", size: "display-sm" } },
  ],
  ChatBlock: [
    { label: "Support", props: {} },
    { label: "Assistant", props: { variant: "assistant" } },
    { label: "Away", props: { presence: "away" } },
  ],
  MenuBlock: [
    { label: "List", props: {} },
    { label: "Grid", props: { layout: "grid" } },
    { label: "Subtle grid", props: { layout: "grid", tone: "subtle" } },
  ],
  ProductGridBlock: [
    { label: "Four across", props: {} },
    { label: "Three across", props: { columns: 3, tone: "subtle" } },
    { label: "Two across", props: { columns: 2 } },
    { label: "Dark", props: { dark: true, columns: 3 } },
  ],
  ProductDetailBlock: [
    { label: "In stock", props: {} },
    { label: "Sold out", props: { soldOut: true } },
    { label: "Tall pictures", props: { ratio: "4:5", tone: "subtle" } },
  ],
  CartBlock: [
    { label: "Plain", props: {} },
    { label: "Subtle", props: { tone: "subtle" } },
    { label: "Dark", props: { dark: true } },
  ],
  CheckoutBlock: [
    { label: "Plain", props: {} },
    { label: "Subtle", props: { tone: "subtle" } },
    { label: "Dark", props: { dark: true } },
  ],
  OrderTrackingBlock: [
    { label: "Plain", props: {} },
    { label: "Subtle", props: { tone: "subtle" } },
    { label: "Dark", props: { dark: true } },
  ],
};

/* The choice a component is mostly told apart by, in this order. */
var MAIN = ["variant", "layout", "tone", "surface", "shape", "state", "mode", "size"];
var AUTO_MAX = 6;

function autoGallery(type) {
  var m = META[type];
  if (!m || m.builder) return [];
  var spec = null;
  MAIN.some(function (name) {
    spec = m.props.filter(function (p) { return p.name === name && p.kind === "enum" && p.options && p.options.length > 1; })[0] || null;
    return !!spec;
  });
  if (!spec) return [];
  return spec.options.slice(0, AUTO_MAX).map(function (o) {
    var props = {};
    props[spec.name] = o;
    return { label: words(String(o)).replace(/-/g, " "), props: props };
  });
}

/* The examples for a type: written ones, or one per option of its main choice. */
function galleryOf(type) {
  return GALLERY[type] || autoGallery(type);
}

/* An example's nodes, fresh each time it's placed. */
function grow(spec) {
  var node = make(spec.type, Object.assign({}, spec.props));
  if (spec.children) node.children = spec.children.map(grow);
  return node;
}
function exampleKids(example) {
  return example && example.kids ? example.kids.map(grow) : null;
}

export { GALLERY, galleryOf, exampleKids };

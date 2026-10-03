/* One live specimen per component, rendered into the cards on the component
   index so the list shows the thing rather than only its name.

   Each entry is the smallest honest use of the component: real props, real
   content, no scaffolding. They are rendered from the same bundle the preview
   cards use, so a specimen cannot drift from the component it shows.

   Four components are missing on purpose. Dialog, Drawer, Sheet and ToastRegion
   mount fixed to the viewport when open, so a specimen of them would cover the
   page rather than sit in a card; VisuallyHidden renders nothing by design.
   Those cards say so instead of showing an empty box. */

(function () {
  "use strict";

  var NS = window.BeamMobileDesignSystem_e33121;
  var slots = document.querySelectorAll("[data-specimen]");
  if (!NS || !window.React || !window.ReactDOM) return;

  var e = React.createElement;

  /* A glyph for the components that take one. Drawn to the system's icon
     convention, like the rest of this site's chrome. */
  function glyph(paths) {
    return e(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        /* Sizes and stroke are tokens, so they go through style: an SVG
           presentation attribute cannot hold a var(). */
        style: {
          width: "var(--dt-size-icon-md)",
          height: "var(--dt-size-icon-md)",
          strokeWidth: "var(--site-icon-stroke, 2)",
        },
        "aria-hidden": true,
      },
      paths.map(function (d, i) {
        return e("path", { key: i, d: d });
      })
    );
  }

  var MORE = ["M5 12h.01", "M12 12h.01", "M19 12h.01"];
  var swatch = { background: "var(--dt-surface-sunken)", borderRadius: "var(--dt-radius-media)", height: 28 };

  var SPECIMENS = {
    /* Primitives */
    Stack: function () {
      return e(NS.Stack, { gap: "2xs", align: "flex-start" }, e(NS.Tag, null, "First"), e(NS.Tag, null, "Second"), e(NS.Tag, null, "Third"));
    },
    Inline: function () {
      return e(NS.Inline, { gap: "xs" }, e(NS.Tag, null, "Design"), e(NS.Tag, null, "Code"), e(NS.Tag, null, "Docs"));
    },
    Grid: function () {
      return e(
        NS.Grid,
        { minColumnWidth: "56px", gap: "xs" },
        e("div", { style: swatch }),
        e("div", { style: swatch }),
        e("div", { style: swatch })
      );
    },
    Spacer: function () {
      return e(NS.Inline, { gap: "2xs" }, e(NS.Tag, null, "Left"), e(NS.Spacer, { axis: "horizontal", size: "xl" }), e(NS.Tag, null, "Right"));
    },
    Divider: function () {
      return e(NS.Divider, { label: "or" });
    },

    /* Actions */
    Button: function () {
      return e(NS.Inline, { gap: "xs" }, e(NS.Button, { size: "sm" }, "Save changes"), e(NS.Button, { size: "sm", variant: "secondary" }, "Cancel"));
    },
    ButtonGroup: function () {
      return e(
        NS.ButtonGroup,
        { label: "View mode", attached: true },
        e(NS.Button, { variant: "secondary", size: "sm" }, "List"),
        e(NS.Button, { variant: "secondary", size: "sm" }, "Grid")
      );
    },
    IconButton: function () {
      return e(
        NS.Inline,
        { gap: "xs", align: "center" },
        e(NS.IconButton, { label: "More actions", size: "sm" }, glyph(MORE)),
        e(NS.IconButton, { label: "More actions", size: "sm", variant: "solid" }, glyph(MORE))
      );
    },
    Link: function () {
      return e(NS.Link, { href: "#" }, "Account settings");
    },

    /* Forms */
    Field: function () {
      return e(NS.Field, { label: "Role", hint: "Sets what they can change" }, e(NS.Select, { options: ["Owner", "Admin", "Member"], size: "sm" }));
    },
    Input: function () {
      return e(NS.Input, { label: "Workspace name", defaultValue: "Acme Inc", size: "sm" });
    },
    Textarea: function () {
      return e(NS.Textarea, { label: "Release notes", rows: 2, defaultValue: "Ships Friday." });
    },
    Select: function () {
      return e(NS.Select, { label: "Role", options: ["Owner", "Admin", "Member"], size: "sm" });
    },
    Checkbox: function () {
      return e(NS.Checkbox, { label: "Email me about releases", defaultChecked: true });
    },
    CheckboxGroup: function () {
      return e(NS.CheckboxGroup, {
        label: "Notify by",
        orientation: "horizontal",
        defaultValue: ["email"],
        options: [{ value: "email", label: "Email" }, { value: "sms", label: "SMS" }],
      });
    },
    Radio: function () {
      return e(NS.Radio, { label: "Weekly digest", name: "specimen-radio", defaultChecked: true });
    },
    RadioGroup: function () {
      return e(NS.RadioGroup, {
        label: "Cadence",
        orientation: "horizontal",
        defaultValue: "weekly",
        options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }],
      });
    },
    Switch: function () {
      return e(NS.Switch, { label: "Two-factor authentication", defaultChecked: true });
    },
    Combobox: function () {
      return e(NS.Combobox, {
        label: "Country",
        defaultValue: "United Kingdom",
        options: ["Australia", "Canada", "Japan", "Kenya", "Norway", "United Kingdom", "Uruguay"],
      });
    },
    Slider: function () {
      return e(NS.Slider, { label: "Monthly budget", min: 0, max: 100, defaultValue: 60, showValue: true });
    },

    /* Display */
    Card: function () {
      return e(NS.Card, { eyebrow: "Plan", title: "Team", description: "Five editors, unlimited invoices." });
    },
    Carousel: function () {
      var tiles = [
        ["Fern", "var(--dt-surface-brand)", "var(--dt-text-on-brand)"],
        ["Harbour", "var(--dt-surface-brand-secondary)", "var(--dt-text-on-brand-secondary)"],
        ["Clay", "var(--dt-surface-brand-muted)", "var(--dt-text-primary)"],
        ["Ink", "var(--dt-surface-inverse)", "var(--dt-text-inverse)"],
        ["Moss", "var(--dt-surface-action)", "var(--dt-text-on-action)"],
      ];
      return e("div", { style: { width: "100%", maxWidth: 260 } }, e(NS.Carousel, { label: "Glazes", layout: "coverflow", itemRatio: "portrait", ratio: "16:9" },
        tiles.map(function (t) {
          return e("div", { key: t[0], style: {
            display: "grid", placeItems: "end start", padding: "var(--dt-space-inset-xs)", background: t[1], color: t[2],
            fontFamily: "var(--dt-font-family-sans)", fontSize: "var(--dt-text-label-md-size)", fontWeight: "var(--dt-font-weight-semibold)",
          } }, t[0]);
        })));
    },
    Badge: function () {
      return e(NS.Inline, { gap: "xs" }, e(NS.Badge, { tone: "primary" }, "Accent"), e(NS.Badge, { tone: "success", dot: true }, "Live"));
    },
    Tag: function () {
      return e(NS.Inline, { gap: "xs" }, e(NS.Tag, { selected: true }, "Design"), e(NS.Tag, null, "Code"));
    },
    Avatar: function () {
      return e(NS.Inline, { gap: "xs", align: "center" }, e(NS.Avatar, { name: "Grace Hopper" }), e(NS.Avatar, { name: "Ada Lovelace", status: "online" }));
    },
    AvatarGroup: function () {
      return e(NS.AvatarGroup, {
        label: "Editors",
        max: 3,
        people: [{ name: "Grace Hopper" }, { name: "Ada Lovelace" }, { name: "Alan Turing" }, { name: "Katherine Johnson" }],
      });
    },
    List: function () {
      return e(NS.List, {
        label: "Recent workspaces",
        divided: true,
        items: [
          { id: 1, title: "Acme Inc", description: "Owner" },
          { id: 2, title: "Globex", description: "Member" },
        ],
      });
    },
    Table: function () {
      return e(NS.Table, {
        dense: true,
        columns: [{ key: "name", header: "Name" }, { key: "role", header: "Role" }],
        rows: [{ name: "Grace Hopper", role: "Owner" }, { name: "Ada Lovelace", role: "Admin" }],
      });
    },
    Stat: function () {
      return e(NS.Stat, { label: "Revenue", value: "48.2k", unit: "GBP", delta: "12%", deltaDirection: "up" });
    },
    EmptyState: function () {
      return e(NS.EmptyState, { size: "sm", title: "No invoices yet", description: "Create one and it will appear here." });
    },
    Skeleton: function () {
      return e(NS.Skeleton, { lines: 3 });
    },
    Code: function () {
      return e(NS.Code, null, "--dt-surface-action");
    },

    /* Navigation */
    Tabs: function () {
      return e(NS.Tabs, {
        label: "Sections",
        value: "preview",
        tabs: [{ id: "preview", label: "Preview" }, { id: "props", label: "Props" }],
      });
    },
    TabPanel: function () {
      return e(NS.TabPanel, { id: "preview", value: "preview" }, e("span", { style: { fontSize: "var(--dt-font-size-sm)" } }, "The panel for the selected tab."));
    },
    Breadcrumbs: function () {
      return e(NS.Breadcrumbs, { items: [{ label: "Home", href: "#" }, { label: "Settings", href: "#" }, { label: "Billing" }] });
    },
    Pagination: function () {
      return e(NS.Pagination, { page: 2, totalPages: 5 });
    },
    Stepper: function () {
      return e(NS.Stepper, { current: 1, steps: [{ label: "Plan" }, { label: "Pay" }, { label: "Done" }] });
    },
    Navbar: function () {
      return e(NS.Navbar, { brand: "Acme", current: "home", links: [{ id: "home", label: "Home" }, { id: "docs", label: "Docs" }] });
    },
    Sidebar: function () {
      return e(NS.Sidebar, {
        width: 160,
        label: "Main",
        current: "home",
        sections: [{ items: [{ id: "home", label: "Home" }, { id: "team", label: "Team" }] }],
      });
    },

    /* Feedback */
    Alert: function () {
      return e(NS.Alert, { tone: "warning", title: "Your trial ends on Friday" }, "Add a payment method to keep write access.");
    },
    Banner: function () {
      return e(NS.Banner, { tone: "info", title: "Scheduled maintenance" }, "Sunday, 02:00 to 04:00 UTC.");
    },
    Toast: function () {
      return e(NS.Toast, { tone: "success", title: "Changes saved" }, "Your workspace is up to date.");
    },
    Tooltip: function () {
      return e(NS.Tooltip, { content: "Close the dialog" }, e(NS.Button, { variant: "secondary", size: "sm" }, "Point at me"));
    },
    Popover: function () {
      return e(NS.Popover, { label: "Filters", trigger: e(NS.Button, { variant: "secondary", size: "sm" }, "Filters") });
    },
    Progress: function () {
      return e(NS.Progress, { label: "Uploading", value: 64, showValue: true });
    },
    Spinner: function () {
      return e(NS.Spinner, { label: "Saving changes" });
    },

    /* Content */
    Prose: function () {
      return e(NS.Prose, { size: "sm" }, e("p", { style: { margin: 0 } }, "A primitive names a value. A semantic token names a job. Reading upward is allowed; reading downward is not."));
    },
    Quote: function () {
      return e(NS.Quote, { attribution: "Ada Lovelace", role: "Design Systems Lead" }, "Tokens made the redesign a config change.");
    },
    Accordion: function () {
      return e(NS.Accordion, {
        label: "Billing questions",
        defaultOpen: ["when"],
        items: [{ id: "when", title: "When am I billed?", content: "On the same day each month." }],
      });
    },
    Callout: function () {
      return e(NS.Callout, { tone: "tip", title: "Faster audits" }, "Run the adherence lint in CI.");
    },
    AspectRatio: function () {
      return e(NS.AspectRatio, { ratio: "16:9", style: { background: "var(--dt-surface-sunken)", borderRadius: "var(--dt-radius-media)" } });
    },
    Image: function () {
      return e(NS.Image, { alt: "Ridge line above a cloud inversion", ratio: "16:9" });
    },
    Video: function () {
      return e(NS.Video, { label: "Ridge line above a cloud inversion", ratio: "16:9" });
    },
    BottomNav: function () {
      var dot = function (d) { return glyph([d]); };
      return e("div", { style: { width: "100%", maxWidth: 280 } }, e(NS.BottomNav, {
        current: "home",
        items: [
          { id: "home", label: "Home", icon: dot("M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5") },
          { id: "saved", label: "Saved", icon: dot("M19.5 12.6 12 20l-7.5-7.4A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 7.5 6.6z"), badge: 3 },
          { id: "me", label: "Me", icon: dot("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0") },
        ],
      }));
    },
    AppShell: function () {
      return e("div", { style: { width: 180, height: 150, borderRadius: "var(--dt-radius-container)", overflow: "hidden", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)" } },
        e(NS.AppShell, { scroll: "contained", title: "Today", bottomNav: e("div", { style: { height: 28, background: "var(--dt-surface-glass)", borderTop: "var(--dt-border-width-default) solid var(--dt-border-glass)" } }) },
          e("div", { style: { padding: "var(--dt-space-inset-xs)", display: "grid", gap: 6 } }, [1, 2, 3].map(function (i) { return e("div", { key: i, style: swatch }); }))));
    },
    Thinking: function () {
      return e(NS.Thinking, { state: "thinking", size: "md" });
    },
    Heading: function () {
      return e(NS.Heading, { level: 3, size: "heading-md" }, "Quiet mornings");
    },
    Text: function () {
      return e("div", { style: { display: "flex", flexDirection: "column", gap: "var(--dt-space-stack-2xs)" } },
        e(NS.Text, { variant: "eyebrow" }, "Ridge loop"),
        e(NS.Text, { variant: "label", weight: "semibold", numeric: true }, "$1,480.00"),
        e(NS.Text, { variant: "fine" }, "Per person, twin share."));
    },
    Section: function () {
      return e(NS.Section, { tone: "brand-muted", spacing: "none", width: "full", style: { padding: "var(--dt-space-inset-md)", borderRadius: "var(--dt-radius-container)" } },
        e(NS.Text, { variant: "eyebrow" }, "Section tone"),
        e(NS.Heading, { level: 3, size: "heading-xs" }, "Follows the band"));
    },
    Cover: function () {
      return e(NS.Cover, { alt: "Ridge line above a cloud inversion", ratio: "16:9", eyebrow: "New season", title: "Built for the trail" });
    },
    Figure: function () {
      return e(NS.Figure, { caption: "Throughput held steady through the migration." }, e(NS.Image, { alt: "Line chart of requests per second", ratio: "3:2" }));
    },
    BlockRenderer: function () {
      return e(NS.BlockRenderer, {
        registry: { callout: NS.Callout },
        blocks: [{ _type: "callout", _key: "a", tone: "note", title: "Rendered from a block", children: "{ _type: \"callout\" } and a registry entry." }],
      });
    },
    SocialPost: function () {
      return e("div", { style: { width: "96px" } }, e(NS.SocialPost, { layout: "headline", tone: "brand", eyebrow: "Summer", title: "Walk the high route.", handle: "@highroute" }));
    },
    Media: function () {
      return e(NS.Media, {
        media: e(NS.Image, { alt: "Route map with three waypoints", ratio: "4:3" }),
        title: "Plan a hut-to-hut traverse",
        body: "Five nights and 62km, with the huts that take card payments.",
      });
    },

    /* Commerce */
    Price: function () {
      return e(NS.Price, { amount: 24.5, compareAt: 30, locale: "en-US" });
    },
    Rating: function () {
      return e(NS.Rating, { value: 4.5, count: 128, locale: "en-US" });
    },
    QuantityStepper: function () {
      return e(LiveQuantity, null, e(NS.QuantityStepper, { label: "Quantity", value: 2, max: 9, size: "sm", onChange: function () {} }));
    },
    BasketBar: function () {
      return e("div", { style: { width: "100%", maxWidth: 280 } },
        e(NS.BasketBar, { count: 3, total: 42.5, locale: "en-US", onClick: function () {} }));
    },
    /* Chat */
    ChatHeader: function () {
      return e("div", { style: { width: "100%", maxWidth: 280, borderRadius: "var(--dt-radius-container)", overflow: "hidden", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)" } },
        e(NS.ChatHeader, { title: "Maya Chen", subtitle: "Typically replies in 5 min", presence: "online", avatar: { name: "Maya Chen" } }));
    },
    MessageList: function () {
      return e("div", { style: { width: "100%", maxWidth: 280, height: 150, display: "flex", flexDirection: "column", borderRadius: "var(--dt-radius-container)", overflow: "hidden", background: "var(--dt-surface-base)", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)" } },
        e(NS.MessageList, { label: "Conversation with Maya Chen", style: { flex: "1 1 auto" } },
          e(NS.MessageBubble, { from: "them" }, "Your replacement ships today."),
          e(NS.MessageBubble, { from: "me", time: "9:41", status: "read" }, "Thank you!")));
    },
    MessageDivider: function () {
      return e("div", { style: { width: "100%", maxWidth: 280 } }, e(NS.MessageDivider, null, "Today"));
    },
    MessageBubble: function () {
      return e("div", { style: { width: "100%", maxWidth: 280, display: "flex", flexDirection: "column" } },
        e(NS.MessageBubble, { from: "them", grouped: "first", style: { marginTop: 0 } }, "Still on for 11?"),
        e(NS.MessageBubble, { from: "me", time: "9:39", status: "read" }, "Yes, see you there."));
    },
    /* Controlled, so it holds its own draft; sending clears it. */
    Composer: (function () {
      function ComposerSpecimen() {
        var draft = React.useState("");
        return e("div", { style: { width: "100%", maxWidth: 280, borderRadius: "var(--dt-radius-container)", overflow: "hidden", border: "var(--dt-border-width-default) solid var(--dt-border-subtle)" } },
          e(NS.Composer, { label: "Message", placeholder: "Write a message", value: draft[0], onChange: draft[1], onSend: function () { draft[1](""); } }));
      }
      return function () {
        return e(ComposerSpecimen);
      };
    })(),
    TypingIndicator: function () {
      return e(NS.TypingIndicator, { name: "Maya", style: { marginTop: 0 } });
    },
    QuickReplies: function () {
      return e(NS.QuickReplies, {
        label: "Suggested replies",
        align: "start",
        style: { marginTop: 0 },
        options: [{ id: "track", label: "Track my order" }, { id: "human", label: "Talk to a person" }],
        onSelect: function () {},
      });
    },
    ProductCard: function () {
      return e("div", { style: { width: "100%", maxWidth: 200 } }, e(NS.ProductCard, {
        name: "Stoneware mug", subtitle: "Fern glaze", price: 24, compareAt: 30, locale: "en-US", badge: "-20%",
        image: { src: productArt("#e9e4dc", "#5b7a6a"), alt: "" },
      }));
    },
    ProductGallery: function () {
      return e("div", { style: { width: "100%", maxWidth: 220 } }, e(NS.ProductGallery, {
        label: "Images of the stoneware mug", thumbnails: "none",
        images: [
          { src: productArt("#e9e4dc", "#5b7a6a"), alt: "Mug in fern glaze" },
          { src: productArt("#e4e7ee", "#3d5a80"), alt: "Mug in harbour blue" },
          { src: productArt("#efe3dc", "#b5654a"), alt: "Mug in terracotta" },
        ],
      }));
    },
    VariantPicker: function () {
      return e(LiveQuantity, null, e(NS.VariantPicker, { label: "Size", value: "m", onChange: function () {}, options: [
        { value: "s", label: "S" }, { value: "m", label: "M" }, { value: "l", label: "L" }, { value: "xl", label: "XL", disabled: true },
      ] }));
    },
    StoreHeader: function () {
      return e(NS.StoreHeader, {
        name: "Bangkok Kitchen",
        headingLevel: 3,
        rating: { value: 4.6, count: 1284 },
        meta: ["Thai", "$$"],
        deliveryTime: "25–35 min",
        deliveryFee: 0,
        status: { open: true, label: "Open until 10pm" },
        locale: "en-US",
      });
    },
    FulfilmentToggle: function () {
      return e(LiveQuantity, null, e(NS.FulfilmentToggle, { label: "How to get your order", value: "delivery", onChange: function () {} }));
    },
    MenuSection: function () {
      return e(
        NS.MenuSection,
        { title: "Noodles", headingLevel: 3 },
        e(NS.MenuItem, { name: "Pad thai", price: 12.5, locale: "en-US" }),
        e(NS.MenuItem, { name: "Pad see ew", price: 12, locale: "en-US" })
      );
    },
    MenuItem: function () {
      return e(NS.MenuItem, {
        name: "Pad thai",
        description: "Rice noodles, tamarind, egg and peanuts.",
        price: 12.5,
        tags: [{ label: "Popular", kind: "popular" }],
        locale: "en-US",
        onAdd: function () {},
      });
    },
    ModifierGroup: function () {
      return e(LiveQuantity, null, e(NS.ModifierGroup, {
        title: "Choose a size",
        mode: "single",
        required: true,
        options: [{ id: "regular", label: "Regular" }, { id: "large", label: "Large", price: 2 }],
        value: ["regular"],
        locale: "en-US",
        onChange: function () {},
      }));
    },
    CartLine: function () {
      /* Holds the line's quantity; the CartLine element stays the child. */
      function LiveLine(props) {
        var child = props.children;
        var state = React.useState(child.props.quantity);
        return React.cloneElement(child, { quantity: state[0], onQuantityChange: state[1] });
      }
      return e(LiveLine, null, e(NS.CartLine, {
        name: "Linen shirt", details: ["Size M", "Colour Sand"], price: 48, quantity: 1, size: "sm",
        image: { alt: "Linen shirt" }, locale: "en-US", onQuantityChange: function () {}, onRemove: function () {},
      }));
    },
    OrderSummary: function () {
      return e(NS.OrderSummary, {
        locale: "en-US", headingLevel: 3,
        lines: [{ label: "Subtotal", amount: 96 }, { label: "Shipping", amount: 0 }, { label: "Discount (SUMMER10)", amount: 9.6, kind: "discount" }],
        total: { amount: 86.4 },
      });
    },
    PromoCode: function () {
      return e(LiveQuantity, null, e(NS.PromoCode, { value: "", onChange: function () {}, onApply: function () {} }));
    },
    AddressFields: function () {
      return e(LiveQuantity, null, e(NS.AddressFields, {
        value: { name: "Ana Ribeiro", line1: "221 Harbour Street", line2: "", city: "Portland", region: "Oregon", postalCode: "97204", country: "United States" },
        fields: { line2: false, phone: false }, onChange: function () {},
      }));
    },
    PaymentFields: function () {
      return e(LiveQuantity, null, e(NS.PaymentFields, { value: { number: "4242 4242 4242 4242", expiry: "12 / 28", cvc: "" }, fields: { name: false }, onChange: function () {} }));
    },
    OrderStatus: function () {
      return e(NS.OrderStatus, {
        label: "Order progress", current: "shipped",
        steps: [{ id: "ordered", label: "Ordered", time: "Sep 28" }, { id: "shipped", label: "Shipped", time: "Sep 29" }, { id: "delivered", label: "Delivered", time: "Expected Oct 2" }],
      });
    },
    /* Food blocks. Their cards say why they have no tile (NOTES); these are
       what the server-render check draws them from. */
    MenuBlock: function () {
      return e(NS.MenuBlock, {
        spacing: "none", locale: "en-US",
        store: { name: "Bangkok Kitchen", headingLevel: 3, meta: ["Thai", "$$"], deliveryTime: "25–35 min", status: { open: true, label: "Open until 10pm" } },
        sections: [
          { id: "popular", title: "Popular", items: [{ id: "pad-thai", name: "Pad thai", price: 12.5 }] },
          { id: "noodles", title: "Noodles", items: [{ id: "see-ew", name: "Pad see ew", price: 12 }] },
        ],
        onItemAdd: function () {},
      });
    },
    OrderTrackingBlock: function () {
      return e(NS.OrderTrackingBlock, {
        spacing: "none", locale: "en-US", headingLevel: 3, title: "Your order is on its way", eta: "Arriving 7:45–7:55 pm",
        status: { current: "on-the-way", steps: [{ id: "placed", label: "Order placed" }, { id: "on-the-way", label: "On the way" }, { id: "delivered", label: "Delivered" }] },
        courier: { name: "Sam", vehicle: "Blue e-bike", onCall: function () {}, onMessage: function () {} },
        lines: [{ name: "Pad thai", price: 12.5, quantity: 1 }],
        summary: { lines: [{ label: "Subtotal", amount: 12.5 }, { label: "Delivery", amount: 2.99 }], total: { amount: 15.49 } },
      });
    },
  };

  /* A flat product shot for the commerce specimens: a mug in a glaze colour
     on a backdrop, as an inline SVG so no photo is fetched. */
  function productArt(bg, glaze) {
    return "data:image/svg+xml," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='" + bg + "'/>" +
      "<ellipse cx='48' cy='77' rx='24' ry='4' fill='#000' opacity='.08'/>" +
      "<path d='M64 43h5a8 8 0 0 1 0 16h-5' fill='none' stroke='" + glaze + "' stroke-width='5'/>" +
      "<rect x='30' y='34' width='36' height='43' rx='5' fill='" + glaze + "'/></svg>");
  }

  /* Holds the value of a controlled specimen, so it can be used on the card.
     The component's own element stays the child, where the playground finds
     its starting props. */
  function LiveQuantity(props) {
    var child = props.children;
    var state = React.useState(child.props.value);
    return React.cloneElement(child, { value: state[0], onChange: state[1] });
  }

  /* Why a card has no specimen, in the card. */
  var NOTES = {
    Dialog: "Opens over the page, so it is shown on its own card.",
    Drawer: "Slides in over the page, so it is shown on its own card.",
    Sheet: "Rises over the page, so it is shown on its own card.",
    MenuSheet: "Grows out of a menu button over the page, so it is shown on its own card.",
    HeroBlock: "A full-width page section, so it is shown on its own card.",
    FeatureGridBlock: "A full-width page section, so it is shown on its own card.",
    SplitBlock: "A full-width page section, so it is shown on its own card.",
    StatsBlock: "A full-width page section, so it is shown on its own card.",
    TestimonialBlock: "A full-width page section, so it is shown on its own card.",
    FaqBlock: "A full-width page section, so it is shown on its own card.",
    CtaBlock: "A full-width page section, so it is shown on its own card.",
    ChatBlock: "A whole conversation panel with its own header and composer, so it is shown on its own card.",
    MenuBlock: "A full-width page section, so it is shown on its own card.",
    OrderTrackingBlock: "A full-width page section, so it is shown on its own card.",
    ProductGridBlock: "A full-width page section, so it is shown on its own card.",
    ProductDetailBlock: "A full-width page section, so it is shown on its own card.",
    CartBlock: "A full-width page section, so it is shown on its own card.",
    CheckoutBlock: "A full-width page section, so it is shown on its own card.",
    ToastRegion: "Fixed to a corner of the viewport, so it is shown on its own card.",
    VisuallyHidden: "Renders nothing visible. That is the whole job.",
  };

  /* Starting points for the builder (assets/builder-frame.js) for the
     components the index shows as a note, not a specimen: the page-width
     blocks, plus two that have no tile of their own. The index never renders
     these; a block dropped onto the builder's canvas starts from them. */
  var noop = function () {};
  var art = function (bg, glaze) {
    return e("img", { src: productArt(bg, glaze), alt: "", style: { display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--dt-radius-media)" } });
  };
  var SAMPLES = {
    BlockHeader: function () {
      return e(NS.BlockHeader, { eyebrow: "Shop", title: "Everything in the studio", lead: "Eight things we make, in the glazes we fire this season." });
    },
    HeroBlock: function () {
      return e(NS.HeroBlock, {
        eyebrow: "The autumn collection", title: "Made slowly. Used every day.",
        lead: "Stoneware, glass and brass from small workshops, made to be used, washed and used again.",
        actions: e(NS.Inline, { gap: "sm" }, e(NS.Button, null, "Shop the collection"), e(NS.Button, { variant: "secondary" }, "Our story")),
        media: art("#e8e2d8", "#5d7a6a"),
      });
    },
    FeatureGridBlock: function () {
      return e(NS.FeatureGridBlock, {
        eyebrow: "Why it lasts", title: "Built for the everyday", columns: 3,
        items: [
          { title: "Fired twice", description: "A second firing makes the glaze hard enough for the dishwasher." },
          { title: "Repairable", description: "Chips and cracks are mended free for the first five years." },
          { title: "Made nearby", description: "Every piece comes from a workshop within a day's drive." },
        ],
      });
    },
    SplitBlock: function () {
      return e(NS.SplitBlock, {
        eyebrow: "The workshop", title: "Thrown by hand, one at a time",
        body: "Each mug is shaped on the wheel, trimmed the next morning and glazed by the same person.",
        points: ["Food-safe glazes", "Lead-free clay", "Seconds sold at half price"],
        actions: e(NS.Button, { variant: "secondary" }, "Visit the studio"),
        media: art("#dfe6e0", "#b5654a"),
      });
    },
    StatsBlock: function () {
      return e(NS.StatsBlock, {
        title: "By the numbers",
        stats: [{ value: "12", label: "Workshops" }, { value: "4,800", label: "Pieces this year" }, { value: "5 yrs", label: "Free repairs" }],
      });
    },
    TestimonialBlock: function () {
      return e(NS.TestimonialBlock, {
        title: "Kind words",
        quotes: [
          { quote: "The only mug in the house everyone fights over.", name: "Ana Ruiz", role: "Customer since 2021" },
          { quote: "Sent one back with a chip and it came home mended.", name: "Sam Okafor", role: "Customer since 2019" },
        ],
      });
    },
    FaqBlock: function () {
      return e(NS.FaqBlock, {
        title: "Questions",
        items: [
          { id: "dish", question: "Is it dishwasher safe?", answer: "Yes. The second firing makes the glaze hard enough." },
          { id: "ship", question: "How long does shipping take?", answer: "Three to five working days, packed in paper." },
        ],
        defaultOpen: ["dish"],
      });
    },
    CtaBlock: function () {
      return e(NS.CtaBlock, { title: "Ready for a better mug?", lead: "Free shipping over $75, and free repairs for five years.", actions: e(NS.Button, null, "Shop now") });
    },
    Composer: function () {
      return e(NS.Composer, { value: "", onChange: noop, onSend: noop, label: "Message", placeholder: "Write a message" });
    },
    ChatBlock: function () {
      return e(NS.ChatBlock, {
        title: "Maya Chen", subtitle: "Support · usually replies in 2 min", presence: "online", onRetry: noop,
        messages: [
          { id: "a", from: "them", day: "Today", text: "Hi! How can I help with your order?", time: "9:12" },
          { id: "b", from: "me", text: "Where is my mug? It was due yesterday.", time: "9:13", status: "read" },
          { id: "c", from: "them", text: "It shipped this morning. You'll have it tomorrow.", time: "9:14" },
        ],
        quickReplies: { options: [{ id: "track", label: "Track my order" }, { id: "person", label: "Talk to a person" }], onSelect: noop },
        composer: { value: "", onChange: noop, onSend: noop },
        height: 420,
      });
    },
    ProductGridBlock: function () {
      return e(NS.ProductGridBlock, {
        eyebrow: "Shop", title: "New in", columns: 3,
        products: [
          { id: "mug", name: "Stoneware mug", price: 24, href: "#mug", locale: "en-US", image: { src: productArt("#e8e2d8", "#5d7a6a"), alt: "" } },
          { id: "cup", name: "Espresso cup", price: 18, href: "#cup", locale: "en-US", image: { src: productArt("#efe6dc", "#b5654a"), alt: "" } },
          { id: "jug", name: "Milk jug", price: 32, compareAt: 40, href: "#jug", locale: "en-US", image: { src: productArt("#e3e8ee", "#4a6a8a"), alt: "" } },
        ],
      });
    },
    ProductDetailBlock: function () {
      return e(NS.ProductDetailBlock, {
        name: "Stoneware mug", subtitle: "Fern glaze, 350 ml", price: 24, locale: "en-US", rating: { value: 4.6, count: 128 },
        images: [{ src: productArt("#e8e2d8", "#5d7a6a"), alt: "The mug from the front" }, { src: productArt("#efe6dc", "#5d7a6a"), alt: "The mug from the side" }],
        description: "Thrown by hand and fired twice, so it goes in the dishwasher.",
        variants: [{ label: "Glaze", value: "fern", onChange: noop, options: [{ value: "fern", label: "Fern" }, { value: "clay", label: "Clay" }] }],
        quantity: 1, onQuantityChange: noop, onAddToCart: noop,
        details: [{ title: "Care", content: "Dishwasher and microwave safe." }, { title: "Shipping", content: "Free over $75." }],
      });
    },
    CartBlock: function () {
      return e(NS.CartBlock, {
        lines: [
          { id: "mug", name: "Stoneware mug", details: ["Fern"], price: 24, quantity: 2, locale: "en-US", image: { src: productArt("#e8e2d8", "#5d7a6a"), alt: "" }, onQuantityChange: noop, onRemove: noop },
          { id: "jug", name: "Milk jug", price: 32, quantity: 1, locale: "en-US", image: { src: productArt("#e3e8ee", "#4a6a8a"), alt: "" }, onQuantityChange: noop, onRemove: noop },
        ],
        summary: { locale: "en-US", lines: [{ label: "Subtotal", amount: 80 }, { label: "Shipping", amount: 0 }], total: { amount: 80 } },
        checkoutAction: e(NS.Button, { fullWidth: true }, "Check out"),
      });
    },
    CheckoutBlock: function () {
      return e(NS.CheckoutBlock, {
        email: "", onEmailChange: noop, locale: "en-US", delivery: "standard", onDeliveryChange: noop,
        deliveryOptions: [{ id: "standard", label: "Standard", detail: "3–5 days", price: 0 }, { id: "express", label: "Express", detail: "Next day", price: 12 }],
        lines: [{ id: "mug", name: "Stoneware mug", price: 24, quantity: 2 }],
        summary: { locale: "en-US", lines: [{ label: "Subtotal", amount: 48 }], total: { amount: 48 } },
        submitAction: e(NS.Button, { fullWidth: true }, "Place order"),
      });
    },
  };

  /* The component pages' playground starts from these same specimens. */
  window.DovetailSpecimens = { build: SPECIMENS, notes: NOTES, samples: SAMPLES };
  if (!slots.length) return;

  Array.prototype.forEach.call(slots, function (slot) {
    var name = slot.getAttribute("data-specimen");

    if (NOTES[name]) {
      slot.className = "tile-specimen tile-specimen-note";
      slot.textContent = NOTES[name];
      return;
    }

    var build = SPECIMENS[name];
    if (!build || !NS[name]) return;

    try {
      ReactDOM.createRoot(slot).render(build());
      slot.setAttribute("data-rendered", "");
    } catch (err) {
      /* One bad specimen leaves one empty card, not a broken page. */
      slot.textContent = "";
    }
  });
})();

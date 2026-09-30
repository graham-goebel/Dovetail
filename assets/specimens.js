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
  };

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
    HeroBlock: "A full-width page section, so it is shown on its own card.",
    FeatureGridBlock: "A full-width page section, so it is shown on its own card.",
    SplitBlock: "A full-width page section, so it is shown on its own card.",
    StatsBlock: "A full-width page section, so it is shown on its own card.",
    TestimonialBlock: "A full-width page section, so it is shown on its own card.",
    FaqBlock: "A full-width page section, so it is shown on its own card.",
    CtaBlock: "A full-width page section, so it is shown on its own card.",
    ToastRegion: "Fixed to a corner of the viewport, so it is shown on its own card.",
    VisuallyHidden: "Renders nothing visible. That is the whole job.",
  };

  /* The component pages' playground starts from these same specimens. */
  window.DovetailSpecimens = { build: SPECIMENS, notes: NOTES };
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

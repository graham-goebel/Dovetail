/* The templates a new layout can start from. */

import { emptyDoc, make, makeFrame } from "./tree.js";

/* ------------------------------------------------------------ starters */

function one(name, preset, children, extra) {
  var f = makeFrame(name, preset, true);
  Object.assign(f, extra || {});
  f.root.children = children;
  return { frames: [f], active: f.id };
}
var STARTERS = [
  ["landing", "Landing page", function () {
    return one("Landing", "desktop", [
      make("HeroBlock"), make("FeatureGridBlock", { tone: "subtle" }), make("StatsBlock"),
      make("TestimonialBlock", { tone: "subtle" }), make("CtaBlock", { tone: "brand" }),
    ]);
  }],
  ["store", "Store page", function () {
    return one("Store", "desktop", [make("Navbar", { brand: "Kiln & Co." }), make("ProductGridBlock"), make("SplitBlock", { tone: "subtle" }), make("FaqBlock"), make("CtaBlock", { tone: "brand-muted" })]);
  }],
  ["settings", "Settings form", function () {
    return one("Settings", "desktop", [
      make("Section", { width: "narrow" }, [
        make("Stack", { layer: "block" }, [
          make("Heading", { children: "Workspace settings", level: 3, size: "heading-md" }),
          make("Card", { eyebrow: "", title: "Profile", description: "How the workspace appears to its members." }, [
            make("Stack", { layer: "group" }, [
              make("Input", { label: "Workspace name", size: "sm" }),
              make("Select", { label: "Role", size: "sm" }),
              make("Switch", { label: "Two-factor authentication", defaultChecked: true }),
              make("Checkbox", { label: "Email me about releases", defaultChecked: true }),
            ]),
          ]),
          make("Group", { justify: "flex-end", gap: "sm" }, [make("Button", { variant: "secondary", size: "sm", children: "Cancel" }), make("Button", { size: "sm", children: "Save changes" })]),
        ]),
      ]),
    ], { surface: "subtle" });
  }],
  ["chat", "Support chat (phone)", function () {
    return one("Support chat", "phone", [make("Stack", { gap: "md" }, [make("ChatBlock")], { padding: "md" })], { surface: "subtle", hug: false });
  }],
  ["blank", "Blank frame", function () { return emptyDoc(); }],
];

export { STARTERS, one };

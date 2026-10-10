/* The assistant's hands: the tools it's given, run against the canvas. Every
   value is checked against the design system before it lands: a style must
   be one of its token family's options, a prop one of the component's, and
   inserted JSX is read the way pasted code is. The App passes in what can
   change the document (api), so this stays apart from React.

   It also writes the brief the assistant starts every conversation with
   (systemPrompt): the system's rules, its components and its tokens. That
   text depends only on the system, never on the page or the time, so the
   model's prompt cache keeps it from one request to the next. */

import { DATA, META, PRESETS, TEXT_PROPS, WRAPS } from "../config.js";
import { jsxNodes, readJsxElements } from "./paste.js";
import { cleanNode, fresh, locate } from "./tree.js";
import { layerName } from "./names.js";
import { KINDS, findLayouts, layoutById, layoutLine } from "./layouts.js";
import { compareText } from "./compare.js";
import { specOf, specText } from "./spec.js";
import { STARTERS } from "./starters.js";
import { instancesOf } from "./instances.js";

var FAMILIES = Object.keys(DATA.tokens);
/* The edits batch may run: everything that changes layers in this frame. */
var BATCHABLE = ["set_style", "set_prop", "set_text", "insert_jsx", "replace_jsx", "insert_layout", "insert_instance", "move", "wrap", "duplicate", "rename", "remove"];

/* The templates the assistant can start from: every starter but the blank
   frame, with the sections each one is made of. */
var TEMPLATES = STARTERS.filter(function (st) { return st[0] !== "blank"; });

var TOOLS = [
  { name: "list_pages", description: "The file's pages (the current one marked), and the frames on the current page with their ids, sizes and layer counts.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "read_page", description: "An outline of every layer on a page: one line each, indented by depth, with its id, type, name, text, props and style tokens. Reads the current page unless page names another; frame narrows it to one frame. Read it before changing anything beyond the selection.", input_schema: { type: "object", properties: { page: { type: "string" }, frame: { type: "string" } }, additionalProperties: false } },
  { name: "read_selection", description: "The selected layers (or the frame when nothing is selected): each one's id, type, name, props and style tokens, and its children's ids and types.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "screenshot", description: "A picture of a frame or one layer on the current page, as it's drawn now. Look after visible changes and fix what looks wrong: overlaps, cramped spacing, weak contrast, text that wraps badly. Give width (390 for a phone, 768 for a tablet) or dark (true for dark mode, false for light) to see it drawn that way, out of sight, without changing the canvas.", input_schema: { type: "object", properties: { id: { type: "string" }, width: { type: "integer", minimum: 320, maximum: 2560 }, dark: { type: "boolean" } }, additionalProperties: false } },
  { name: "read_guideline", description: "Read one of the system's guidelines, by topic id from the brief's Guidelines list (accessibility, tokens, theming, voice, colour, space, type…), when a choice depends on it.", input_schema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"], additionalProperties: false } },
  { name: "read_theme", description: "The file's theme: its brand name and colours, whether actions are ink or brand, fonts, corner style, density, page and section tints, texture, whitespace, page width, and its context (product, marketing or social). Read it before a choice that depends on the brand or the context, such as a component's product or marketing variant.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "lint", description: "Check a frame (the one you're in unless frame names another): text contrast as drawn, anything spilling past the edge at 390px wide, contrast in dark mode, labels, alt text, heading order, primary buttons and placeholder copy. Each finding names its layers. Run it after you change something and fix what fails.", input_schema: { type: "object", properties: { frame: { type: "string" } }, additionalProperties: false } },
  { name: "measure", description: "The space between two layers as drawn, across and down, in pixels and as the nearest spacing token.", input_schema: { type: "object", properties: { a: { type: "string" }, b: { type: "string" } }, required: ["a", "b"], additionalProperties: false } },
  { name: "search_components", description: "Find components by what they're for: each match's name, group and one-line purpose. An empty query lists every component by group.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { name: "read_component", description: "A component's props (kinds, options, defaults and notes) and its documentation: when to use it, examples and accessibility.", input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false } },
  { name: "list_tokens", description: "The values a style family accepts. Families: " + FAMILIES.join(", ") + ".", input_schema: { type: "object", properties: { family: { type: "string", enum: FAMILIES } }, required: ["family"], additionalProperties: false } },
  { name: "set_style", description: "Set one style family to one of its token values on layers, or clear it with an empty value. Only token values from list_tokens are allowed.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, family: { type: "string", enum: FAMILIES }, value: { type: "string" } }, required: ["ids", "family", "value"], additionalProperties: false } },
  { name: "set_prop", description: "Set one of a component's own props on layers of that type: its text, or one of the values its enum allows.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, name: { type: "string" }, value: { type: ["string", "number", "boolean"] } }, required: ["ids", "name", "value"], additionalProperties: false } },
  { name: "insert_jsx", description: "Add new layers written as JSX with the design system's components (for example <Section><Heading>…</Heading></Section>) into a container, at an index, or after the selection when parent is omitted.", input_schema: { type: "object", properties: { jsx: { type: "string" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 } }, required: ["jsx"], additionalProperties: false } },
  { name: "replace_jsx", description: "Replace one layer with new layers written as JSX, in its place: the way to rebuild a section or a card in one step.", input_schema: { type: "object", properties: { id: { type: "string" }, jsx: { type: "string" } }, required: ["id", "jsx"], additionalProperties: false } },
  { name: "find_images", description: "Find pictures for the page: first in this file's Content uploads (images and illustrations), by words in their names, each as content:<id>; when none fits and stock photos are set up, it searches stock photos for the query instead, each as stock:<id> with what it shows and who took it. Use the id wherever a picture goes: an Image's or Cover's src, a layout's image field, or a prop set with set_prop. Prefer the person's own uploads; describe a stock search in a few plain words (\"stoneware mug on a table\").", input_schema: { type: "object", properties: { query: { type: "string" }, orientation: { type: "string", enum: ["landscape", "portrait", "squarish"] } }, additionalProperties: false } },
  { name: "search_layouts", description: "Find tested section layouts to build with: heroes, features, stories, proof, showcases, steps, questions and closes, each with its mood, when it fits and the content fields it takes. Filter by kind (" + KINDS.join(", ") + ") or words such as bold, calm, editorial, moving. Nothing given lists them all.", input_schema: { type: "object", properties: { query: { type: "string" }, kind: { type: "string", enum: KINDS } }, additionalProperties: false } },
  { name: "insert_layout", description: "Add a section from search_layouts, filled with your content: into a container at an index, after the selection when parent is omitted, or in place of a layer with replace. content takes the layout's fields (eyebrow, title, lead, action, secondary, image, items, stats, quotes, points, faqs, steps, slides); anything left out gets sample copy, so give real copy for every field the layout lists.", input_schema: { type: "object", properties: { id: { type: "string" }, content: { type: "object" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 }, replace: { type: "string" } }, required: ["id"], additionalProperties: false } },
  { name: "insert_template", description: "Start from one of the builder's templates, the same ones the person adds from Assets: " + TEMPLATES.map(function (st) { return st[0] + " (" + st[1].toLowerCase() + ")"; }).join(", ") + ". Its sections go at the end of the frame you're in, or into parent at index; new_frame puts it in a frame of its own beside yours instead and makes that the one you're in. Its copy is sample copy: set the person's own words after, with set_text or set_prop.", input_schema: { type: "object", properties: { id: { type: "string", enum: TEMPLATES.map(function (st) { return st[0]; }) }, new_frame: { type: "boolean" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 } }, required: ["id"], additionalProperties: false } },
  { name: "list_components", description: "The file's own components, from My components: each one's id, name, what it's made of, how many layers, the tokens it's built on and how many instances this page has. Reuse them before building the same thing again.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "insert_instance", description: "Put down one of the file's own components (an id from list_components) as a linked instance: when the component is updated, the instance follows. Into a container at an index, after the selection when parent is omitted, or in place of a layer with replace. Change its text with set_text like any layer.", input_schema: { type: "object", properties: { id: { type: "string" }, parent: { type: "string" }, index: { type: "integer", minimum: 0 }, replace: { type: "string" } }, required: ["id"], additionalProperties: false } },
  { name: "make_component", description: "Turn a layer into one of the file's own components, named, so it can be reused with insert_instance. The layer becomes its first instance. It must be built on the system's tokens, with no custom colours and nothing placed by position inside it. Do it when the person asks, or when a part repeats on the page and they agree.", input_schema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } }, required: ["id", "name"], additionalProperties: false } },
  { name: "remember", description: "Keep a rule the person taught you, so every later conversation on this file follows it: one short line in their words, like \"Never use brand fills on cards\" or \"Headlines are sentence case\". It goes in a Lessons doc in the file's context (scope project to keep it for every file in the project), which they can edit in the Context panel. Use it when they correct you or state how things should always or never be, not for a one-off request.", input_schema: { type: "object", properties: { lesson: { type: "string" }, scope: { type: "string", enum: ["file", "project"] } }, required: ["lesson"], additionalProperties: false } },
  { name: "frame_spec", description: "A frame (the one you're in unless frame names another) as a spec to build from elsewhere: the components it uses and the variants each is set to, the design tokens behind its styles, the file's own components in it, its layers, and its code as React with Dovetail components. Give id for one layer and what's in it. Use it when the person asks for the code, a spec, or a handoff.", input_schema: { type: "object", properties: { frame: { type: "string" }, id: { type: "string" } }, additionalProperties: false } },
  { name: "set_text", description: "Set a layer's text: a heading's or a paragraph's words, a button's label, a card's title.", input_schema: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false } },
  { name: "move", description: "Move layers into a container, at an index (the end when omitted), in the order given.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, parent: { type: "string" }, index: { type: "integer", minimum: 0 } }, required: ["ids", "parent"], additionalProperties: false } },
  { name: "wrap", description: "Put a layer inside a new container of the given type, or several sibling layers inside one Group.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 }, type: { type: "string", enum: WRAPS } }, required: ["ids"], additionalProperties: false } },
  { name: "duplicate", description: "Copy layers, each copy just after its original.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, required: ["ids"], additionalProperties: false } },
  { name: "rename", description: "Give a layer a name, so the layers list says what it is.", input_schema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } }, required: ["id", "name"], additionalProperties: false } },
  { name: "create_frame", description: "Add a frame to this page and make it the one you're working in. structured frames are auto layout pages (they start with a Content group to fill, whose id comes back); free frames place layers anywhere. Presets: " + PRESETS.map(function (f) { return f.id + " (" + f.width + "×" + f.height + ")"; }).join(", ") + ".", input_schema: { type: "object", properties: { name: { type: "string" }, preset: { type: "string", enum: PRESETS.map(function (f) { return f.id; }) }, mode: { type: "string", enum: ["structured", "free"] } }, required: ["name", "preset", "mode"], additionalProperties: false } },
  { name: "make_variants", description: "Try a few directions side by side: copies a frame (the one you're in unless you name another) once per label, beside it, named after the label, and hands back each copy's id. Then use_frame into each copy and make its change. The person compares them on the canvas and keeps one, which takes the original's place. Use it when they ask to see options, or pick Try them all on a question.", input_schema: { type: "object", properties: { frame: { type: "string" }, labels: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } } }, required: ["labels"], additionalProperties: false } },
  { name: "compare_frames", description: "Look at frames side by side to judge them: a picture of each, its checks, and how alike each pair is section by section, with pairs that read as one direction flagged. With no frames given it compares the frame you're in and its variants. Give width (390) or dark to see them all that way. Call it when variants are built, then grade them.", input_schema: { type: "object", properties: { frames: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } }, width: { type: "integer", minimum: 320, maximum: 2560 }, dark: { type: "boolean" } }, additionalProperties: false } },
  { name: "use_frame", description: "Work in another frame on this page: the edit tools act on the frame you're in.", input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false } },
  { name: "propose_plan", description: "Before a new page or frame, or any change that adds more than about 10 layers, show the person a short plan and wait for their answer: the frame it goes in (when it's a new one), the steps in order (a title and a line each), and anything they should know (missing content you'll stand in for, a choice you made). It comes back approved, or with what they want changed.", input_schema: { type: "object", properties: { title: { type: "string" }, frame: { type: "object", properties: { name: { type: "string" }, preset: { type: "string" }, mode: { type: "string", enum: ["structured", "free"] } }, additionalProperties: false }, steps: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" } }, required: ["title"], additionalProperties: false } }, notes: { type: "array", maxItems: 4, items: { type: "string" } } }, required: ["title", "steps"], additionalProperties: false } },
  { name: "ask_user", description: "Ask the person to choose when the request leaves a real choice open: two to four ways that would set a different tone or direction, which the request, the docs and the theme don't settle. Each option is a short label and a line on what it means (the components and tokens it would use). The answer comes back as the option they picked, or what they wrote instead. Don't ask about what you can decide yourself.", input_schema: { type: "object", properties: { question: { type: "string" }, options: { type: "array", minItems: 2, maxItems: 4, items: { type: "object", properties: { label: { type: "string" }, detail: { type: "string" } }, required: ["label"], additionalProperties: false } } }, required: ["question", "options"], additionalProperties: false } },
  { name: "batch", description: "Run several edit calls in order as one step the person can undo at once. Each call is { name, input } for one of: " + BATCHABLE.join(", ") + ". It stops at the first call that fails, keeping the ones before it.", input_schema: { type: "object", properties: { calls: { type: "array", minItems: 1, maxItems: 40, items: { type: "object", properties: { name: { type: "string", enum: BATCHABLE }, input: { type: "object" } }, required: ["name", "input"], additionalProperties: false } } }, required: ["calls"], additionalProperties: false } },
  { name: "remove", description: "Remove layers.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, required: ["ids"], additionalProperties: false } },
  { name: "select", description: "Select layers, so the person sees them.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"], additionalProperties: false } },
  { name: "read_skill", description: "Read a skill's files when a request fits its description: its SKILL.md, or another file by path.", input_schema: { type: "object", properties: { name: { type: "string" }, path: { type: "string" } }, required: ["name"], additionalProperties: false } },
];

/* The tools for one conversation: screenshot only when the assistant may
   look at the canvas, propose_plan only when plans come first. The order
   never changes, so the cache holds. */
function toolsFor(opts) {
  var look = !opts || opts.look !== false, plan = !opts || opts.plan !== false;
  return TOOLS.filter(function (t) { return (look || t.name !== "screenshot") && (plan || t.name !== "propose_plan"); });
}

var LABEL = { surface: "Fill", radius: "Corners", elevation: "Shadow", border: "Border", padding: "Padding", gap: "Gap", blur: "Blur", backdrop: "Behind", opacity: "Opacity", gradient: "Gradient" };
function familyWord(f) { return LABEL[f] || f.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }); }

/* A layer, as the assistant reads it. */
function describe(n) {
  return { id: n.id, type: n.type, name: n.name || undefined, props: n.props, style: n.style,
    children: (n.children || []).map(function (c) { return { id: c.id, type: c.type, name: c.name || undefined }; }) };
}

var TEXT_KEYS = ["children", "title", "label", "text", "heading", "description", "alt"];
function short(v, n) { var t = String(v).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }

/* One layer as a line of the outline. */
function line(n, depth) {
  var bits = [n.type + (n.name && n.name !== n.type ? " \"" + short(n.name, 40) + "\"" : ""), n.id];
  var props = n.props || {};
  TEXT_KEYS.forEach(function (k) { if (typeof props[k] === "string" && props[k].trim()) bits.push(k === "children" ? "\"" + short(props[k], 80) + "\"" : k + "=\"" + short(props[k], 60) + "\""); });
  Object.keys(props).sort().forEach(function (k) {
    var v = props[k];
    if (TEXT_KEYS.indexOf(k) >= 0 || v == null || v === "" || typeof v === "object") return;
    bits.push(k + "=" + short(v, 40));
  });
  var st = n.style || {};
  var toks = Object.keys(st).sort().filter(function (k) { return st[k] != null && st[k] !== "" && typeof st[k] !== "object"; }).map(function (k) { return k + ":" + st[k]; });
  if (toks.length) bits.push("{" + toks.join(" ") + "}");
  if (n.hidden) bits.push("hidden");
  if (n.locked) bits.push("locked");
  return new Array(depth + 1).join("  ") + "- " + bits.join(" · ");
}

var OUTLINE_MAX = 400;
function count(n) { return 1 + (n.children || []).reduce(function (a, c) { return a + count(c); }, 0); }

/* A page's frames as an outline, the frame narrowed to one when fid names
   it. Long pages stop at OUTLINE_MAX lines and say how many are left. */
function outline(doc, fid) {
  var out = [], left = 0;
  (doc.frames || []).filter(function (f) { return !fid || f.id === fid; }).forEach(function (f) {
    out.push("Frame \"" + f.name + "\" " + f.id + " · " + (f.mode || "free") + " · " + f.width + (f.height ? "×" + f.height : "") + (f.id === doc.active ? " · active" : "") + (f.dark ? " · dark" : ""));
    (function walk(n, depth) {
      (n.children || []).forEach(function (c) {
        if (out.length >= OUTLINE_MAX) { left += count(c); return; }
        out.push(line(c, depth));
        walk(c, depth + 1);
      });
    })(f.root, 1);
  });
  if (left) out.push("… and " + left + " more layers. Read one frame at a time with frame.");
  return out.join("\n");
}

/* A guideline's text as the assistant reads it: Markdown as it is, an HTML
   page as its words. */
function plainGuide(file, text) {
  if (/\.md$/.test(file)) return String(text || "");
  return String(text || "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, " ").trim();
}

/* The brief: what the assistant is working with and how. Built from the
   system alone and the same on every request. */
var brief = null;
var SIDES = /^(padding|margin|border|radius)(Top|Right|Bottom|Left|TopLeft|TopRight|BottomLeft|BottomRight)$/;
function systemPrompt() {
  if (brief) return brief;
  /* Each component with when to use it and when not, from its own guide. */
  var first = function (t) { var m = /^.*?[.!?](?=\s|$)/.exec(String(t || "")); return m ? m[0] : String(t || ""); };
  var line2 = function (t) {
    var m = META[t], g = m.guide || {};
    var out = "- " + t + (m.container ? " (holds layers)" : "") + ": " + short(first(g.lead || m.blurb), 120);
    if (g.use && g.use.length) out += " Use: " + short(g.use[0], 90);
    if (g.avoid && g.avoid.length) out += " Not: " + short(g.avoid[0], 90);
    else if (g.rules && g.rules.length) out += " Rule: " + short(g.rules[0], 90);
    return out;
  };
  var comps = (DATA.groups || []).map(function (g) {
    return "## " + g.label + "\n" + g.items.filter(function (t) { return META[t]; }).map(line2).join("\n");
  }).join("\n\n");
  /* Each token value with what it's for, where the system says. */
  var fams = FAMILIES.filter(function (f) { return !SIDES.test(f); }).map(function (f) {
    return "- " + f + ": " + DATA.tokens[f].options.map(function (o) { return o.use ? o.value + " (" + short(first(o.use), 48) + ")" : o.value; }).join(", ");
  }).join("\n");
  var guides = {};
  (DATA.guidelines || []).forEach(function (x) { (guides[x.group] = guides[x.group] || []).push(x.id); });
  var sides = FAMILIES.filter(function (f) { return SIDES.test(f); });
  brief = [
    "# Working in the Dovetail Builder",
    "You design on a canvas made only of the Dovetail design system: its components, laid out in frames, styled only with its tokens. The tools are your hands. Changes land on the canvas as you make them, and the person can undo any of them.",
    "## How to work",
    "- Read before you change. read_selection for the selection; read_page before anything wider, or when you need ids.",
    "- Prefer a component that already does the job over a styled Group or Shape. Its Use and Not lines below say when; read_component for its variants, props and examples before you use one you haven't read in this conversation.",
    "- Choose token values by what they're for (each family below says), not by how they look: raised for cards, subtle for a quiet band, brand-muted for a band with presence.",
    "- When the brand or the context matters (a component's product or marketing variant, the voice of copy), read_theme first; read_guideline for the rules on a topic.",
    "- A new page starts with create_frame (structured for web pages, a social preset for posts), then fills its Content group.",
    "- Build sections from the layouts library: search_layouts for the kind of section and the mood asked for, then insert_layout with real copy for its fields (replace to swap one in for an existing section). Write JSX only for what no layout covers. A page reads best when its sections vary: alternate light and dark or brand bands, and don't repeat a layout.",
    "- Reuse what the file already has. list_components shows its own components (My components); put one down with insert_instance rather than building it again, and when a part you built repeats, offer make_component. When the ask matches a template (a landing page, a store page, a settings form, a support chat), insert_template gives you its sections to start from; then set the person's copy in place of the sample copy.",
    "- Rebuild a section with replace_jsx rather than many small edits, and put a set of related edits in one batch, so the person can undo them at once.",
    "- Write real, short copy in the brand's voice. Never lorem ipsum.",
    "- When the person attaches a picture, it's a reference to build from: read its sections and hierarchy, rebuild them with layouts and components (its structure and rhythm, not its colours or fonts, unless they ask), then screenshot what you made and say plainly how it compares and what you left out.",
    "- When the person corrects you, or says how things should always or never be, call remember with it as one short rule, then follow it. The Lessons doc in the context holds what earlier conversations taught you: follow it over your own taste. Don't save one-off requests.",
    "- Use the person's pictures: find_images lists their Content uploads; put one in with its content:<id> wherever a picture goes (a layout's image field, an Image or Cover src). Leave a placeholder only when nothing fits.",
    "- After a visible change, look with screenshot when you have it, and fix what looks wrong before you finish. For a page, look at 390 wide and in dark mode too (screenshot with width or dark) when the change touches layout or colour, or the checks flag them.",
    "- Run lint on the frame when you've finished changing it, and fix what fails. The person sees the same checks under your reply.",
    "- If the request is unclear or would change a lot more than asked, say what you'd do and ask first. When it leaves a real choice of direction open (two good answers with a different tone), call ask_user with the options rather than guessing.",
    "- When the person wants to see options, make_variants copies the frame once per option, side by side; build each in its copy and say how they differ. They keep one. Make the copies differ in more than colour: swap in different layouts (insert_layout with replace), bands and type sizes, so each is a real direction. When they're built, compare_frames and grade each from 1 to 5 on hierarchy, rhythm, contrast and fit to its direction; rebuild what scores below 3 or is flagged too alike, compare once more, and say the grades in your reply.",
    "- A message may start with what the person changed on the canvas since your last reply. Keep those changes unless they ask otherwise, and build on them.",
    "- Before a new page or frame, or a change that adds more than about 10 layers, call propose_plan and wait for the answer, unless the canvas notes say plans are off. Building without one is refused.",
    "- Finish with a sentence or two on what you changed and anything the person should check.",
    "## The system's rules",
    "- Tokens only: every colour, size, space, radius and shadow is a token value from list_tokens. Never invent one.",
    "- Dark areas: use a Section's dark tone (or a frame's dark mode) rather than dark fills on light layers, so text and controls follow.",
    "- Every layout must work 390px wide, in dark mode, and with reduced motion.",
    "- Accessibility: headings in order, one primary action per view, labels on every field, alt text on informative images, and text contrast of at least 4.5:1.",
    "- Structured frames are auto layout: order matters, positions don't. Free frames place layers by x and y.",
    "# Components",
    comps,
    "# Style token families",
    "A layer's style maps a family to one value.",
    fams,
    sides.length ? "Per-side families take the same values as their base family: " + sides.join(", ") + "." : "",
    "# Guidelines",
    "Read any of these with read_guideline:",
    Object.keys(guides).map(function (k) { return "- " + k + ": " + guides[k].join(", "); }).join("\n"),
  ].filter(Boolean).join("\n\n");
  return brief;
}

/* A change big enough to want a plan first: a new frame, or more than
   PLAN_OVER layers added. api.needsPlan(size) says whether one is still
   owed (plans are on and none was approved this turn). */
var PLAN_OVER = 10;
function owesPlan(api, size) {
  if (!api.needsPlan) return null;
  var big = size === "frame" || size > PLAN_OVER;
  if (!big || !api.needsPlan()) return null;
  return { ok: false, result: (size === "frame" ? "A new frame" : "Adding " + size + " layers") + " is a big change. Call propose_plan first and wait for the person's answer." };
}
/* The file's own components (My components), and one put down as a linked
   instance: a fresh copy with new ids and no position of its own. */
function ownComponents(api) {
  var lib = api.library ? api.library() || {} : {};
  return (lib.components || []).filter(function (c) { return c && c.id && c.node; });
}
function instanceNode(comp) {
  var n = cleanNode(JSON.parse(JSON.stringify(comp.node)), null);
  if (!n) return null;
  n = fresh(n);
  delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv;
  n.name = comp.name;
  n.inst = { of: comp.id, rev: comp.rev || 1 };
  return n;
}
function added(nodes) { return nodes.reduce(function (a, n) { return a + count(n); }, 0); }

/* JSX into new layers, the way pasted code is read: unknown tags add nothing.
   api, when given, swaps content: pictures for the uploads first (cleaning
   would drop them as addresses it doesn't know); the ones not found are
   listed on the result as missing. */
function fromJsx(jsx, api) {
  var els = readJsxElements(String(jsx || ""));
  var raw = els.length ? jsxNodes(els, []) : [];
  var missing = api ? withContent(api, raw) : [];
  var out = raw.map(function (n) { return cleanNode(n, null); }).filter(Boolean).map(fresh);
  out.missing = missing;
  return out;
}

/* A picture from the Content uploads, named content:<id> by find_images,
   swapped for the upload itself wherever it's used. */
var CONTENT_REF = /^(content|stock):([\w-]+)$/;
/* The stock photos found so far, by id, so stock:<id> can be used later in
   the conversation. */
var STOCK = {};
var PICTURE_KINDS = ["images", "illustrations"];
function uploads(api) {
  var lib = api.library ? api.library() || {} : {};
  var out = [];
  PICTURE_KINDS.forEach(function (k) { (lib[k] || []).forEach(function (it) { if (it && it.src && !it.removed) out.push({ id: it.id, kind: k, name: it.name || "", src: it.src }); }); });
  return out;
}
function fromContent(api, v) {
  var m = typeof v === "string" && CONTENT_REF.exec(v);
  if (!m) return v;
  if (m[1] === "stock") {
    var ph = STOCK[m[2]];
    if (!ph) return v;
    /* Kept in Content with its credit, and the service told, once used. */
    if (api.stockUsed) api.stockUsed(ph);
    return ph.url;
  }
  var hit = uploads(api).filter(function (u) { return u.id === m[2]; })[0];
  return hit ? hit.src : v;
}
/* The same through new layers' props, and the ids that weren't found. */
function withContent(api, nodes) {
  var missing = [];
  (function walk(list) {
    list.forEach(function (n) {
      Object.keys(n.props || {}).forEach(function (k) {
        var v = n.props[k];
        if (typeof v !== "string" || !CONTENT_REF.test(v)) return;
        var got = fromContent(api, v);
        if (got === v) missing.push(v); else n.props[k] = got;
      });
      walk(n.children || []);
    });
  })(nodes);
  return missing;
}

/* Runs one tool call. api: { doc(), selection(), setStyle(ids, key, value),
   setProp(ids, name, value), insert(parent, index, nodes), remove(ids),
   select(ids), skills(), pages(), loadPage(id), screenshot(fid, id),
   componentDoc(name), replace(id, nodes), move(ids, parent, index),
   wrap(id, type), group(ids), duplicate(ids), rename(id, name),
   createFrame(opts), useFrame(fid), batch(fn), runChecks(fid),
   measure(a, b), proposePlan(plan), needsPlan(), guideline(entry),
   theme() }. Returns { ok, result,
   change, changes, step }, or a promise
   of one for the tools that wait (another page, a picture, a component's
   docs). change, for one that edited the canvas, says what in a line for
   the change card (changes, a list of them, for a batch); step says what it read, for the thread. result is text,
   or for a picture the content blocks of an image and a line about it. */
function runTool(api, call) {
  var input = call.input || {};
  var fail = function (msg) { return { ok: false, result: msg }; };
  var doc = api.doc();
  var known = function (ids) { return (ids || []).filter(function (id) { return typeof id === "string" && locate(doc, id); }); };
  var nameOf = function (id) { var at = locate(doc, id); return at ? layerName(at.node) : id; };
  switch (call.name) {
    case "list_pages": {
      var pages = api.pages ? api.pages() : [];
      var frames = (doc.frames || []).map(function (f) { return { id: f.id, name: f.name, mode: f.mode || "free", width: f.width, height: f.height || undefined, layers: count(f.root) - 1, active: f.id === doc.active || undefined }; });
      return { ok: true, result: JSON.stringify({ pages: pages, frames: frames }), step: "Listed " + pages.length + (pages.length === 1 ? " page" : " pages") };
    }
    case "read_page": {
      var pagesNow = api.pages ? api.pages() : [];
      var here = pagesNow.filter(function (pg) { return pg.current; })[0];
      var other = input.page && (!here || input.page !== here.id) ? pagesNow.filter(function (pg) { return pg.id === input.page || pg.name === input.page; })[0] : null;
      if (input.page && !other && !(here && (input.page === here.id || input.page === here.name))) return fail("There's no page called " + input.page + ". Call list_pages for them.");
      var from = function (d, label) {
        if (!d) return fail("That page couldn't be read.");
        if (input.frame && !(d.frames || []).some(function (f) { return f.id === input.frame; })) return fail("There's no frame " + input.frame + " on " + label + ".");
        var n = (d.frames || []).filter(function (f) { return !input.frame || f.id === input.frame; }).reduce(function (a, f) { return a + count(f.root) - 1; }, 0);
        return { ok: true, result: outline(d, input.frame || null), step: "Read " + label + " · " + n + (n === 1 ? " layer" : " layers") };
      };
      if (other) return Promise.resolve(api.loadPage(other.id)).then(function (d) { return from(d, other.name); }, function () { return fail("That page couldn't be read."); });
      return from(doc, here ? here.name : "the page");
    }
    case "screenshot": {
      if (!api.screenshot) return fail("Looking at the canvas is turned off for this file.");
      var frameOf = (doc.frames || []).filter(function (f) { return f.id === input.id; })[0];
      var inFrame = null, shotAt = null;
      if (input.id && !frameOf && input.id !== "root") (doc.frames || []).some(function (f) { var at = locate(doc, input.id, f.id); if (at) { inFrame = f; shotAt = at; } return !!at; });
      if (input.id && input.id !== "root" && !shotAt && !frameOf) return fail("There's no layer or frame " + input.id + " on this page.");
      var fr = frameOf || inFrame || (doc.frames || []).filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0];
      var what = shotAt ? layerName(shotAt.node) : fr.name;
      var width = typeof input.width === "number" ? Math.max(320, Math.min(2560, Math.round(input.width))) : null;
      var dark = typeof input.dark === "boolean" ? input.dark : null;
      var how = [width ? "at " + width + " wide" : "", dark === true ? "in dark mode" : dark === false ? "in light mode" : ""].filter(Boolean).join(" ");
      var opts = width || dark !== null ? { width: width, dark: dark } : null;
      var note = width && fr.mode !== "structured" ? " A freeform frame places layers by position, so it isn't reflowed at another width." : "";
      return Promise.resolve(api.screenshot(fr.id, shotAt ? input.id : null, opts)).then(function (pic) {
        if (!pic || !pic.data) return fail("The picture couldn't be made.");
        return { ok: true, result: [{ type: "image", source: { type: "base64", media_type: pic.media_type, data: pic.data } }, { type: "text", text: what + (how ? " " + how : "") + ", " + pic.width + "×" + pic.height + " pixels." + note }], step: "Looked at " + what + (how ? " " + how : ""), shot: pic };
      }, function (err) { return fail((err && err.message) || "The picture couldn't be made."); });
    }
    case "read_guideline": {
      var list = DATA.guidelines || [];
      var want = String(input.topic || "").toLowerCase().trim();
      var g = list.filter(function (x) { return x.id === want; })[0] ||
        list.filter(function (x) { return x.title.toLowerCase() === want; })[0] ||
        list.filter(function (x) { return want && (x.id.indexOf(want) >= 0 || x.title.toLowerCase().indexOf(want) >= 0); })[0];
      if (!g) return fail("There's no guideline " + JSON.stringify(input.topic) + ". Topics: " + list.map(function (x) { return x.id; }).join(", ") + ".");
      if (!api.guideline) return fail("Guidelines can't be read here.");
      return Promise.resolve(api.guideline(g)).then(function (text) {
        if (!text) return fail("The " + g.title + " guideline couldn't be read.");
        return { ok: true, result: "# " + g.title + (g.about ? "\n" + g.about : "") + "\n\n" + String(text).slice(0, 12000), step: "Read the " + g.title + " guideline" };
      }, function () { return fail("The " + g.title + " guideline couldn't be read."); });
    }
    case "read_theme": {
      var th = api.theme ? api.theme() : null;
      if (!th) return fail("The theme isn't loaded yet.");
      return { ok: true, result: JSON.stringify(th), step: "Read the theme" };
    }
    case "lint": {
      var lf = input.frame ? (doc.frames || []).filter(function (f) { return f.id === input.frame; })[0] : (doc.frames || []).filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0];
      if (!lf) return fail("There's no frame " + input.frame + " on this page.");
      if (!api.runChecks) return fail("Checks can't run here.");
      return Promise.resolve(api.runChecks(lf.id)).then(function (got) {
        return { ok: true, result: got.text, step: "Checked " + lf.name, checks: got.rows, frame: lf.id };
      }, function (err) { return fail((err && err.message) || "The checks couldn't run."); });
    }
    case "measure": {
      if (!locate(doc, input.a) || !locate(doc, input.b)) return fail("Both layers must be in the frame you're in.");
      if (!api.measure) return fail("Measuring can't run here.");
      return Promise.resolve(api.measure(input.a, input.b)).then(function (m) {
        if (!m) return fail("Those layers aren't drawn.");
        return { ok: true, result: JSON.stringify(m), step: "Measured " + nameOf(input.a) + " to " + nameOf(input.b) };
      });
    }
    case "search_components": {
      var q = String(input.query || "").toLowerCase().trim();
      var words = q.split(/[^a-z0-9]+/).filter(Boolean);
      var all = Object.keys(META).filter(function (t) { return !META[t].builder; });
      if (!words.length) {
        var byGroup = (DATA.groups || []).map(function (g) { return g.label + ": " + g.items.filter(function (t) { return META[t]; }).join(", "); }).join("\n");
        return { ok: true, result: byGroup, step: "Listed the components" };
      }
      var scored = all.map(function (t) {
        var hay = (t + " " + (META[t].blurb || "") + " " + (META[t].group || "")).toLowerCase();
        var sc = words.reduce(function (a, w) { return a + (t.toLowerCase() === w ? 5 : t.toLowerCase().indexOf(w) >= 0 ? 3 : hay.indexOf(w) >= 0 ? 1 : 0); }, 0);
        return { t: t, sc: sc };
      }).filter(function (x) { return x.sc > 0; }).sort(function (a, b) { return b.sc - a.sc || (a.t < b.t ? -1 : 1); }).slice(0, 12);
      if (!scored.length) return { ok: true, result: "No component matches " + JSON.stringify(input.query) + ". Try another word, or an empty query for the full list.", step: "Searched components for “" + short(input.query, 30) + "”" };
      return { ok: true, result: JSON.stringify(scored.map(function (x) { return { name: x.t, group: META[x.t].group, purpose: META[x.t].blurb, holdsLayers: !!META[x.t].container || undefined }; })), step: "Searched components for “" + short(input.query, 30) + "”" };
    }
    case "read_component": {
      var m = META[input.name];
      if (!m) return fail("There's no component called " + input.name + ". Call search_components to find one.");
      var spec2 = { name: input.name, purpose: m.blurb, group: m.group, holdsLayers: !!m.container, guide: m.guide || undefined, props: (m.props || []).map(function (pp) { return { name: pp.name, kind: pp.kind, options: pp.options, default: pp.default, note: pp.note }; }) };
      return Promise.resolve(api.componentDoc ? api.componentDoc(input.name) : null).then(function (md) {
        var text = JSON.stringify(spec2) + (md ? "\n\n# Documentation\n\n" + String(md).slice(0, 8000) : "");
        return { ok: true, result: text, step: "Read " + input.name + "'s docs" };
      }, function () { return { ok: true, result: JSON.stringify(spec2), step: "Read " + input.name + "'s props" }; });
    }
    case "read_selection": {
      var sel = known(api.selection());
      var nodes = sel.length ? sel.map(function (id) { return locate(doc, id).node; }) : [locate(doc, "root") && locate(doc, "root").node].filter(Boolean);
      return { ok: true, result: JSON.stringify(nodes.map(describe)), step: sel.length ? "Read " + sel.length + (sel.length === 1 ? " selected layer" : " selected layers") : "Read the frame" };
    }
    case "list_tokens": {
      var fam = DATA.tokens[input.family];
      if (!fam) return fail("There's no style family called " + input.family + ".");
      return { ok: true, result: JSON.stringify(fam.options.map(function (o) { return { value: o.value, token: o.tokens && o.tokens[0], use: o.use || undefined }; })) };
    }
    case "set_style": {
      var f = DATA.tokens[input.family];
      if (!f) return fail("There's no style family called " + input.family + ".");
      var v = String(input.value == null ? "" : input.value);
      if (v && !f.options.some(function (o) { return o.value === v; })) return fail(v + " isn't one of " + input.family + "'s tokens. Call list_tokens for the ones it has.");
      var ids = known(input.ids);
      if (!ids.length) return fail("None of those layers are on the canvas.");
      if (!api.setStyle(ids, input.family, v || undefined)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: ids, label: familyWord(input.family), value: v || "none", on: ids.map(nameOf).join(", ") } };
    }
    case "set_prop": {
      var pids = known(input.ids);
      if (!pids.length) return fail("None of those layers are on the canvas.");
      var types = pids.map(function (id) { return locate(doc, id).node.type; });
      var spec = META[types[0]] && META[types[0]].props.filter(function (p) { return p.name === input.name; })[0];
      var textProp = input.name === "children" || input.name === "title" || input.name === "label";
      if (!spec && !textProp) return fail(types[0] + " has no prop called " + input.name + ".");
      if (types.some(function (t) { return t !== types[0]; })) return fail("Set a prop on layers of one type at a time.");
      if (spec && spec.kind === "enum" && spec.options.indexOf(input.value) < 0) return fail(input.value + " isn't one of " + input.name + "'s options: " + spec.options.join(", ") + ".");
      var val = fromContent(api, input.value);
      if (typeof input.value === "string" && CONTENT_REF.test(input.value) && val === input.value) return fail("There's no picture " + input.value + ". find_images lists them.");
      if (!api.setProp(pids, input.name, val)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: pids, label: input.name === "children" ? "Text" : input.name.charAt(0).toUpperCase() + input.name.slice(1), value: val !== input.value ? (/^stock:/.test(input.value) ? "a stock photo" : "a Content upload") : String(input.value).slice(0, 60), on: pids.map(nameOf).join(", ") } };
    }
    case "insert_jsx": {
      var made = fromJsx(input.jsx, api);
      if (made.missing.length) return fail("There's no picture " + made.missing[0] + ". find_images lists them.");
      if (!made.length) return fail("That JSX has no components the system knows.");
      var owed = owesPlan(api, added(made));
      if (owed) return owed;
      var ids2 = api.insert(input.parent || null, typeof input.index === "number" ? input.index : null, made);
      if (!ids2 || !ids2.length) return fail("Those layers can't go there.");
      return { ok: true, result: JSON.stringify({ added: ids2 }), change: { ids: ids2, label: "Added", value: made.map(function (n) { return layerName(n); }).join(", "), on: "" } };
    }
    case "replace_jsx": {
      var at0 = locate(doc, input.id);
      if (!at0 || input.id === "root") return fail("There's no layer " + input.id + " in this frame.");
      var made2 = fromJsx(input.jsx, api);
      if (made2.missing.length) return fail("There's no picture " + made2.missing[0] + ". find_images lists them.");
      if (!made2.length) return fail("That JSX has no components the system knows.");
      var owed2 = owesPlan(api, added(made2));
      if (owed2) return owed2;
      var was = nameOf(input.id);
      var ids3 = api.replace(input.id, made2);
      if (!ids3 || !ids3.length) return fail("Those layers can't go there.");
      return { ok: true, result: JSON.stringify({ added: ids3 }), change: { ids: ids3, label: "Rebuilt", value: was + " → " + made2.map(function (n) { return layerName(n); }).join(", "), on: "" } };
    }
    case "find_images": {
      var ups = uploads(api);
      /* Nothing in Content fits: stock photos for the query, when they're
         set up, with whatever Content has after them. */
      var stockFor = function (fallback) {
        var q = String(input.query || "").trim();
        if (!api.stock || !q) return fallback;
        return Promise.resolve(api.stock(q, { count: 6, orientation: input.orientation })).then(function (photos) {
          if (!photos || !photos.length) return fallback;
          photos.forEach(function (ph) { STOCK[ph.id] = ph; });
          var rows = photos.map(function (ph) { return "- stock:" + ph.id + " · photo" + (ph.width && ph.height ? " " + ph.width + "×" + ph.height : "") + " · \"" + short(ph.alt || q, 80) + "\"" + (ph.credit ? " · by " + short(ph.credit, 40) : ""); });
          return { ok: true, result: "Stock photos for \"" + q + "\" (nothing in Content fits):\n" + rows.join("\n") + (ups.length ? "\nIn Content:\n" + fallback.result : ""), step: "Found " + photos.length + " stock photo" + (photos.length === 1 ? "" : "s") + " for " + short(q, 40) };
        }, function () { return fallback; });
      };
      if (!ups.length) return stockFor({ ok: true, result: "This file has no images or illustrations in Content yet. Use a layout's placeholder, or ask the person to upload some.", step: "Looked for pictures in Content" });
      /* Words of three letters or more, so "a" or "on" don't match every name. */
      var qw = String(input.query || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
      var hits = qw.length ? ups.filter(function (u) { var hay = (u.name + " " + u.kind).toLowerCase(); return qw.some(function (w) { return hay.indexOf(w) >= 0; }); }) : ups;
      var shown = (hits.length ? hits : ups).slice(0, 40);
      var lines = shown.map(function (u) { return "- content:" + u.id + " · " + u.kind + " · \"" + short(u.name || "untitled", 60) + "\""; });
      var head = hits.length || !qw.length ? "" : "Nothing in Content is named for \"" + input.query + "\"; these are all of them:\n";
      var listed = { ok: true, result: head + lines.join("\n") + (ups.length > shown.length ? "\n… and " + (ups.length - shown.length) + " more." : ""), step: "Found " + shown.length + " picture" + (shown.length === 1 ? "" : "s") + " in Content" };
      if (hits.length && qw.length) return listed;
      return stockFor(listed);
    }
    case "search_layouts": {
      var found = findLayouts(input.query, input.kind);
      if (!found.length) found = findLayouts("", input.kind);
      return { ok: true, result: found.map(layoutLine).join("\n"), step: "Looked through " + found.length + " layouts" };
    }
    case "insert_layout": {
      var lay = layoutById(input.id);
      if (!lay) return fail("There's no layout " + input.id + ". search_layouts lists them.");
      var jsx = lay.jsx(input.content || {});
      var r0 = input.replace ? runTool(api, { name: "replace_jsx", input: { id: input.replace, jsx: jsx } })
        : runTool(api, { name: "insert_jsx", input: { jsx: jsx, parent: input.parent, index: input.index } });
      if (r0.ok && r0.change) r0.change = Object.assign({}, r0.change, { label: input.replace ? "Rebuilt" : "Added", value: lay.name + (input.replace ? " in place of " + r0.change.value.split(" → ")[0] : "") });
      return r0;
    }
    case "insert_template": {
      var tpl = TEMPLATES.filter(function (st) { return st[0] === input.id; })[0];
      if (!tpl) return fail("There's no template " + input.id + ". The templates are " + TEMPLATES.map(function (st) { return st[0]; }).join(", ") + ".");
      if (input.new_frame) {
        if (!api.addTemplate) return fail("Templates can't be added as a frame here; put it in the frame you're in.");
        var owed5 = owesPlan(api, "frame");
        if (owed5) return owed5;
        var tf = api.addTemplate(tpl[0]);
        if (!tf) return fail("The template couldn't be added.");
        return { ok: true, result: JSON.stringify({ frame: tf }) + " You're working in it now. read_page shows its layers; set the person's copy in place of the sample copy.", change: { ids: [], label: "Template", value: tpl[1], on: "as a new frame" } };
      }
      var secs = [];
      tpl[2]().frames.forEach(function (fr) { (fr.root.children || []).forEach(function (c) { var n = fresh(c); delete n.style.x; delete n.style.y; delete n.style.ch; delete n.style.cv; secs.push(n); }); });
      if (!secs.length) return fail("That template is empty.");
      var owed6 = owesPlan(api, added(secs));
      if (owed6) return owed6;
      var into = input.parent || "root";
      if (!locate(doc, into)) return fail("There's no container " + input.parent + " in this frame.");
      var ids6 = api.insert(into, typeof input.index === "number" ? input.index : null, secs);
      if (!ids6 || !ids6.length) return fail("The template's sections can't go there.");
      return { ok: true, result: JSON.stringify({ added: ids6 }) + " These hold sample copy: read_page and set the person's own.", change: { ids: ids6, label: "Template", value: tpl[1], on: "into " + (into === "root" ? "the frame" : nameOf(into)) } };
    }
    case "list_components": {
      var comps = ownComponents(api);
      if (!comps.length) return { ok: true, result: "This file has no components of its own yet. make_component turns a layer into one.", step: "Looked through My components" };
      return { ok: true, result: comps.map(function (c) {
        var here = instancesOf(doc, c.id).length;
        var toks = c.tokens || [];
        return c.id + " · " + c.name + " · a " + c.node.type + (c.node.children && c.node.children.length ? " holding " + c.node.children.map(function (k) { return k.type; }).slice(0, 6).join(", ") : "") + " · " + count(c.node) + (count(c.node) === 1 ? " layer" : " layers") +
          " · built on " + (toks.length ? toks.slice(0, 6).join(", ") + (toks.length > 6 ? "…" : "") : "no tokens") + " · " + (here ? here + (here === 1 ? " instance" : " instances") + " on this page" : "not on this page");
      }).join("\n"), step: "Looked through " + comps.length + (comps.length === 1 ? " component" : " components") };
    }
    case "insert_instance": {
      var comp = ownComponents(api).filter(function (c) { return c.id === input.id; })[0];
      if (!comp) return fail("There's no component " + input.id + " in this file. list_components lists them.");
      var inst = instanceNode(comp);
      if (!inst) return fail(comp.name + " couldn't be read back.");
      /* A component can't hold itself. */
      var spot = input.replace ? (locate(doc, input.replace) || {}).path : input.parent ? (locate(doc, input.parent) || {}).path : (function () { var s0 = (api.selection ? api.selection() : [])[0]; var a0 = s0 && locate(doc, s0); return a0 ? a0.path.slice(0, -1) : null; })();
      if ((spot || []).some(function (a) { return a.inst && a.inst.of === comp.id && a.id !== input.replace; })) return fail(comp.name + " can't go inside one of its own instances. Put it beside that instance instead.");
      if (input.replace) {
        if (!locate(doc, input.replace) || input.replace === "root") return fail("There's no layer " + input.replace + " in this frame.");
        var was7 = nameOf(input.replace);
        var ids7 = api.replace(input.replace, [inst]);
        if (!ids7 || !ids7.length) return fail(comp.name + " can't go there.");
        return { ok: true, result: JSON.stringify({ added: ids7 }), change: { ids: ids7, label: "Rebuilt", value: comp.name + " in place of " + was7, on: "" } };
      }
      if (input.parent && !locate(doc, input.parent)) return fail("There's no container " + input.parent + " in this frame.");
      var ids8 = api.insert(input.parent || null, typeof input.index === "number" ? input.index : null, [inst]);
      if (!ids8 || !ids8.length) return fail(comp.name + " can't go there.");
      return { ok: true, result: JSON.stringify({ added: ids8 }), change: { ids: ids8, label: "Instance", value: comp.name, on: input.parent ? "in " + nameOf(input.parent) : "" } };
    }
    case "make_component": {
      if (!api.makeComponent) return fail("Components can't be made here.");
      var mat = locate(doc, input.id);
      if (!mat || input.id === "root") return fail("There's no layer " + input.id + " in this frame.");
      if (mat.node.inst) return fail(nameOf(input.id) + " is already an instance of a component.");
      var cname = short(String(input.name || "").trim(), 60);
      if (!cname) return fail("Give it a name.");
      var madeC = api.makeComponent(input.id, cname);
      if (!madeC || madeC.error) return fail((madeC && madeC.error) || "It couldn't be made a component.");
      return { ok: true, result: JSON.stringify({ component: madeC.id, name: madeC.name, tokens: madeC.tokens }) + " It's in My components, and " + nameOf(input.id) + " is its first instance.", change: { ids: [input.id], label: "Component", value: madeC.name, on: "from " + nameOf(input.id) } };
    }
    case "frame_spec": {
      var sf = input.frame ? (doc.frames || []).filter(function (x) { return x.id === input.frame; })[0] : (doc.frames || []).filter(function (x) { return x.id === doc.active; })[0] || (doc.frames || [])[0];
      if (!sf) return fail("There's no frame " + input.frame + " on this page.");
      var part = null;
      if (input.id) {
        var pat = locate(doc, input.id, sf.id);
        if (!pat || input.id === "root") return fail("There's no layer " + input.id + " in " + sf.name + ".");
        part = pat.node;
      }
      var target = part ? { name: layerName(part), mode: sf.mode, width: sf.width, dark: sf.dark, root: { children: [part] } } : sf;
      var spec = specOf(target, api.library ? api.library() : null);
      var lines = part ? [line(part, 0)].concat((function () { var o = []; (function walk(n, dep) { (n.children || []).forEach(function (c) { o.push(line(c, dep)); walk(c, dep + 1); }); })(part, 1); return o; })()).join("\n") : outline(doc, sf.id).split("\n").slice(1).join("\n");
      var codeNow = api.frameCode ? api.frameCode(sf.id, part ? part.id : null) : null;
      return Promise.resolve(codeNow).then(function (code) {
        return { ok: true, result: specText(spec, lines, code || null), step: "Wrote the spec for " + spec.name + (code ? ", with its code" : "") };
      });
    }
    case "remember": {
      if (!api.remember) return fail("Lessons can't be kept here.");
      var kept = api.remember(String(input.lesson || ""), input.scope === "project" ? "project" : "file");
      if (!kept || kept.error) return fail((kept && kept.error) || "Give the lesson as one short line.");
      var where = kept.scope === "project" ? "the project's" : "this file's";
      return { ok: true, result: kept.added ? "Kept in " + where + " Lessons (" + kept.count + (kept.count === 1 ? " lesson" : " lessons") + "). Follow it from now on." : "That's already in " + where + " Lessons.",
        step: (kept.added ? "Kept a lesson: " : "Already knew: ") + short(kept.lesson, 80) };
    }
    case "set_text": {
      var tat = locate(doc, input.id);
      if (!tat || input.id === "root") return fail("There's no layer " + input.id + " in this frame.");
      var tn = tat.node, specs = (META[tn.type] && META[tn.type].props) || [];
      var key = TEXT_PROPS.filter(function (k) { return typeof tn.props[k] === "string"; })[0] ||
        TEXT_PROPS.filter(function (k) { return specs.some(function (sp) { return sp.name === k; }); })[0];
      if (!key) return fail(tn.type + " has no text of its own; set the text of a layer inside it.");
      var text = String(input.text == null ? "" : input.text);
      if (!api.setProp([input.id], key, text)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: [input.id], label: "Text", value: short(text, 60), on: nameOf(input.id) } };
    }
    case "move": {
      var mids = known(input.ids);
      if (!mids.length) return fail("None of those layers are in this frame.");
      if (!locate(doc, input.parent)) return fail("There's no container " + input.parent + " in this frame.");
      var moved = api.move(mids, input.parent, typeof input.index === "number" ? input.index : null);
      if (!moved || !moved.length) return fail("Those layers can't go there.");
      return { ok: true, result: JSON.stringify({ moved: moved }), change: { ids: moved, label: "Moved", value: moved.map(nameOf).join(", "), on: "into " + nameOf(input.parent) } };
    }
    case "wrap": {
      var wids = known(input.ids);
      if (!wids.length) return fail("None of those layers are in this frame.");
      var type = input.type || "Group";
      if (wids.length > 1 && type !== "Group") return fail("Several layers go into a Group; wrap them one at a time for a " + type + ".");
      var box = wids.length > 1 ? api.group(wids) : api.wrap(wids[0], type);
      if (!box) return fail("Those can't be wrapped there.");
      return { ok: true, result: JSON.stringify({ container: box }), change: { ids: [box], label: "Wrapped", value: wids.map(nameOf).join(", "), on: "in a " + type } };
    }
    case "duplicate": {
      var dids = known(input.ids);
      if (!dids.length) return fail("None of those layers are in this frame.");
      var copies = api.duplicate(dids);
      if (!copies || !copies.length) return fail("Those layers can't be copied.");
      return { ok: true, result: JSON.stringify({ copies: copies }), change: { ids: copies, label: "Copied", value: dids.map(nameOf).join(", "), on: "" } };
    }
    case "rename": {
      if (!locate(doc, input.id) || input.id === "root") return fail("There's no layer " + input.id + " in this frame.");
      var nm = short(String(input.name || ""), 60);
      if (!nm) return fail("Give it a name.");
      var old = nameOf(input.id);
      if (!api.rename(input.id, nm)) return fail("Nothing changed.");
      return { ok: true, result: "Done.", change: { ids: [input.id], label: "Named", value: nm, on: old } };
    }
    case "create_frame": {
      var preset = PRESETS.filter(function (f) { return f.id === input.preset; })[0];
      if (!preset) return fail("There's no preset " + input.preset + ".");
      if (input.mode !== "structured" && input.mode !== "free") return fail("A frame is structured or free.");
      var owed3 = owesPlan(api, "frame");
      if (owed3) return owed3;
      var made3 = api.createFrame({ name: short(String(input.name || "Frame"), 60), preset: preset.id, mode: input.mode });
      if (!made3) return fail("The frame couldn't be added.");
      return { ok: true, result: JSON.stringify(made3), change: { ids: [], label: "New frame", value: short(String(input.name || "Frame"), 60), on: preset.label + ", " + input.mode } };
    }
    case "make_variants": {
      if (!api.makeVariants) return fail("Variants can't be made here.");
      var src = input.frame ? (doc.frames || []).filter(function (f) { return f.id === input.frame; })[0] : (doc.frames || []).filter(function (f) { return f.id === doc.active; })[0] || doc.frames[0];
      if (!src) return fail("There's no frame " + input.frame + " on this page.");
      var labels = (input.labels || []).map(function (l) { return short(String(l || ""), 40); }).filter(Boolean).slice(0, 4);
      if (labels.length < 2) return fail("Give at least two labels.");
      var made4 = api.makeVariants(src.id, labels);
      if (!made4 || !made4.length) return fail("The variants couldn't be made.");
      return { ok: true, result: JSON.stringify({ variants: made4.map(function (v, i) { return { label: labels[i], frame: v }; }) }) + " Now use_frame into each and make its change, then compare_frames.", step: "Copied " + src.name + " into " + labels.length + " variants",
        change: { ids: [], label: "Variants", value: labels.length + " copies", on: src.name }, variants: { source: src.id, sourceName: src.name, items: made4.map(function (v, i) { return { label: labels[i], frame: v }; }) } };
    }
    case "compare_frames": {
      var all2 = doc.frames || [];
      var picked;
      if (input.frames && input.frames.length) {
        picked = input.frames.map(function (id) { return all2.filter(function (f) { return f.id === id; })[0]; });
        if (picked.some(function (f) { return !f; })) return fail("Each of frames must be a frame on this page.");
      } else {
        /* The frame you're in and its variants, which are named after it. */
        var here2 = all2.filter(function (f) { return f.id === doc.active; })[0] || all2[0];
        var base = String(here2.name).split(" · ")[0];
        picked = all2.filter(function (f) { return f.name === base || f.name.indexOf(base + " · ") === 0; });
      }
      picked = picked.slice(0, 4);
      if (picked.length < 2) return fail("There's only one frame to compare. Name two to four frames, or make_variants first.");
      var w2 = typeof input.width === "number" ? Math.max(320, Math.min(2560, Math.round(input.width))) : null;
      var d2 = typeof input.dark === "boolean" ? input.dark : null;
      var opts2 = w2 || d2 !== null ? { width: w2, dark: d2 } : null;
      var cmp = compareText(picked, function (n) { return layerName(n); });
      var shoot = api.screenshot ? function (f) { return Promise.resolve(api.screenshot(f.id, null, opts2)).then(null, function () { return null; }); } : function () { return Promise.resolve(null); };
      var check = api.runChecks ? function (f) { return Promise.resolve(api.runChecks(f.id)).then(null, function () { return null; }); } : function () { return Promise.resolve(null); };
      return Promise.all(picked.map(function (f) { return Promise.all([shoot(f), check(f)]); })).then(function (got) {
        var blocks = [], shots = [];
        picked.forEach(function (f, i) {
          var pic = got[i][0], ck = got[i][1];
          var bad = ck && ck.rows ? ck.rows.filter(function (r) { return r.status !== "pass"; }) : [];
          var verdict = !ck ? "checks didn't run" : bad.length ? bad.map(function (r) { return r.status.toUpperCase() + " " + r.title; }).join("; ") : "every check passes";
          if (pic && pic.data) { blocks.push({ type: "image", source: { type: "base64", media_type: pic.media_type, data: pic.data } }); shots.push(pic); }
          blocks.push({ type: "text", text: f.name + " (" + f.id + ")" + (pic && pic.data ? "" : ", no picture") + ": " + verdict + "." });
        });
        var how2 = [w2 ? "at " + w2 + " wide" : "", d2 === true ? "in dark mode" : d2 === false ? "in light mode" : ""].filter(Boolean).join(" ");
        blocks.push({ type: "text", text: "How alike they are:\n" + cmp.lines.join("\n") + (cmp.alike.length ? "\nRebuild one of each pair that's too alike with different layouts, bands or type before you grade." : "") + "\nGrade each from 1 to 5 on hierarchy, rhythm, contrast and fit to its direction; rebuild any below 3, then compare once more." });
        return { ok: true, result: blocks, step: "Compared " + picked.map(function (f) { return f.name; }).join(", ") + (how2 ? " " + how2 : ""), shot: shots[0] };
      });
    }
    case "use_frame": {
      var to = (doc.frames || []).filter(function (f) { return f.id === input.id; })[0];
      if (!to) return fail("There's no frame " + input.id + " on this page.");
      api.useFrame(to.id);
      return { ok: true, result: "Now working in " + to.name + ".", step: "Moved to " + to.name };
    }
    case "batch": {
      var list = Array.isArray(input.calls) ? input.calls.slice(0, 40) : [];
      if (!list.length) return fail("Send at least one call.");
      var bad = list.filter(function (c) { return !c || BATCHABLE.indexOf(c.name) < 0; })[0];
      if (bad) return fail((bad && bad.name) + " can't run in a batch. Batch runs: " + BATCHABLE.join(", ") + ".");
      var size = list.reduce(function (a, c) {
        var inp = c.input || {}, lay2 = c.name === "insert_layout" && layoutById(inp.id);
        var own = c.name === "insert_instance" && ownComponents(api).filter(function (k) { return k.id === inp.id; })[0];
        return a + (c.name === "insert_jsx" || c.name === "replace_jsx" ? added(fromJsx(inp.jsx)) : lay2 ? added(fromJsx(lay2.jsx(inp.content || {}))) : own ? count(own.node) : 0);
      }, 0);
      var owed4 = owesPlan(api, size);
      if (owed4) return owed4;
      /* The batch as a whole was judged; its calls aren't asked again. */
      var inner = Object.assign({}, api, { needsPlan: null });
      var changes = [], outs = [], stopped = null;
      api.batch(function () {
        for (var i = 0; i < list.length; i++) {
          var r = runTool(inner, { name: list[i].name, input: list[i].input || {} });
          outs.push(r.ok ? r.result : "Failed: " + r.result);
          if (!r.ok) { stopped = { at: i, why: r.result }; break; }
          if (r.change) changes.push(r.change);
        }
      });
      var summary = JSON.stringify(outs);
      if (stopped) return { ok: changes.length > 0, result: "Call " + (stopped.at + 1) + " (" + list[stopped.at].name + ") failed: " + stopped.why + " The " + stopped.at + " before it stand. Results: " + summary, changes: changes };
      return { ok: true, result: summary, changes: changes };
    }
    case "propose_plan": {
      if (!api.proposePlan) return fail("Plans can't be shown here; go ahead.");
      var steps = (input.steps || []).slice(0, 12).map(function (st) { return { title: short(String(st.title || ""), 60), detail: st.detail ? short(String(st.detail), 160) : "" }; }).filter(function (st) { return st.title; });
      if (!steps.length) return fail("A plan needs at least one step.");
      var plan = { title: short(String(input.title || "Plan"), 80), frame: input.frame && input.frame.name ? { name: short(String(input.frame.name), 60), preset: input.frame.preset || "", mode: input.frame.mode || "" } : null, steps: steps, notes: (input.notes || []).slice(0, 4).map(function (t) { return short(String(t), 200); }) };
      return Promise.resolve(api.proposePlan(plan)).then(function (answer) {
        if (answer && answer.approved) return { ok: true, result: "Approved. Build it now, as planned.", step: "Plan approved" };
        return { ok: true, result: "Not approved yet: the person wants to change the plan" + (answer && answer.note ? ": " + answer.note : "") + ". Stop here and wait for their message.", step: "Plan set aside to change" };
      });
    }
    case "ask_user": {
      if (!api.askUser) return fail("Questions can't be shown here; ask in your reply instead.");
      var opts = (input.options || []).slice(0, 4).map(function (o) { return { label: short(String((o && o.label) || ""), 60), detail: o && o.detail ? short(String(o.detail), 140) : "" }; }).filter(function (o) { return o.label; });
      if (opts.length < 2) return fail("Give at least two options.");
      var q = { question: short(String(input.question || "Which way?"), 140), options: opts };
      return Promise.resolve(api.askUser(q)).then(function (answer) {
        if (answer && typeof answer.index === "number" && opts[answer.index]) return { ok: true, result: "They chose: " + opts[answer.index].label + ".", step: "You chose " + opts[answer.index].label };
        if (answer && answer.text) return { ok: true, result: "They answered in their own words: " + answer.text, step: "You answered" };
        return { ok: true, result: "They didn't choose. Stop here and wait for their message.", step: "Question set aside" };
      });
    }
    case "remove": {
      var rids = known(input.ids);
      if (!rids.length) return fail("None of those layers are on the canvas.");
      var names = rids.map(nameOf).join(", ");
      if (!api.remove(rids)) return fail("Those layers can't be removed.");
      return { ok: true, result: "Done.", change: { ids: [], label: "Removed", value: names, on: "" } };
    }
    case "select": {
      api.select(known(input.ids));
      return { ok: true, result: "Done." };
    }
    case "read_skill": {
      var skill = (api.skills() || []).filter(function (s) { return s.name === input.name; })[0];
      if (!skill) return fail("There's no skill called " + input.name + " here.");
      var path = input.path || "SKILL.md";
      var file = skill.files.filter(function (x) { return x.path === path; })[0];
      if (!file) return fail(input.name + " has no file " + path + ". It has: " + skill.files.map(function (x) { return x.path; }).join(", ") + ".");
      return { ok: true, result: file.body, skill: skill.name, step: "Read the " + skill.name + " skill" };
    }
    default:
      return fail("There's no tool called " + call.name + ".");
  }
}

/* The practice assistant's closes, by the label it offers them under. */
var PRACTICE_CLOSES = {
  "Dark band, one button": "<Section dark><Stack gap=\"md\" align=\"center\"><Heading>Ready when you are</Heading><Button variant=\"primary\">Start free</Button></Stack></Section>",
  "Soft tint, two buttons": "<Section tone=\"brand-muted\"><Stack gap=\"md\" align=\"center\"><Heading>Ready when you are</Heading><Inline gap=\"sm\"><Button variant=\"primary\">Start free</Button><Button variant=\"secondary\">Talk to us</Button></Inline></Stack></Section>",
  "Quiet line and a link": "<Section><Stack gap=\"sm\" align=\"center\"><Text>Questions first? We're happy to help.</Text><Link href=\"#\">Talk to us</Link></Stack></Section>",
};

/* The practice assistant's answer once its reading tools have run: it says
   what they found, as a model would before going on. */
function practiceAnswer(request, results) {
  var prev = request.messages[request.messages.length - 2];
  var names = prev && Array.isArray(prev.content) ? prev.content.filter(function (b) { return b.type === "tool_use"; }).map(function (b) { return b.name; }) : [];
  var body = function (i) { var c = results[i] && results[i].content; return typeof c === "string" ? c : Array.isArray(c) ? c.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join(" ") : ""; };
  if (results.some(function (r) { return r.is_error; })) return { text: "Practice mode: " + body(0), calls: [] };
  if (names[0] === "read_page") {
    var lines = body(0).split("\n");
    var frames = lines.filter(function (l) { return /^Frame /.test(l); }).length;
    var layers = lines.filter(function (l) { return /^\s+- /.test(l); }).length;
    var top = lines.filter(function (l) { return /^  - /.test(l); }).map(function (l) { var m = /^  - (\w+)(?: "([^"]+)")?/.exec(l); return m ? (m[2] ? m[2] + " (" + m[1] + ")" : m[1]) : ""; }).filter(Boolean);
    return { text: "Practice mode: this page has **" + frames + (frames === 1 ? " frame" : " frames") + "** and **" + layers + (layers === 1 ? " layer" : " layers") + "**." + (top.length ? "\n\nAt the top level:\n" + top.slice(0, 8).map(function (t) { return "- " + t; }).join("\n") + (top.length > 8 ? "\n- and " + (top.length - 8) + " more" : "") : ""), calls: [] };
  }
  if (names[0] === "remember") return { text: "Practice mode: " + body(0) + " You'll find it in the Context panel, under Lessons.", calls: [] };
  if (names[0] === "screenshot") {
    var seen = results.map(function (r, i) { return body(i).replace(/, \d+×\d+ pixels\..*$/, ""); });
    return { text: "Practice mode: I looked at " + seen.join(", then ") + ". A model would now check " + (seen.length > 1 ? "them" : "it") + " for overlaps, spacing and contrast, and fix what it finds.", calls: [] };
  }
  if (names[0] === "propose_plan") {
    if (!/^Approved/.test(body(0))) return { text: "Practice mode: tell me what to change in the plan, and I'll propose it again.", calls: [] };
    var fr = (prev.content.filter(function (b) { return b.type === "tool_use"; })[0].input || {}).frame || {};
    return { text: "", calls: [{ name: "create_frame", input: { name: fr.name || "Page", preset: fr.preset || "desktop", mode: fr.mode || "structured" } }] };
  }
  if (names[0] === "create_frame") {
    var made = {};
    try { made = JSON.parse(body(0)); } catch (err) { made = {}; }
    var into = made.content;
    if (!into) return null;
    var name = (prev.content.filter(function (b) { return b.type === "tool_use"; })[0].input || {}).name || "Page";
    return { text: "", calls: [{ name: "batch", input: { calls: [
      { name: "insert_jsx", input: { parent: into, jsx: "<Section tone=\"brand-muted\"><Stack gap=\"md\" align=\"flex-start\"><Badge tone=\"brand\">New</Badge><Heading size=\"display-md\">" + name + " that keeps up</Heading><Text>Everything you need to start, and room to grow.</Text><Button variant=\"primary\">Get started</Button></Stack></Section>" } },
      { name: "insert_jsx", input: { parent: into, jsx: "<Section><Grid columns={3} gap=\"lg\"><Card title=\"Free\" description=\"For trying it out.\" /><Card title=\"Pro\" description=\"For makers who ship.\" /><Card title=\"Team\" description=\"For studios and teams.\" /></Grid></Section>" } },
      { name: "insert_jsx", input: { parent: into, jsx: "<Section dark><Stack gap=\"md\" align=\"center\"><Heading>Ready when you are</Heading><Button variant=\"brand\">Start free</Button></Stack></Section>" } },
    ] } }] };
  }
  if (names[0] === "lint") {
    var rows = body(0).split("\n").filter(function (l) { return /^- /.test(l); });
    var open = rows.filter(function (l) { return /^- (FAIL|WARN) /.test(l); }).map(function (l) { return l.replace(/^- (FAIL|WARN) /, "").replace(/ \[layers:.*$/, "").replace(/\.$/, ""); });
    var lastAsk = request.messages.filter(function (m) { return m.role === "user" && askText(m); }).slice(-1)[0];
    var asked = !!lastAsk && (typeof lastAsk.content === "string" ? [lastAsk.content] : lastAsk.content.filter(function (b) { return b && b.type === "text"; }).map(function (b) { return b.text; })).some(function (t) { return /^fix this check/i.test(t); });
    return { text: "Practice mode: I ran the checks. " + (open.length ? open.length + (open.length === 1 ? " wants" : " want") + " attention: " + open.join("; ") + "." : "Everything passes.") + (asked && open.length ? " A model would now fix them with the edit tools and check again." : ""), calls: [] };
  }
  if (names[0] === "batch") return { text: "Practice mode, with the real tools: a new structured frame with a hero, three plan cards and a dark closing band, as one step you can undo at once.", calls: [] };
  if (names[0] === "read_theme") {
    var th = {};
    try { th = JSON.parse(body(0)); } catch (err) { th = {}; }
    return { text: "Practice mode: this file's brand is " + (th.brand || "unnamed") + ", primary " + (th.primary || "?") + ", " + (th.context ? th.context + " context" : "no context set") + ", " + (th.fonts && th.fonts.body ? th.fonts.body + " type" : "the default type") + ". A model would use that to pick variants and copy.", calls: [] };
  }
  if (names[0] === "ask_user") {
    var said0 = body(0);
    var pick = /^They chose: (.+)\.$/.exec(said0);
    if (/own words: Try (them )?all/i.test(said0)) {
      var asked0 = (prev.content.filter(function (b) { return b.type === "tool_use"; })[0].input || {}).options || [];
      return { text: "", calls: [{ name: "make_variants", input: { labels: asked0.map(function (o) { return o.label; }) } }] };
    }
    if (!pick) return { text: /own words/.test(said0) ? "Practice mode: a model would build what you described. Pick an option to see the practice version." : "Practice mode: pick an option whenever you're ready.", calls: [] };
    var jsx = PRACTICE_CLOSES[pick[1]];
    if (!jsx) return { text: "Practice mode: you chose " + pick[1] + ".", calls: [] };
    return { text: "", calls: [{ name: "insert_jsx", input: { jsx: jsx } }] };
  }
  if (names[0] === "make_variants") {
    var got = {};
    try { got = JSON.parse(body(0).replace(/ Now use_frame.*$/, "")); } catch (err) { got = {}; }
    var calls = [];
    (got.variants || []).forEach(function (v) {
      calls.push({ name: "use_frame", input: { id: v.frame } });
      if (PRACTICE_CLOSES[v.label]) calls.push({ name: "insert_jsx", input: { jsx: PRACTICE_CLOSES[v.label] } });
    });
    return { text: "", calls: calls };
  }
  if (names[0] === "use_frame" && names.length > 1) return { text: "", calls: [{ name: "compare_frames", input: {} }] };
  if (names[0] === "compare_frames") {
    var alike = body(0).split("\n").filter(function (l) { return / sections the same/.test(l); });
    return { text: "Practice mode, with the real tools: one copy for each close, side by side, compared. " + alike.join(" ") + " A model would grade each and rebuild the weakest. Compare them on the canvas and keep one; it takes the original's place.", calls: [] };
  }
  if (names[0] === "insert_jsx") return { text: "Practice mode, with the real tools: the close you picked is at the foot of the frame.", calls: [] };
  if (names[0] === "read_guideline") return { text: "Practice mode: " + body(0).split("\n")[0].replace(/^# /, "") + " read. A model would apply it to the next change.", calls: [] };
  if (names[0] === "search_components") {
    var found = [];
    try { found = JSON.parse(body(0)).map(function (x) { return x.name; }); } catch (err) { found = []; }
    return { text: found.length ? "Practice mode: these fit: " + found.slice(0, 5).join(", ") + "." : "Practice mode: " + body(0), calls: [] };
  }
  return null;
}

/* What the person typed in a message to the assistant: its text, without
   the canvas and context block the Builder puts before it. */
function askText(m) {
  if (!m) return "";
  if (typeof m.content === "string") return m.content;
  return (m.content || []).filter(function (b) { return b && b.type === "text" && String(b.text).indexOf("<builder-context>") !== 0; }).map(function (b) { return b.text; }).join(" ");
}

/* The practice assistant's script: a few plain requests it can carry out
   with the real tools, so the panel and the canvas can be tried with
   nothing sent. sel: the selected layers. */
function practiceScript(sel) {
  return function (request) {
    var last = request.messages[request.messages.length - 1];
    var results = Array.isArray(last.content) ? last.content.filter(function (b) { return b && b.type === "tool_result"; }) : [];
    if (results.length) return practiceAnswer(request, results);
    var blocks = typeof last.content === "string" ? [{ text: last.content }] : (last.content || []).filter(function (b) { return !(b && b.type === "text" && String(b.text).indexOf("<builder-context>") === 0); });
    var pictures = blocks.filter(function (b) { return b && b.type === "image"; }).length;
    if (pictures) return { text: "Practice mode: I can see " + (pictures === 1 ? "your picture" : "your " + pictures + " pictures") + ". A model would read its sections, rebuild them from the system's layouts and components, then look at both side by side and say how they differ.", calls: [] };
    var rule = /^\s*(?:please\s+)?remember(?: that)?[:,]?\s+(.+)$/i.exec(blocks.map(function (b) { return b && b.type !== "image" ? b.text || "" : ""; }).join(" ").trim());
    if (rule && (request.tools || []).some(function (t) { return t.name === "remember"; })) return { text: "", calls: [{ name: "remember", input: { lesson: rule[1].replace(/[.!]+$/, "") } }] };
    var edits = blocks.filter(function (b) { return /^Since your last reply, the person changed/.test(b.text || ""); })[0];
    var text = blocks.filter(function (b) { return b !== edits; }).map(function (b) { return b.text || ""; }).join(" ").toLowerCase();
    if (/what (did|have) i changed?|my (changes|edits)/.test(text)) {
      if (!edits) return { text: "Practice mode: you haven't changed anything since my last reply.", calls: [] };
      var mine = edits.text.split("\n").filter(function (l) { return /^- /.test(l); }).map(function (l) { return l.slice(2); });
      return { text: "Practice mode: since my last reply you changed " + mine.length + (mine.length === 1 ? " thing" : " things") + ": " + mine.join("; ") + ". I'd keep those.", calls: [] };
    }
    var ids = sel.map(function (n) { return n.id; });
    var calls = [], said = [];
    var offered = (request.tools || []).map(function (t) { return t.name; });
    if (/what'?s on|what is on|describe|outline|read the page|summari[sz]e/.test(text)) return { text: "", calls: [{ name: "read_page", input: {} }] };
    if (/\b(phone|mobile|390|narrow|small screens?|dark mode)\b/.test(text) && /look|hold up|work|check|see/.test(text)) {
      if (offered.indexOf("screenshot") < 0) return { text: "Looking at the canvas is turned off for this file.", calls: [] };
      var at0 = ids.length ? { id: ids[0] } : {};
      return { text: "", calls: [{ name: "screenshot", input: Object.assign({ width: 390 }, at0) }, { name: "screenshot", input: Object.assign({ width: 390, dark: true }, at0) }] };
    }
    if (/\blook\b|screenshot|how does it look|check (it|how)/.test(text)) {
      if (offered.indexOf("screenshot") < 0) return { text: "Looking at the canvas is turned off for this file.", calls: [] };
      return { text: "", calls: [{ name: "screenshot", input: ids.length ? { id: ids[0] } : {} }] };
    }
    if (/^fix this check|\bcheck (it|this|the page|the frame)\b|\blint\b|run the checks/.test(text)) return { text: "", calls: [{ name: "lint", input: {} }] };
    var page = /(?:make|build|design|create|start)\b.*\b(pricing|landing|about|home|launch)\b.*\bpage\b/.exec(text) || /\b(pricing|landing|about|launch)\s+page\b/.exec(text);
    if (page && /make|build|design|create|start/.test(text)) {
      var title = page[1].charAt(0).toUpperCase() + page[1].slice(1);
      var first = { name: "create_frame", input: { name: title, preset: "desktop", mode: "structured" } };
      if (offered.indexOf("propose_plan") < 0) return { text: "", calls: [first] };
      return { text: "Here's what I'll build. It's a new page, so I'll check with you first.", calls: [{ name: "propose_plan", input: { title: "New page · " + title, frame: { name: title, preset: "desktop", mode: "structured" }, steps: [
        { title: "Hero", detail: "Display heading, one line under it, a \"New\" badge and one primary button" },
        { title: "Plans", detail: "Three cards: Free, Pro and Team" },
        { title: "Close", detail: "A dark band with one button" },
      ], notes: ["Practice mode writes stand-in copy; a model would use your context docs."] } }] };
    }
    if (/\btry (all |them all|a few|three|3|some)\b.*\b(closes|closings|endings|options|versions|variants|ways)\b/.test(text) && offered.indexOf("make_variants") >= 0) return { text: "", calls: [{ name: "make_variants", input: { labels: Object.keys(PRACTICE_CLOSES) } }] };
    if (/\b(add|give it|needs?|want) (a |an )?(close|closing|ending|final call to action)\b/.test(text) && offered.indexOf("ask_user") >= 0) return { text: "There are a few good ways to close a page, and they set different tones. Which fits?", calls: [{ name: "ask_user", input: { question: "How should it close?", options: [
      { label: "Dark band, one button", detail: "Section dark · Button primary · a strong end" },
      { label: "Soft tint, two buttons", detail: "Section brand-muted · primary and secondary" },
      { label: "Quiet line and a link", detail: "No band · Text and a Link to contact" },
    ] } }] };
    if (/\btheme\b|brand colou?r|which fonts?/.test(text)) return { text: "", calls: [{ name: "read_theme", input: {} }] };
    var topic = /\b(voice|accessibility|tokens|theming)\b/.exec(text);
    if (topic && /guideline|guide|rule|say|how/.test(text)) return { text: "", calls: [{ name: "read_guideline", input: { topic: topic[1] } }] };
    var forWhat = /component (?:for|to)\s+(.+)$/.exec(text) || /(?:which|find a|is there a) component\s+(?:for\s+)?(.+)$/.exec(text);
    if (forWhat) return { text: "", calls: [{ name: "search_components", input: { query: forWhat[1].replace(/[?.!]+$/, "") } }] };
    var surface = DATA.tokens.surface.options.map(function (o) { return o.value; });
    if (!ids.length && !/add|insert|section|pricing/.test(text)) return { text: "Practice mode: select something on the canvas and ask me to restyle it, or ask me to add a section.", calls: [] };
    if (/premium|calm|quiet|muted|soft/.test(text) && surface.indexOf("brand-muted") >= 0) { calls.push({ name: "set_style", input: { ids: ids, family: "surface", value: "brand-muted" } }); said.push("a quieter brand fill"); }
    else if (/bold|brand|loud|vivid/.test(text) && surface.indexOf("brand") >= 0) { calls.push({ name: "set_style", input: { ids: ids, family: "surface", value: "brand" } }); said.push("the brand fill"); }
    if (/round|corner|soft/.test(text)) { var r = DATA.tokens.radius.options; calls.push({ name: "set_style", input: { ids: ids, family: "radius", value: (r[Math.min(2, r.length - 1)] || r[0]).value } }); said.push("rounder corners"); }
    if (/shadow|lift|float|premium/.test(text)) { var el = DATA.tokens.elevation.options; calls.push({ name: "set_style", input: { ids: ids, family: "elevation", value: (el[1] || el[0]).value } }); said.push("a soft shadow"); }
    var headings = sel.filter(function (n) { return n.type === "Heading"; });
    if (/bigger|larger|premium|bold/.test(text) && headings.length) { calls.push({ name: "set_prop", input: { ids: headings.map(function (n) { return n.id; }), name: "size", value: "display-md" } }); said.push("a display-size heading"); }
    if (/add|insert/.test(text) && /button|cta|action/.test(text)) { calls.push({ name: "insert_jsx", input: { jsx: "<Button variant=\"primary\">Get started</Button>" } }); said.push("a button"); }
    if (/add|insert/.test(text) && /section|pricing|hero/.test(text)) { calls.push({ name: "insert_jsx", input: { jsx: "<Section><Stack><Heading size=\"heading-lg\">Plans for every team</Heading><Text>Start free, upgrade when you need to.</Text><Button>See plans</Button></Stack></Section>" } }); said.push("a section"); }
    if (!calls.length) return { text: "Practice mode: I can try fills (premium, bold), corners, shadows, bigger headings, or adding a button or a section. Real requests go to the model once live mode is on.", calls: [] };
    return { text: "Practice mode, with the real tools: " + said.join(", ") + ".", calls: calls };
  };
}

export { describe, familyWord, outline, plainGuide, practiceScript, runTool, systemPrompt, TOOLS, toolsFor };

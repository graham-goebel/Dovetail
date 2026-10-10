/* The live canvas bridge, as far as the canvas is concerned: which of the
   assistant's tools a session offers Claude, what "describe" answers, and
   how each step reads in the Session panel (an icon for its kind, what it
   touches, what it does), before it runs (to ask) and after (to list).

   The steps come from Claude, outside the Builder, through
   supabase/functions/bridge and cloud/bridge.js; App.js runs them with the
   same runTool the assistant uses. Nothing here touches the network. */

import { familyWord } from "./agent.js";
import { planEdit, readEdit } from "./nameedit.js";

/* Tools that only look. */
var READS = { list_pages: 1, read_page: 1, read_selection: 1, screenshot: 1, read_guideline: 1, read_theme: 1, lint: 1, measure: 1, search_components: 1, read_component: 1, list_tokens: 1, read_skill: 1 };
/* Tools that need the person to answer in the assistant panel, which a
   session doesn't use: Claude asks in its own conversation instead. */
var LEFT_OUT = { propose_plan: 1, ask_user: 1, select: 1 };

var EDIT_BY_NAME = {
  name: "edit_by_name",
  description: "Change layers by the names the Layers list shows, in one step the person can undo: an edit in Markdown (a \"## Edit\" heading, then lines like \"- Hero: padding xl\", \"- \\\"$284,120\\\": size display-2xl\", \"- remove Spending\", \"- add Heading \\\"This week\\\" to Bento, first\") or JSON ({ \"edit\": frame, \"changes\": [{ \"layer\", \"style\", \"props\", \"text\" } | { \"layer\", \"remove\": true } | { \"into\", \"at\", \"add\": [nodes] }] }). A name two layers share is skipped; name the layer more exactly, or use ids with the other tools. Answers what changed and what couldn't be.",
  input_schema: { type: "object", properties: { edit: { type: "string" } }, required: ["edit"], additionalProperties: false },
};

var HELLO = {
  name: "hello",
  description: "Say who you are, so the person sees your name and mark on your cursor and in the Session panel. name: what to call you (up to 40 characters). mark: optional, a small square picture as a data:image/png, jpeg or webp address, up to 48 KB. Send it once, first.",
  input_schema: { type: "object", properties: { name: { type: "string" }, mark: { type: "string" } }, required: ["name"], additionalProperties: false },
};

var PLACE_IMAGE = {
  name: "place_image",
  description: "Put a picture you made on the canvas, kept with the file like an upload (scaled to fit 1600px). image: a data:image/png, jpeg or webp address, up to 5 MB. Send id for a layer that shows pictures (an Image, a Cover, or a Video's poster), or parent (and at, an index) to add a new Image there. alt: what the picture shows, for people who can't see it. To show the person where a picture is coming while you make it, add an <Image> with insert_jsx, call working_on with its id, then place_image into it.",
  input_schema: { type: "object", properties: { image: { type: "string" }, id: { type: "string" }, parent: { type: "string" }, at: { type: "integer", minimum: 0 }, alt: { type: "string" } }, required: ["image"], additionalProperties: false },
};

var WORKING_ON = {
  name: "working_on",
  description: "Show the person what you're making before it lands: a few words (like \"Making a picture\") on your cursor at a layer, by id. The layer is held for you until your next step on it, or a minute; other agents wait for it.",
  input_schema: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false },
};

/* A picture as an agent sends it: 5 MB of PNG, JPEG or WebP, base64 in a
   data address, is about 7 million characters. */
var PICTURE_MAX = 7000000;

function isRead(name) { return !!READS[name] || name === "describe" || name === "hello"; }

/* A picture an agent sent, checked before it's opened: { image, alt } or
   { why } in words the agent can act on. */
function pictureFrom(input) {
  var image = String((input && input.image) || "");
  var alt = String((input && input.alt) || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!image) return { why: "Send image: a data:image/png, jpeg or webp address." };
  if (image.length > PICTURE_MAX) return { why: "That picture is over 5 MB. Send it smaller: about 1600px across is plenty." };
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return { why: "image takes a data:image/png, jpeg or webp address with base64 data. Links to pictures elsewhere aren't fetched." };
  if (!(input.id || input.parent) || (input.id && input.parent)) return { why: "Send id (a layer that shows pictures) or parent (to add a new Image), one of them." };
  return { image: image, alt: alt };
}

/* An agent's own name and mark, as it sent them, kept only if safe to show:
   a short plain name, and a small raster picture as a data address. */
function agentFrom(input) {
  var name = String((input && input.name) || "").replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  var mark = String((input && input.mark) || "");
  var okMark = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(mark) && mark.length <= 65536;
  return { name: name, mark: okMark ? mark : "", markRefused: !!mark && !okMark };
}

/* The layers a step means to change, before it runs, so two agents don't
   change the same one at once. doc is the document, for an edit by name. */
function targetsOf(call, doc) {
  var input = (call && call.input) || {};
  var out = [];
  var add = function (v) { [].concat(v || []).forEach(function (id) { if (typeof id === "string" && id !== "root" && out.indexOf(id) < 0) out.push(id); }); };
  switch (call && call.name) {
    case "batch": (input.calls || []).forEach(function (c) { add(targetsOf(c, doc)); }); break;
    case "edit_by_name": {
      var edit = readEdit(input.edit);
      if (edit && doc) planEdit(doc, edit).rows.forEach(function (r) { if (!r.choices) add(r.ids); });
      break;
    }
    case "set_style": case "set_prop": case "remove": case "duplicate": case "move": case "wrap": add(input.ids); add(input.parent); break;
    case "set_text": case "replace_jsx": case "rename": add(input.id); break;
    case "insert_jsx": add(input.parent); break;
    case "place_image": add(input.id); add(input.parent); break;
    case "working_on": add(input.id); break;
    default: break;
  }
  return out;
}

/* The tools a session offers: the assistant's own, less those that answer
   in its panel, and only the reading ones when it may not change things. */
function bridgeTools(tools, canEdit) {
  var list = tools.filter(function (t) { return !LEFT_OUT[t.name] && (canEdit || READS[t.name]); });
  if (canEdit) list = list.concat([EDIT_BY_NAME, PLACE_IMAGE, WORKING_ON]);
  return [HELLO].concat(list);
}

/* Whether a step may run in this session, and if not, why (in words Claude
   can act on). */
function allowed(call, session, tools) {
  var name = call && call.name;
  if (name === "describe" || name === "hello") return null;
  if (!name || !tools.some(function (t) { return t.name === name; })) return "There's no tool called " + name + " in this session. Call describe for the ones there are.";
  if (!session.canEdit && !isRead(name)) return "This session can only look: the person didn't let it make changes.";
  if (name === "batch" && !session.canEdit) return "This session can only look.";
  return null;
}

/* describe's answer: the brief and the tools, as text Claude reads once. */
function describeText(brief, tools, session) {
  return [
    "You're in a live session on " + (session.label || "a Dovetail Builder file") + ". " + (session.canEdit ? "You may look and make changes" : "You may only look") + (session.askFirst ? "; each change waits for the person to apply it, and may come back declined with a note from them." : ". Each change lands on their canvas as you make it, and they can undo any of them."),
    "Call hello first with your name (and a small mark if you have one), so the person sees who you are. Other agents may be working on the same canvas: a layer another agent is changing is held for a moment, and a step that needs it waits or comes back saying so.",
    "Work in small steps and look (screenshot, lint) after visible changes. Say what you're doing in your own conversation; the person sees each step in their Session panel.",
    "",
    brief,
    "",
    "## Tools",
    JSON.stringify(tools.map(function (t) { return { name: t.name, description: t.description, input_schema: t.input_schema }; })),
  ].join("\n");
}

/* --------------------------------------------------------------- rows */

var ICON = { padding: "sliders", z: "layers2", w: "fit", h: "fit", height: "fit", minW: "fit" };
function short(t, n) { var s = String(t == null ? "" : t).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/* How a step reads as a row, before or after it runs: { icon, title,
   detail }. name(id) gives a layer's name; doc is the document, for an
   edit by name. A batch reads as its steps. */
function rowsOf(call, name, doc) {
  var input = (call && call.input) || {};
  var who = function (ids) { return (ids || []).map(name).filter(Boolean).slice(0, 3).join(", ") + ((ids || []).length > 3 ? " and " + (ids.length - 3) + " more" : ""); };
  switch (call && call.name) {
    case "batch": return (input.calls || []).reduce(function (a, c) { return a.concat(rowsOf(c, name, doc)); }, []);
    case "edit_by_name": {
      var edit = readEdit(input.edit);
      if (!edit || !doc) return [{ icon: "pencil", title: "An edit by name", detail: "Couldn't be read as an edit" }];
      return planEdit(doc, edit).rows.map(function (r) { return { icon: r.icon === "ask" ? "alert" : r.icon, title: r.title, detail: r.choices ? r.choices.length + " layers have this name, so it's skipped" : r.detail }; });
    }
    case "set_style": return [{ icon: ICON[input.family] || "sliders", title: who(input.ids), detail: familyWord(input.family) + " → " + (input.value || "none") }];
    case "set_prop": return [{ icon: input.name === "size" ? "fit" : input.name === "children" ? "type" : "sliders", title: who(input.ids), detail: (input.name === "children" ? "Text" : input.name.charAt(0).toUpperCase() + input.name.slice(1)) + " → " + short(input.value, 40) }];
    case "set_text": return [{ icon: "type", title: who([input.id]), detail: "Text → “" + short(input.text, 40) + "”" }];
    case "remove": return [{ icon: "trash", title: who(input.ids), detail: "Removed" }];
    case "insert_jsx": return [{ icon: "plus", title: "New layers", detail: "Added " + (input.parent ? "in " + who([input.parent]) : "to the page") }];
    case "replace_jsx": return [{ icon: "plus", title: who([input.id]), detail: "Rebuilt from new layers" }];
    case "move": return [{ icon: "layers2", title: who(input.ids), detail: "Moved into " + who([input.parent]) }];
    case "wrap": return [{ icon: "group", title: who(input.ids), detail: "Wrapped in a " + (input.type || "Group") }];
    case "duplicate": return [{ icon: "copy", title: who(input.ids), detail: "Copied" }];
    case "rename": return [{ icon: "pencil", title: who([input.id]), detail: "Renamed “" + short(input.name, 40) + "”" }];
    case "create_frame": return [{ icon: "frame", title: input.name || "A new frame", detail: "New frame" }];
    case "make_variants": return [{ icon: "layers2", title: (input.labels || []).length + " variants", detail: (input.labels || []).join(", ") }];
    case "use_frame": return [{ icon: "frame", title: "Another frame", detail: "Working in it" }];
    case "read_page": return [{ icon: "file", title: "Read the page", detail: "" }];
    case "read_selection": return [{ icon: "file", title: "Read the selection", detail: "" }];
    case "list_pages": return [{ icon: "file", title: "Listed the pages", detail: "" }];
    case "screenshot": return [{ icon: input.width ? "phone" : "image", title: "Looked at " + (input.id ? who([input.id]) : "the frame"), detail: [input.width ? "at " + input.width + "px" : "", input.dark ? "in dark mode" : ""].filter(Boolean).join(", ") }];
    case "lint": return [{ icon: "check", title: "Ran the checks", detail: "" }];
    case "measure": return [{ icon: "fit", title: "Measured", detail: who([input.a, input.b]) }];
    case "place_image": return [{ icon: "image", title: input.id ? who([input.id]) : "A new picture", detail: input.id ? "Picture placed" + (input.alt ? ": " + short(input.alt, 40) : "") : "Added " + (input.parent && input.parent !== "root" ? "in " + who([input.parent]) : "to the page") }];
    case "working_on": return [{ icon: "wand", title: who([input.id]), detail: short(input.text, 60) || "Working on it" }];
    case "describe": return [{ icon: "book", title: "Read the brief", detail: "The system's rules and the tools" }];
    case "hello": return [{ icon: "user", title: "Said hello", detail: "As " + (agentFrom(input).name || "an agent") }];
    default: return [{ icon: "book", title: String((call && call.name) || "A step").replace(/_/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }), detail: "" }];
  }
}

export { EDIT_BY_NAME, HELLO, PICTURE_MAX, PLACE_IMAGE, WORKING_ON, agentFrom, allowed, bridgeTools, describeText, isRead, pictureFrom, rowsOf, targetsOf };

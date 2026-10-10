/* Conversations with the assistant, as the list in the panel describes
   them and as the cloud keeps them. A conversation is what the panel shows
   (thread) and the messages as sent (msgs); its line in the list is made
   here from those, and so is the copy the cloud keeps, which leaves the
   pictures out: they stay in the browser that took them. */

function short(t, n) { var s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/* Its title: the first thing asked, unless it was renamed. */
function titleOf(thread, named) {
  if (named) return short(named, 60);
  var first = (thread || []).filter(function (t) { return t.role === "user" && t.text; })[0];
  return first ? short(first.text, 60) : "New conversation";
}

/* The last thing the assistant said, and how many changes it made. */
function summaryOf(thread) {
  var said = "", changes = 0;
  (thread || []).forEach(function (t) {
    if (t.role !== "assistant") return;
    if (t.text) said = t.text;
    changes += (t.changes || []).filter(function (c) { return !c.undone; }).length;
  });
  return { said: short(said.replace(/^Practice mode(, with the real tools)?: /, ""), 90), changes: changes };
}

/* Its line in the list. by: who started it ({ id, name }), when known. */
function metaOf(thread, opts) {
  opts = opts || {};
  var sum = summaryOf(thread);
  return { title: titleOf(thread, opts.named), named: opts.named || undefined, said: sum.said, changes: sum.changes, updated: opts.updated || Date.now(),
    by: opts.by || undefined, shared: !!opts.shared, cloud: opts.cloud || undefined };
}

/* The conversation as the cloud keeps it: no pictures in the panel's steps,
   and each picture sent to the model replaced by a line saying one was
   there, so it can still be carried on. */
var GONE = "(A picture of the canvas was here. Take another if you need it.)";
var GONE_REF = "(The person attached a picture here as a reference. The shared copy doesn't keep it; ask for it again if you need it.)";
function forCloud(value) {
  if (!value) return value;
  var thread = (value.thread || []).map(function (t) {
    if (t.pics) t = Object.assign({}, t, { pics: undefined, picCount: t.pics.length });
    if (!t.steps || !t.steps.some(function (s) { return s.shot; })) return t;
    return Object.assign({}, t, { steps: t.steps.map(function (s) { return s.shot ? Object.assign({}, s, { shot: undefined }) : s; }) });
  });
  var msgs = (value.msgs || []).map(function (m) {
    if (!Array.isArray(m.content)) return m;
    return Object.assign({}, m, { content: m.content.map(function (b) {
      if (b && b.type === "image") return { type: "text", text: GONE_REF };
      if (b && b.type === "tool_result" && Array.isArray(b.content)) return Object.assign({}, b, { content: b.content.map(function (c) { return c && c.type === "image" ? { type: "text", text: GONE } : c; }) });
      return b;
    }) });
  });
  return { thread: JSON.parse(JSON.stringify(thread)), msgs: msgs };
}

/* Who sent a message, as its bubble says it in a shared conversation. */
function senderOf(item, me) {
  if (!item || !item.by || !item.by.id) return "";
  if (me && item.by.id === me.id) return "";
  return item.by.name || "Someone";
}

export { forCloud, metaOf, senderOf, summaryOf, titleOf };

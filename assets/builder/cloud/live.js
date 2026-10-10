/* Live editing on a cloud file: the App joins a channel per open page
   (cloud/sync.js over cloud/client.js's transport) and this turns the
   channel's presence list into the people the top bar shows. One person
   can be on a page from more than one tab: each tab is its own client
   (TAB tells them apart), and the list collapses them to the person. */

var TAB = Math.random().toString(36).slice(2, 8);

var COLORS = ["var(--dt-color-amber-500)", "var(--dt-color-cyan-500)", "var(--dt-color-green-500)", "var(--dt-color-violet-500)", "var(--dt-color-red-500)", "var(--dt-color-primary-500)"];

/* A colour a person keeps, from their id; the top bar and Share use it. */
function colorFor(id) {
  var h = 0, s = String(id || "");
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/* peers: [{ key, id, name, color? }] from the channel; myId: the signed-in
   account, left out. Returns [{ id, name, color }], one per person, in the
   order they were first seen. */
function othersFrom(peers, myId) {
  var seen = {}, out = [];
  (peers || []).forEach(function (p) {
    if (!p || !p.id || p.id === myId || seen[p.id]) return;
    seen[p.id] = true;
    out.push({ id: p.id, name: p.name || "Someone", color: p.color || colorFor(p.id) });
  });
  return out;
}

export { TAB, colorFor, othersFrom };

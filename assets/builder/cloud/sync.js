/* Live editing: everyone on the same page of a project sends each edit as
   the small changes model/edits.js makes ({redo} of a history step, or the
   {undo} when it's taken back), and applies everyone else's as they come.
   Two people's changes to different things survive in either order; on the
   same field the last one to arrive wins, which is fine for a canvas.

   This engine knows nothing about Supabase. It talks to a transport:

     transport.open(topic, { key, state, onMessage, onPeers, onStatus })
       -> { send(message), track(state), close() }

   where onStatus gets "joined", "error" or "closed", and onPeers gets the
   presence list, one { key, ...state } per person. cloud/client.js makes
   one from a Realtime channel; memoryHub() below makes one in memory, for
   the tests and for trying it out without a server. */

/* Larger than this, a change list isn't broadcast (Realtime caps a message);
   the sender saves the page and asks everyone else to load it instead. */
var MAX_MESSAGE = 200000;
/* Edits made before the channel is joined wait, up to this many. */
var MAX_WAITING = 200;

function createSync(opts) {
  var transport = opts.transport;
  var me = opts.clientId;
  var onRemote = opts.onRemote || function () {};
  var onReload = opts.onReload || function () {};
  var onPeers = opts.onPeers || function () {};
  var onStatus = opts.onStatus || function () {};
  var channel = null, topic = null, joined = false, seq = 0;
  var waiting = [];
  /* The highest seq seen from each sender, so a repeat is dropped. */
  var seen = {};
  var peers = [];
  var state = {};

  function deliver(msg) {
    if (!msg || typeof msg !== "object" || msg.from === me || typeof msg.from !== "string") return;
    if (typeof msg.seq !== "number" || msg.seq <= (seen[msg.from] || 0)) return;
    seen[msg.from] = msg.seq;
    if (msg.type === "changes" && Array.isArray(msg.changes)) onRemote(msg.changes, msg.from);
    else if (msg.type === "reload") onReload(msg.from);
  }

  function post(msg) {
    if (!joined) {
      waiting.push(msg);
      if (waiting.length > MAX_WAITING) {
        /* Too much to replay: one reload says it all once joined. */
        waiting = [{ type: "reload", from: me, seq: msg.seq }];
      }
      return;
    }
    channel.send(msg);
  }

  function flush() {
    var list = waiting;
    waiting = [];
    list.forEach(function (m) { channel.send(m); });
  }

  return {
    /* Joins topic (leaving any other), as state ({ name, colour, ... }). */
    join: function (nextTopic, nextState) {
      if (channel && topic === nextTopic) return;
      this.leave();
      topic = nextTopic;
      state = nextState || {};
      var mine = channel = transport.open(topic, {
        key: me,
        state: state,
        onMessage: function (msg) { if (channel === mine) deliver(msg); },
        onPeers: function (list) {
          if (channel !== mine) return;
          peers = (list || []).filter(function (p) { return p && p.key !== me; });
          onPeers(peers.slice());
        },
        onStatus: function (status) {
          if (channel !== mine) return;
          joined = status === "joined";
          onStatus(status);
          if (joined) flush();
        },
      });
    },
    leave: function () {
      var was = channel;
      channel = null; topic = null; joined = false; waiting = []; seen = {};
      if (peers.length) { peers = []; onPeers([]); }
      if (was) was.close();
    },
    /* One step's changes. Returns false when they were too big to send, in
       which case the caller saves the page and calls reload(). */
    send: function (changes) {
      if (!topic || !changes || !changes.length) return true;
      var msg = { type: "changes", from: me, seq: ++seq, changes: changes };
      if (JSON.stringify(msg).length > MAX_MESSAGE) { seq--; return false; }
      post(msg);
      return true;
    },
    /* Tells everyone else to load the saved page. */
    reload: function () {
      if (topic) post({ type: "reload", from: me, seq: ++seq });
    },
    /* What others see of this person: their selection, say. */
    track: function (next) {
      state = Object.assign({}, state, next);
      if (channel) channel.track(state);
    },
    peers: function () { return peers.slice(); },
    joined: function () { return joined; },
    topic: function () { return topic; },
  };
}

/* A transport in memory: every open() on the same hub and topic hears the
   others. Delivery waits a microtask, as a network would at least. */
function memoryHub() {
  var rooms = {};
  function later(fn) { Promise.resolve().then(fn); }
  function roster(room) {
    return room.map(function (m) { return Object.assign({ key: m.key }, m.state); });
  }
  function announce(room) {
    var list = roster(room);
    room.forEach(function (m) { later(function () { if (m.open) m.h.onPeers(list); }); });
  }
  return {
    rooms: rooms,
    open: function (topic, h) {
      var room = rooms[topic] || (rooms[topic] = []);
      var member = { key: h.key, state: h.state || {}, h: h, open: true };
      room.push(member);
      later(function () { if (member.open) h.onStatus("joined"); });
      announce(room);
      return {
        send: function (msg) {
          var copy = JSON.parse(JSON.stringify(msg));
          room.forEach(function (m) { if (m !== member) later(function () { if (m.open && member.open) m.h.onMessage(copy); }); });
          return Promise.resolve("ok");
        },
        track: function (state) { member.state = state || {}; announce(room); },
        close: function () {
          if (!member.open) return;
          member.open = false;
          room.splice(room.indexOf(member), 1);
          announce(room);
          later(function () { h.onStatus("closed"); });
        },
      };
    },
  };
}

/* A page's channel: project:<project id>:<page id>, as schema.sql allows. */
function topicFor(projectId, pageId) {
  return "project:" + projectId + ":" + pageId;
}

export { MAX_MESSAGE, createSync, memoryHub, topicFor };

/* The Builder's way into Supabase: accounts by email and password, and a
   transport for cloud/sync.js over private Realtime channels. supabase-js is
   imported from the CDN the first time it's needed, and never when the cloud
   is off (cloud/config.js), so a builder without a cloud fetches nothing.

   Sign-in links come back with ?code= (the PKCE flow) rather than a #token,
   since the builder's own links already use the hash. */

import { cloudConfig, cloudReady, LIB_URL } from "./config.js";

var clientLoading = null;

function getClient() {
  if (!cloudReady()) return Promise.reject(new Error("The cloud isn't connected."));
  if (!clientLoading) {
    var c = cloudConfig();
    /* A variable, not a literal, so the bundler leaves it for the browser. */
    var lib = LIB_URL;
    clientLoading = import(lib).then(function (mod) {
      return mod.createClient(c.url, c.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      });
    }, function () {
      clientLoading = null;
      throw new Error("Couldn't load the cloud. Check your connection and try again.");
    });
  }
  return clientLoading;
}

/* What went wrong, in words someone can act on. */
var MESSAGES = {
  invalid_credentials: "That email and password don't match an account.",
  email_not_confirmed: "Confirm your email first: open the link we sent you.",
  user_already_exists: "There's already an account with that email. Sign in instead.",
  email_exists: "There's already an account with that email. Sign in instead.",
  weak_password: "Choose a longer password: at least 8 characters.",
  same_password: "That's your current password. Choose a new one.",
  over_email_send_rate_limit: "Too many emails just now. Wait a minute and try again.",
  over_request_rate_limit: "Too many tries just now. Wait a minute and try again.",
  email_address_invalid: "That doesn't look like an email address.",
  signup_disabled: "New accounts are turned off for this builder.",
  session_not_found: "You've been signed out. Sign in again.",
  otp_expired: "That link has expired. Ask for a new one.",
  bad_code_verifier: "Your email is confirmed. Sign in with your password.",
  flow_state_not_found: "Your email is confirmed. Sign in with your password.",
  email_address_not_authorized: "This builder can't email that address yet (docs/cloud.md, step 4).",
};

function friendly(err) {
  if (!err) return "";
  var code = err.code || err.error_code || "";
  if (MESSAGES[code]) return MESSAGES[code];
  if (/fetch|network/i.test(String(err.message || err.name || ""))) return "Couldn't reach the cloud. Check your connection and try again.";
  return String(err.message || "Something went wrong. Try again.");
}

function unwrap(res) {
  if (res && res.error) throw new Error(friendly(res.error));
  return res ? res.data : null;
}

/* Where a link in an email brings you back to: this page, without its
   query or hash. */
function backHere() {
  return location.origin + location.pathname;
}

function account(session) {
  return session && session.user ? { id: session.user.id, email: session.user.email || "" } : null;
}

var auth = {
  /* The signed-in account, or null. */
  current: function () {
    return getClient().then(function (sb) { return sb.auth.getSession(); }).then(function (res) { return account(unwrap(res).session); });
  },
  /* Calls fn(event, account) on every change; returns a function to stop.
     event is Supabase's: SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, ... */
  watch: function (fn) {
    var sub = null, stopped = false;
    getClient().then(function (sb) {
      if (stopped) return;
      sub = sb.auth.onAuthStateChange(function (event, session) { fn(event, account(session)); }).data.subscription;
    }, function () {});
    return function () { stopped = true; if (sub) sub.unsubscribe(); };
  },
  /* A new account. Resolves { confirm: true } when an email must be
     confirmed before signing in (the setting docs/cloud.md asks for). */
  signUp: function (email, password) {
    return getClient().then(function (sb) {
      return sb.auth.signUp({ email: email, password: password, options: { emailRedirectTo: backHere() } });
    }).then(function (res) {
      var data = unwrap(res);
      return { confirm: !data.session, account: account(data.session) };
    });
  },
  signIn: function (email, password) {
    return getClient().then(function (sb) { return sb.auth.signInWithPassword({ email: email, password: password }); })
      .then(function (res) { return account(unwrap(res).session); });
  },
  signOut: function () {
    return getClient().then(function (sb) { return sb.auth.signOut(); }).then(unwrap);
  },
  /* Emails a link that brings you back here to choose a new password. */
  resetPassword: function (email) {
    return getClient().then(function (sb) { return sb.auth.resetPasswordForEmail(email, { redirectTo: backHere() }); }).then(unwrap);
  },
  setPassword: function (password) {
    return getClient().then(function (sb) { return sb.auth.updateUser({ password: password }); }).then(unwrap);
  },
  /* Turns invites to this (confirmed) address into memberships; resolves
     how many projects that joined. */
  acceptInvites: function () {
    return getClient().then(function (sb) { return sb.rpc("accept_invites"); }).then(unwrap);
  },
};

/* A transport for cloud/sync.js over one Realtime channel per page. Private,
   so schema.sql's policy on realtime.messages decides who may join. */
function supabaseTransport(sb) {
  return {
    open: function (topic, h) {
      var ch = null, closed = false;
      var ready = Promise.resolve(sb.realtime && sb.realtime.setAuth ? sb.realtime.setAuth() : null).catch(function () {}).then(function () {
        if (closed) return null;
        ch = sb.channel(topic, { config: { private: true, broadcast: { self: false }, presence: { key: h.key } } });
        ch.on("broadcast", { event: "sync" }, function (m) { h.onMessage(m.payload); });
        ch.on("presence", { event: "sync" }, function () {
          var st = ch.presenceState(), list = [];
          Object.keys(st).forEach(function (key) { var last = st[key][st[key].length - 1] || {}; list.push(Object.assign({}, last, { key: key })); });
          h.onPeers(list);
        });
        ch.subscribe(function (status) {
          if (status === "SUBSCRIBED") { ch.track(h.state || {}); h.onStatus("joined"); }
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") h.onStatus("error");
          else if (status === "CLOSED") h.onStatus("closed");
        });
        return ch;
      });
      return {
        send: function (msg) { return ready.then(function (c) { return c ? c.send({ type: "broadcast", event: "sync", payload: msg }) : null; }); },
        track: function (state) { ready.then(function (c) { if (c) c.track(state || {}); }); },
        close: function () { closed = true; ready.then(function (c) { if (c) sb.removeChannel(c); }); },
      };
    },
  };
}

export { auth, friendly, getClient, supabaseTransport };

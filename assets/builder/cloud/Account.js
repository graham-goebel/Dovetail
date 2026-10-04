/* Accounts: the Account button's dialog, and the hook that keeps track of
   who is signed in. With the cloud off (cloud/config.js) the dialog says so
   and nothing is loaded; with it on, it signs in, makes accounts, sends a
   link to reset a password and takes the new one when that link comes back. */

import { cx, e, useEffect, useState } from "../config.js";
import { Icon } from "../ui/icons.js";
import { cloudReady } from "./config.js";
import { auth } from "./client.js";

/* Read before supabase-js tidies the address: whether this page was opened
   from a link in one of its emails, and what went wrong if it failed. */
var ARRIVED = (function () {
  try {
    var q = new URLSearchParams(location.search);
    var h = new URLSearchParams(location.hash.replace(/^#/, ""));
    var error = q.get("error_description") || h.get("error_description");
    return { link: q.has("code") || !!error, error: error ? error.replace(/\+/g, " ") : "" };
  } catch (err) { return { link: false, error: "" }; }
})();

/* { status, account }: status is "off" (no cloud), "loading", "out", "in"
   or "recovery" (back from a reset link, to choose a new password). */
function useAccount() {
  var ready = cloudReady();
  var st = useState({ status: ready ? "loading" : "off", account: null, joined: 0 });
  var s = st[0], set = st[1];
  useEffect(function () {
    if (!ready) return undefined;
    var live = true;
    var signedIn = function (a) {
      set(function (p) { return p.status === "recovery" ? Object.assign({}, p, { account: a }) : { status: "in", account: a, joined: p.joined }; });
      /* Invites to this address become memberships as soon as it's in. */
      auth.acceptInvites().then(function (n) { if (live && n) set(function (p) { return Object.assign({}, p, { joined: p.joined + n }); }); }, function () {});
    };
    auth.current().then(function (a) {
      if (!live) return;
      if (a) signedIn(a);
      else set(function (p) { return p.status === "loading" ? { status: "out", account: null, joined: 0 } : p; });
    }, function (err) {
      if (live) set({ status: "out", account: null, joined: 0, error: err.message });
    });
    var stop = auth.watch(function (event, a) {
      if (!live) return;
      if (event === "PASSWORD_RECOVERY") set({ status: "recovery", account: a, joined: 0 });
      else if (event === "SIGNED_OUT" || !a) set({ status: "out", account: null, joined: 0 });
      else if (event === "SIGNED_IN") signedIn(a);
      else set(function (p) { return Object.assign({}, p, { account: a }); });
    });
    return function () { live = false; stop(); };
  }, []);
  return [s, set];
}

function AccountDialog(props) {
  var s = props.state, setState = props.setState, ref = props.dialogRef;
  var modeSt = useState("signin"), mode = modeSt[0], setMode = modeSt[1];
  var emailSt = useState(""), email = emailSt[0], setEmail = emailSt[1];
  var passSt = useState(""), pass = passSt[0], setPass = passSt[1];
  var againSt = useState(""), again = againSt[0], setAgain = againSt[1];
  var busySt = useState(false), busy = busySt[0], setBusy = busySt[1];
  var msgSt = useState(ARRIVED.error ? { error: ARRIVED.error } : null), msg = msgSt[0], setMsg = msgSt[1];

  var switchTo = function (m) { setMode(m); setMsg(null); setPass(""); setAgain(""); };
  var run = function (work, done) {
    setBusy(true); setMsg(null);
    work().then(function (r) { setBusy(false); done(r); }, function (err) { setBusy(false); setMsg({ error: err.message }); });
  };
  var close = function () { if (ref.current) ref.current.close(); };

  var submit = function (ev) {
    ev.preventDefault();
    var addr = email.trim();
    if (s.status === "recovery") {
      if (pass !== again) { setMsg({ error: "The two passwords don't match." }); return; }
      run(function () { return auth.setPassword(pass); }, function () {
        setPass(""); setAgain("");
        setState(function (p) { return { status: "in", account: p.account, joined: p.joined }; });
        setMsg({ note: "Your password is changed." });
      });
    } else if (mode === "forgot") {
      run(function () { return auth.resetPassword(addr); }, function () { setMsg({ note: "If there's an account for " + addr + ", it has an email with a link to choose a new password. Open it on this device." }); });
    } else if (mode === "signup") {
      run(function () { return auth.signUp(addr, pass); }, function (r) {
        setPass("");
        if (r.confirm) setMsg({ note: "Nearly there: we've sent a link to " + addr + ". Open it to confirm your address, and you're in." });
      });
    } else {
      run(function () { return auth.signIn(addr, pass); }, function () { setPass(""); });
    }
  };
  var signOut = function () { run(function () { return auth.signOut(); }, function () { switchTo("signin"); }); };

  var field = function (id, label, input) {
    return e("label", { className: "bd-acct-field", htmlFor: id }, e("span", { className: "bd-field-label" }, label), e("input", Object.assign({ id: id, className: "bd-input", required: true, disabled: busy }, input)));
  };
  var emailField = field("bd-acct-email", "Email", { type: "email", autoComplete: "email", value: email, onChange: function (ev) { setEmail(ev.target.value); } });
  var passField = function (label, autoComplete) {
    return field("bd-acct-pass", label, { type: "password", autoComplete: autoComplete, minLength: autoComplete === "new-password" ? 8 : undefined, value: pass, onChange: function (ev) { setPass(ev.target.value); } });
  };
  var button = function (label) { return e("button", { type: "submit", className: "bd-btn bd-btn-primary", disabled: busy }, busy ? "One moment…" : label); };
  var link = function (label, m) { return e("button", { type: "button", className: "bd-acct-link", onClick: function () { switchTo(m); } }, label); };

  var title = s.status === "recovery" ? "Choose a new password" : s.status === "in" ? "Your account"
    : s.status === "out" ? (mode === "signup" ? "Create an account" : mode === "forgot" ? "Reset your password" : "Sign in") : "Account";

  var body;
  if (s.status === "off") {
    body = e("div", { className: "bd-acct-off" },
      e("p", null, "The cloud isn't connected to this builder yet, so there's nothing to sign in to. Your projects are saved in this browser, as they always have been."),
      e("p", null, "Once it's connected, an account keeps your projects in the cloud and lets you share them, to edit together live."));
  } else if (s.status === "loading") {
    body = e("p", { className: "bd-sec-empty" }, "Connecting…");
  } else if (s.status === "in") {
    body = e("div", { className: "bd-acct-in" },
      e("p", { className: "bd-acct-who" }, e(Icon, { name: "user" }), e("span", null, "Signed in as ", e("strong", null, s.account && s.account.email))),
      s.joined ? e("p", null, "You've joined " + s.joined + (s.joined === 1 ? " shared project." : " shared projects.")) : null,
      e("p", { className: "bd-inspect-sub" }, "Your projects are still saved in this browser. Keeping them in the cloud, and editing together, come next."),
      e("div", { className: "bd-acct-actions" }, e("button", { type: "button", className: "bd-btn", disabled: busy, onClick: signOut }, "Sign out")));
  } else if (s.status === "recovery") {
    body = e("form", { className: "bd-acct-form", onSubmit: submit },
      passField("New password", "new-password"),
      field("bd-acct-again", "The same again", { type: "password", autoComplete: "new-password", minLength: 8, value: again, onChange: function (ev) { setAgain(ev.target.value); } }),
      e("div", { className: "bd-acct-actions" }, button("Save password")));
  } else {
    body = e("form", { className: "bd-acct-form", onSubmit: submit },
      e("p", { className: "bd-inspect-sub" }, mode === "forgot" ? "We'll email you a link to choose a new password." : mode === "signup" ? "Use any email you can open: we'll send it a link to confirm. Passwords need at least 8 characters." : "Sign in to keep your projects in the cloud and edit them with others."),
      emailField,
      mode === "forgot" ? null : passField("Password", mode === "signup" ? "new-password" : "current-password"),
      e("div", { className: "bd-acct-actions" }, button(mode === "signup" ? "Create account" : mode === "forgot" ? "Send the link" : "Sign in"),
        mode === "signin" ? link("Forgot your password?", "forgot") : null),
      e("p", { className: "bd-acct-switch" }, mode === "signin" ? e(React.Fragment, null, "New here? ", link("Create an account", "signup")) : e(React.Fragment, null, mode === "signup" ? "Have an account? " : "Remembered it? ", link("Sign in", "signin"))));
  }

  return e("dialog", { className: "bd-code bd-acct", ref: ref, "aria-labelledby": "bd-acct-title", onClose: props.onClose },
    e("div", { className: "bd-code-head" },
      e("div", { className: "bd-code-intro" }, e("h2", { id: "bd-acct-title" }, title)),
      e("div", { className: "bd-code-actions" },
        e("button", { type: "button", className: "bd-act", "aria-label": "Close", title: "Close", onClick: close }, e(Icon, { name: "close" })))),
    e("div", { className: "bd-acct-body" },
      body,
      e("div", { role: "status", "aria-live": "polite", className: cx("bd-acct-msg", msg && msg.error && "is-error", msg && msg.note && "is-note") },
        msg ? e(React.Fragment, null, e(Icon, { name: msg.error ? "alert" : "check" }), e("span", null, msg.error || msg.note)) : null)));
}

export { ARRIVED, AccountDialog, useAccount };

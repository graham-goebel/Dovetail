/* Where the open file is kept, in words: the top bar's cloud mark and the
   Share dialog read it. It joins what the Builder knows (who's signed in,
   the file's record, the project it's in) with the mirror's state
   (cloud/mirror.js), and touches nothing.

   fileCloud(input) → null when the cloud isn't connected, or
   { kind, label, detail, icon, busy }:
   - "out": signed out, so the file is only in this browser;
   - "local": in the Playground, which stays in this browser;
   - "uploading": on its way up for the first time;
   - "pending": changes waiting to go up;
   - "offline": changes go up when the browser is back online;
   - "error": the last sync didn't finish;
   - "synced": in the cloud, up to date.

   input: { account (useAccount's state), meta (the file's record), group
   (its project, if any), mirror (the mirror's state), now }. */

function ago(at, now) {
  if (!at) return "";
  var s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return Math.round(s / 60) + " min ago";
  if (s < 86400) return Math.round(s / 3600) + " h ago";
  return Math.round(s / 86400) + (Math.round(s / 86400) === 1 ? " day ago" : " days ago");
}

function waitingIn(meta) {
  return Object.keys((meta && meta.cloudDirty) || {}).length;
}

function fileCloud(input) {
  var account = (input && input.account) || {};
  var meta = (input && input.meta) || {};
  var group = input && input.group;
  var mirror = (input && input.mirror) || { status: "off" };
  var now = (input && input.now) || Date.now();
  if (!account.status || account.status === "off") return null;
  if (account.status !== "in") {
    return { kind: "out", icon: "cloudOff", label: "Only in this browser", detail: "Sign in to keep your files in the cloud, open them anywhere and share them." };
  }
  if (group && group.kind) {
    return { kind: "local", icon: "cloudOff", label: "Only in this browser", detail: "Files in the Playground stay in this browser. Move this one out of the Playground to keep it in the cloud and share it." };
  }
  var error = mirror.error ? ": " + mirror.error : ".";
  if (!meta.cloud) {
    if (mirror.status === "offline") return { kind: "offline", icon: "cloudOff", label: "Not in the cloud yet", detail: "You're offline. It goes up when you're back." };
    if (mirror.status === "error") return { kind: "error", icon: "alert", label: "Not in the cloud yet", detail: "The upload didn't finish" + error + " It tries again when the tab wakes or you're back online." };
    return { kind: "uploading", icon: "cloud", busy: true, label: "Going up to the cloud", detail: "This file is on its way to the cloud. Once it's there, you can share it." };
  }
  var waiting = waitingIn(meta) + (mirror.pending || 0);
  if (mirror.status === "offline") return { kind: "offline", icon: "cloudOff", label: "Offline", detail: "Changes are saved in this browser and go up when you're back online." };
  if (mirror.status === "error") return { kind: "error", icon: "alert", label: "Not synced", detail: "The last sync didn't finish" + error + " It tries again on the next change." };
  if (mirror.status === "syncing" || waiting) return { kind: "pending", icon: "cloud", busy: true, label: "Syncing", detail: "Changes are going up to the cloud." };
  var when = ago(mirror.at, now);
  return { kind: "synced", icon: "cloud", label: "In the cloud", detail: "Saved to the cloud" + (when ? " " + when : "") + ". It opens wherever you sign in." };
}

export { ago, fileCloud };

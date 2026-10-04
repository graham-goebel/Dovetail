/* Where the Builder's cloud lives: a Supabase project's address and its
   public (anon, or "publishable") key. Both are meant to ship in a web page;
   row-level security in supabase/schema.sql is what keeps each project to
   its members. The service_role (or "secret") key bypasses all of that and
   never goes here, or anywhere in this repository.

   Left empty, the cloud is off: there is no Account sign-in, nothing is
   fetched, and projects stay in this browser as they always have. A page can
   also set window.DovetailCloud = { url, anonKey } before builder.js loads,
   which is how the checks point it at a stand-in. See docs/cloud.md. */

var CLOUD = {
  url: "",
  anonKey: "",
};

/* supabase-js, loaded only once the cloud is on and only when it's needed. */
var LIB_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";

function cloudConfig() {
  var over = typeof window !== "undefined" && window.DovetailCloud;
  var c = over && typeof over === "object" ? over : CLOUD;
  return { url: String(c.url || "").replace(/\/+$/, ""), anonKey: String(c.anonKey || "") };
}

/* On when there's an https address and a key that looks like one. */
function cloudReady() {
  var c = cloudConfig();
  return /^https:\/\/[^\s/]+/.test(c.url) && c.anonKey.length > 20;
}

export { CLOUD, LIB_URL, cloudConfig, cloudReady };

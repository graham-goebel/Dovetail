/* Stock photos, through the images function (supabase/functions/images),
   for when a file's own uploads have nothing that fits. Signed in only; the
   function holds the service's key. searchStock resolves to the photos, or
   to null when there's no cloud, nobody's signed in or stock photos aren't
   set up, so the caller can carry on with uploads alone. */

import { cloudConfig, cloudReady } from "./config.js";
import { getClient } from "./client.js";

function call(body) {
  if (!cloudReady()) return Promise.resolve(null);
  return getClient().then(function (sb) { return sb.auth.getSession(); }).then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) return null;
    var c = cloudConfig();
    return fetch(c.url + "/functions/v1/images", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: c.anonKey },
      body: JSON.stringify(body),
    }).then(function (resp) {
      if (resp.status === 503) return null;
      return resp.json().catch(function () { return {}; }).then(function (b) {
        if (!resp.ok) throw new Error(b.error || "Stock photos couldn't be reached.");
        return b;
      });
    });
  });
}

/* query: words; opts.count (1 to 12), opts.orientation (landscape,
   portrait or squarish). */
function searchStock(query, opts) {
  opts = opts || {};
  return call({ query: query, count: opts.count, orientation: opts.orientation }).then(function (b) { return b ? b.photos || [] : null; });
}

/* Tells the service a photo went on a page, as its terms ask. */
function stockUsed(photo) {
  if (!photo || !photo.download) return Promise.resolve();
  return call({ used: photo.download }).then(function () {}, function () {});
}

export { searchStock, stockUsed };

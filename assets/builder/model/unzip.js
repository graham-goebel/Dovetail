/* Reading a zip archive in the page: a skill uploaded as one file. It reads
   the central directory, then each entry, stored or deflated (deflate goes
   through the browser's own DecompressionStream), and gives back text files.
   Limits keep a hostile archive from filling memory: so many entries, so
   many bytes each and in all, and names that stay inside the archive. */

import { crc32 } from "./zip.js";

var LOCAL_SIG = 0x04034b50;
var CENTRAL_SIG = 0x02014b50;
var END_SIG = 0x06054b50;
var LIMITS = { entries: 200, entryBytes: 400000, totalBytes: 4000000 };

function inflate(bytes) {
  if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("This browser can't open compressed zips."));
  var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
}

/* A name inside the archive, as a path of plain parts; anything that climbs
   out, starts at the root or names a folder is skipped (null). */
function safePath(name) {
  var p = String(name).replace(/\\/g, "/");
  if (!p || p.slice(-1) === "/" || p.charAt(0) === "/" || /^[A-Za-z]:/.test(p)) return null;
  var parts = p.split("/");
  if (parts.some(function (s) { return !s || s === "." || s === ".." || !/^[\w.@ -]+$/.test(s); })) return null;
  if (parts.some(function (s) { return s === "__MACOSX" || s === ".DS_Store"; })) return null;
  return parts.join("/");
}

/* bytes: a Uint8Array. Resolves to [{ path, body }] for the text files in
   it; rejects with a message to show when it isn't a zip it can read. */
function unzip(bytes, limits) {
  limits = Object.assign({}, LIMITS, limits || {});
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var end = -1;
  for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === END_SIG) { end = i; break; }
  }
  if (end < 0) return Promise.reject(new Error("That isn't a zip file."));
  var count = view.getUint16(end + 10, true);
  var at = view.getUint32(end + 16, true);
  if (count > limits.entries) return Promise.reject(new Error("That zip holds more than " + limits.entries + " files."));
  var entries = [], total = 0;
  for (var n = 0; n < count; n++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== CENTRAL_SIG) return Promise.reject(new Error("That zip is damaged."));
    var method = view.getUint16(at + 10, true), crc = view.getUint32(at + 16, true);
    var csize = view.getUint32(at + 20, true), usize = view.getUint32(at + 24, true);
    var nlen = view.getUint16(at + 28, true), xlen = view.getUint16(at + 30, true), clen = view.getUint16(at + 32, true);
    var local = view.getUint32(at + 42, true);
    var name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nlen));
    at += 46 + nlen + xlen + clen;
    var path = safePath(name);
    if (!path) continue;
    if (usize > limits.entryBytes) return Promise.reject(new Error(path + " is too large."));
    total += usize;
    if (total > limits.totalBytes) return Promise.reject(new Error("That zip is too large."));
    if (method !== 0 && method !== 8) return Promise.reject(new Error(path + " is packed in a way this can't open."));
    if (local + 30 > bytes.length || view.getUint32(local, true) !== LOCAL_SIG) return Promise.reject(new Error("That zip is damaged."));
    var start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    entries.push({ path: path, method: method, crc: crc, usize: usize, data: bytes.subarray(start, start + csize) });
  }
  return Promise.all(entries.map(function (en) {
    return (en.method === 8 ? inflate(en.data) : Promise.resolve(en.data)).then(function (raw) {
      if (raw.length !== en.usize || crc32(raw) !== en.crc) throw new Error(en.path + " didn't unpack cleanly.");
      return { path: en.path, body: new TextDecoder("utf-8", { fatal: false }).decode(raw) };
    });
  }));
}

export { safePath, unzip };

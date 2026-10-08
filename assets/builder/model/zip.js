/* A zip archive written in the page, so a project's code can be downloaded
   as one file with nothing to install. Entries are stored, not compressed:
   the files are small text, and stored entries keep this short enough to
   read in one sitting. Every reader opens them.

   The layout is the plain one: each file's local header and its bytes, then
   the central directory listing them all, then the record that says where
   the directory starts. No 64-bit records, so an archive stays under 4 GB
   and 65,535 entries, far beyond any project. */

var LOCAL_SIG = 0x04034b50;
var CENTRAL_SIG = 0x02014b50;
var END_SIG = 0x06054b50;
/* Version 2.0 of the format is the first to name the UTF-8 flag. */
var VERSION = 20;
/* Made on a Unix-like system, so readers take the permission bits below. */
var MADE_BY = (3 << 8) | VERSION;
/* Bit 11: the names are UTF-8. Without it a reader may decode them in its
   own code page and mangle anything outside ASCII. */
var UTF8_FLAG = 0x0800;
/* A regular file, readable by everyone and writable by its owner. */
var FILE_ATTRS = 0x81a40000;
var MAX_U32 = 0xffffffff;

/* CRC-32 (the reflected 0xEDB88320 polynomial the format uses), one table
   built on first use and kept. */
var crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  var crc = 0xffffffff;
  for (var i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* The format keeps local time to two seconds. The default is the earliest
   time it can hold, so the same files always make the same archive. */
function dosTime(date) {
  if (!(date instanceof Date) || isNaN(date.getTime()) || date.getFullYear() < 1980) return { time: 0, date: (1 << 5) | 1 };
  var year = Math.min(date.getFullYear(), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/* A name has to land inside the folder it is unpacked into: relative,
   forward slashes only, and no segment that is empty, "." or "..". A
   reader that trusts names could otherwise write anywhere. */
function checkName(name) {
  if (typeof name !== "string" || !name) throw new Error("zip: every entry needs a name");
  if (/[\\\0]/.test(name)) throw new Error("zip: " + JSON.stringify(name) + " has a backslash or a null character");
  if (/^[a-z]:/i.test(name)) throw new Error("zip: " + JSON.stringify(name) + " names a drive");
  name.split("/").forEach(function (seg) {
    if (seg === "") throw new Error("zip: " + JSON.stringify(name) + " is absolute or has an empty segment");
    if (seg === "." || seg === "..") throw new Error("zip: " + JSON.stringify(name) + " steps out of its folder");
  });
}

/* entries: [{ name: "pages/index.jsx", data: string | Uint8Array }], with
   strings written as UTF-8. options.date sets every entry's time. Returns
   the archive's bytes. Throws on a bad or repeated name, before writing
   anything. */
function zip(entries, options) {
  var utf8 = new TextEncoder();
  var stamp = dosTime(options && options.date);
  var seen = {};
  var files = (entries || []).map(function (e) {
    if (!e || typeof e !== "object") throw new Error("zip: an entry must be { name, data }");
    checkName(e.name);
    if (Object.prototype.hasOwnProperty.call(seen, e.name)) throw new Error("zip: " + JSON.stringify(e.name) + " appears twice");
    seen[e.name] = true;
    var data = typeof e.data === "string" ? utf8.encode(e.data) : e.data == null ? new Uint8Array(0) : e.data;
    if (!(data instanceof Uint8Array)) throw new Error("zip: the data for " + JSON.stringify(e.name) + " must be a string or a Uint8Array");
    var name = utf8.encode(e.name);
    if (name.length > 0xffff) throw new Error("zip: " + JSON.stringify(e.name.slice(0, 40)) + "... is too long a name");
    return { name: name, data: data, crc: crc32(data) };
  });
  if (files.length > 0xffff) throw new Error("zip: more entries than an archive without 64-bit records holds");

  /* Sizes first, so the archive is one buffer written front to back. */
  var localSize = 0, centralSize = 0;
  files.forEach(function (f) {
    f.offset = localSize;
    localSize += 30 + f.name.length + f.data.length;
    centralSize += 46 + f.name.length;
  });
  if (localSize + centralSize + 22 > MAX_U32) throw new Error("zip: too large for an archive without 64-bit records");

  var out = new Uint8Array(localSize + centralSize + 22);
  var view = new DataView(out.buffer);
  var at = 0;
  var u16 = function (v) { view.setUint16(at, v, true); at += 2; };
  var u32 = function (v) { view.setUint32(at, v >>> 0, true); at += 4; };
  var bytes = function (b) { out.set(b, at); at += b.length; };

  files.forEach(function (f) {
    u32(LOCAL_SIG);
    u16(VERSION); u16(UTF8_FLAG); u16(0); /* stored */
    u16(stamp.time); u16(stamp.date);
    u32(f.crc); u32(f.data.length); u32(f.data.length);
    u16(f.name.length); u16(0);
    bytes(f.name);
    bytes(f.data);
  });

  files.forEach(function (f) {
    u32(CENTRAL_SIG);
    u16(MADE_BY); u16(VERSION); u16(UTF8_FLAG); u16(0);
    u16(stamp.time); u16(stamp.date);
    u32(f.crc); u32(f.data.length); u32(f.data.length);
    u16(f.name.length); u16(0); u16(0); /* no extra field, no comment */
    u16(0); u16(0); u32(FILE_ATTRS); /* disk 0, binary, a plain file */
    u32(f.offset);
    bytes(f.name);
  });

  u32(END_SIG);
  u16(0); u16(0); /* this disk, and the one the directory starts on */
  u16(files.length); u16(files.length);
  u32(centralSize); u32(localSize);
  u16(0); /* no comment */
  return out;
}

export { crc32, zip };

/* The zip writer (assets/builder/model/zip.js) a project's code download
   will use. Each archive is read back here the way a reader would: from the
   end record to the central directory, then each local header and its
   bytes. Run with npm run check:unit. */

import "./setup.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { crc32, zip } from "../../../assets/builder/model/zip.js";

/* Node's own CRC-32 where it has one, so the module is checked against an
   implementation it didn't write. */
const reference = typeof zlib.crc32 === "function" ? (b) => zlib.crc32(b) >>> 0 : crc32;

function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, "the archive ends with the end record");
  const count = view.getUint16(end + 10, true);
  assert.equal(view.getUint16(end + 8, true), count, "entries on this disk match the total");
  const cdSize = view.getUint32(end + 12, true);
  const cdStart = view.getUint32(end + 16, true);
  assert.equal(cdStart + cdSize, end, "the directory runs up to the end record");
  const utf8 = new TextDecoder("utf-8", { fatal: true });
  const out = [];
  let at = cdStart;
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50, "a central header");
    const flags = view.getUint16(at + 8, true);
    assert.ok(flags & 0x0800, "names are flagged UTF-8");
    assert.equal(view.getUint16(at + 10, true), 0, "stored");
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    assert.equal(view.getUint32(at + 24, true), size, "stored size is the size");
    const nameLen = view.getUint16(at + 28, true);
    const extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = utf8.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extra + comment;

    assert.equal(view.getUint32(offset, true), 0x04034b50, "a local header where the directory says");
    assert.equal(view.getUint16(offset + 6, true), flags, "the same flags locally");
    assert.equal(view.getUint32(offset + 14, true), crc, "the same CRC locally");
    assert.equal(view.getUint32(offset + 18, true), size, "the same size locally");
    const localNameLen = view.getUint16(offset + 26, true);
    const localExtra = view.getUint16(offset + 28, true);
    assert.equal(utf8.decode(bytes.subarray(offset + 30, offset + 30 + localNameLen)), name, "the same name locally");
    const start = offset + 30 + localNameLen + localExtra;
    const data = bytes.slice(start, start + size);
    assert.equal(reference(data), crc, "the CRC matches the bytes of " + name);
    out.push({ name, data });
  }
  assert.equal(at, end, "the directory holds exactly its entries");
  return out;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0xff, 0x00, 0xfe]);

test("zip: text, binary, empty and UTF-8-named entries read back byte for byte", () => {
  const entries = [
    { name: "pages/index.jsx", data: "export default function Home() {\n  return <h1>Héllo</h1>;\n}\n" },
    { name: "public/logo.png", data: PNG },
    { name: "empty.txt", data: "" },
    { name: "pages/café/naïve 日本.md", data: "ü" },
  ];
  const back = unzip(zip(entries));
  assert.deepEqual(back.map((e) => e.name), entries.map((e) => e.name), "every name, in order");
  const enc = new TextEncoder();
  back.forEach((e, i) => {
    const want = typeof entries[i].data === "string" ? enc.encode(entries[i].data) : entries[i].data;
    assert.deepEqual([...e.data], [...want], "the bytes of " + e.name);
  });
  assert.equal(back[2].data.length, 0, "an empty file stays empty");
});

test("zip: no entries is still an archive, and the same files make the same bytes", () => {
  const none = zip([]);
  assert.equal(none.length, 22);
  assert.deepEqual(unzip(none), []);
  const files = [{ name: "a.txt", data: "a" }];
  assert.deepEqual([...zip(files)], [...zip(files)], "a fixed time by default, so the output is repeatable");
  const dated = zip(files, { date: new Date(2026, 9, 8, 14, 30, 10) });
  const v = new DataView(dated.buffer);
  assert.equal(v.getUint16(12, true), ((2026 - 1980) << 9) | (10 << 5) | 8, "the date given");
  assert.equal(v.getUint16(10, true), (14 << 11) | (30 << 5) | 5, "and its time, to two seconds");
});

test("zip: CRC-32 is the standard one", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "the check value");
  assert.equal(crc32(new Uint8Array(0)), 0);
  assert.equal(crc32(PNG), reference(PNG));
});

test("zip: refuses names that repeat or would land outside the folder", () => {
  assert.throws(() => zip([{ name: "a.txt", data: "1" }, { name: "a.txt", data: "2" }]), /twice/);
  ["../x", "a/../../x", "/etc/passwd", "a//b", "./a", "C:/x", "a\\b", "", "dir/"].forEach((name) => {
    assert.throws(() => zip([{ name, data: "" }]), /zip:/, JSON.stringify(name));
  });
  assert.throws(() => zip([{ name: "a", data: 42 }]), /string or a Uint8Array/);
  assert.doesNotThrow(() => zip([{ name: "a..b/c.d", data: "" }]), "dots inside a name are fine");
});

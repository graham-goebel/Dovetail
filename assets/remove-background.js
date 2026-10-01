/* Background removal for images on a plain or near-plain backdrop: product
   shots, studio photos, a logo on white. It runs in the browser with no
   network and no model, so it is a heuristic, not subject detection. It reads
   the backdrop from the image's border, follows it inwards from the edges and
   cuts away whatever matches. A busy scene, a backdrop the same colour as the
   subject, or a subject that fills the frame won't come out cleanly.

     DovetailRemoveBackground.remove(src, { tolerance: 18, feather: 1, maxSize: 2048 })
       .then(function (r) { img.src = r.dataUrl; })   // PNG with transparency
       .catch(function (err) { show(err.message); }); // plain English

   `src` is an image URL (https, data: or blob:), an <img>, a <canvas>, an
   ImageBitmap, ImageData, or a Blob or File. The result is { dataUrl, width,
   height, removed, background }: `removed` is the share of the image made
   transparent (0 to 1) and `background` the backdrop's [r, g, b]. Errors carry
   a `code` as well: tainted, load, plain, clear, empty or input.

   removeImageData(imageData, opts) does the same work synchronously and
   returns { imageData, removed, background } without touching the input.

   How it works: colours are compared in CIE Lab (delta E). The backdrop is
   the most common border colour, refined into a smooth model across the frame
   so a gradient or uneven lighting still counts as one backdrop. A flood fill
   from the matching border pixels marks the background; a thin band round the
   subject then gets a soft alpha from how far each pixel sits between the
   backdrop and the nearest solid subject colour, with the backdrop un-mixed
   out of its colour so no halo is left. */

(function () {
  "use strict";

  var MSG = {
    tainted: "That image comes from a site that doesn't allow it to be edited here. Upload it instead.",
    load: "That image couldn't be loaded. Check the link, or upload the file instead.",
    plain: "No plain background found to remove.",
    clear: "This image's background is already transparent.",
    empty: "The whole image matches its background, so there would be nothing left.",
    input: "Choose an image to remove the background from."
  };

  function fail(code) {
    var err = new Error(MSG[code]);
    err.code = code;
    return err;
  }

  function num(v, d, lo, hi) {
    v = v === undefined || v === null || v === "" ? NaN : Number(v);
    if (!isFinite(v)) v = d;
    return Math.min(hi, Math.max(lo, v));
  }

  function options(opts) {
    opts = opts || {};
    return {
      tolerance: num(opts.tolerance, 18, 0, 100),
      feather: Math.round(num(opts.feather, 1, 0, 4)),
      maxSize: Math.round(num(opts.maxSize, 2048, 16, 16384))
    };
  }

  /* sRGB to CIE Lab (D65). */
  var LIN = new Float32Array(256);
  for (var k = 0; k < 256; k++) {
    var c = k / 255;
    LIN[k] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  /* The cube root by table, which is most of the cost on a large image. */
  var FN = 4096, FT = new Float32Array(FN + 2);
  for (k = 0; k <= FN + 1; k++) {
    var tk = k / FN;
    FT[k] = tk > 0.008856 ? Math.cbrt(tk) : 7.787 * tk + 0.137931;
  }
  function f(t) {
    var p = t * FN;
    if (p >= FN) return Math.cbrt(t);
    var i = p | 0;
    return FT[i] + (FT[i + 1] - FT[i]) * (p - i);
  }
  function lab(r, g, b, out, o) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var fx = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
    var fy = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
    var fz = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    out[o] = 116 * fy - 16;
    out[o + 1] = 500 * (fx - fy);
    out[o + 2] = 200 * (fy - fz);
  }

  /* Every border pixel once, even for a one-pixel-wide image. */
  function borderOf(w, h) {
    var list = [], x, y;
    for (x = 0; x < w; x++) list.push(x);
    if (h > 1) for (x = 0; x < w; x++) list.push((h - 1) * w + x);
    for (y = 1; y < h - 1; y++) {
      list.push(y * w);
      if (w > 1) list.push(y * w + w - 1);
    }
    return list;
  }

  /* Least squares for a smooth backdrop: each of L, a, b, R, G, B as
     c0 + c1 u + c2 v + c3 uv over the frame, u and v running 0 to 1. A small
     ridge keeps it solvable, leaning to a flat colour when the points can't
     pin a slope. */
  function fitModel(pts, uv, use, count) {
    var M = new Float64Array(16), Y = new Float64Array(24), i, j, r, q, p;
    var feat = [1, 0, 0, 0];
    for (i = 0; i < count; i++) {
      if (!use[i]) continue;
      feat[1] = uv[i * 2]; feat[2] = uv[i * 2 + 1]; feat[3] = feat[1] * feat[2];
      for (r = 0; r < 4; r++) {
        for (q = 0; q < 4; q++) M[r * 4 + q] += feat[r] * feat[q];
        for (q = 0; q < 6; q++) Y[r * 6 + q] += feat[r] * pts[i * 6 + q];
      }
    }
    var ridge = Math.max(1e-6, M[0] * 1e-3);
    for (r = 1; r < 4; r++) M[r * 5] += ridge;
    if (M[0] === 0) return null;
    /* Gaussian elimination with partial pivoting. */
    for (j = 0; j < 4; j++) {
      p = j;
      for (r = j + 1; r < 4; r++) if (Math.abs(M[r * 4 + j]) > Math.abs(M[p * 4 + j])) p = r;
      if (p !== j) {
        for (q = 0; q < 4; q++) { var t = M[j * 4 + q]; M[j * 4 + q] = M[p * 4 + q]; M[p * 4 + q] = t; }
        for (q = 0; q < 6; q++) { var s = Y[j * 6 + q]; Y[j * 6 + q] = Y[p * 6 + q]; Y[p * 6 + q] = s; }
      }
      var piv = M[j * 4 + j];
      if (Math.abs(piv) < 1e-12) return null;
      for (r = 0; r < 4; r++) {
        if (r === j) continue;
        var m = M[r * 4 + j] / piv;
        if (!m) continue;
        for (q = 0; q < 4; q++) M[r * 4 + q] -= m * M[j * 4 + q];
        for (q = 0; q < 6; q++) Y[r * 6 + q] -= m * Y[j * 6 + q];
      }
    }
    /* coef[ch * 4 + term] */
    var coef = new Float64Array(24);
    for (r = 0; r < 4; r++) for (q = 0; q < 6; q++) coef[q * 4 + r] = Y[r * 6 + q] / M[r * 4 + r];
    return coef;
  }

  function evalModel(coef, ch, u, v) {
    var o = ch * 4;
    return coef[o] + coef[o + 1] * u + coef[o + 2] * v + coef[o + 3] * u * v;
  }

  /* The backdrop from the border: the densest colour, then a model fitted to
     the border pixels near it, refitted twice to the pixels near the model. */
  function findBackdrop(d, w, h, T) {
    var border = borderOf(w, h), nb = border.length;
    var labs = new Float32Array(nb * 3), pts = new Float32Array(nb * 6), uv = new Float32Array(nb * 2);
    var count = 0, i, idx, j;
    var su = w > 1 ? 1 / (w - 1) : 0, sv = h > 1 ? 1 / (h - 1) : 0;
    for (i = 0; i < nb; i++) {
      idx = border[i];
      j = idx * 4;
      if (d[j + 3] < 128) continue;
      lab(d[j], d[j + 1], d[j + 2], labs, count * 3);
      pts[count * 6] = labs[count * 3]; pts[count * 6 + 1] = labs[count * 3 + 1]; pts[count * 6 + 2] = labs[count * 3 + 2];
      pts[count * 6 + 3] = d[j]; pts[count * 6 + 4] = d[j + 1]; pts[count * 6 + 5] = d[j + 2];
      uv[count * 2] = (idx % w) * su; uv[count * 2 + 1] = Math.floor(idx / w) * sv;
      count++;
    }
    if (count < Math.max(1, nb * 0.1)) throw fail("clear");

    /* Densest 15-unit cube of a 5-unit Lab histogram. */
    var NL = 21, NA = 45, bins = new Int32Array(NL * NA * NA), occupied = [], bin = new Int32Array(count);
    for (i = 0; i < count; i++) {
      var bl = Math.min(NL - 1, Math.max(0, Math.floor(labs[i * 3] / 5)));
      var ba = Math.min(NA - 1, Math.max(0, Math.floor((labs[i * 3 + 1] + 112.5) / 5)));
      var bb = Math.min(NA - 1, Math.max(0, Math.floor((labs[i * 3 + 2] + 112.5) / 5)));
      bin[i] = (bl * NA + ba) * NA + bb;
      if (bins[bin[i]]++ === 0) occupied.push(bin[i]);
    }
    var best = -1, bestScore = -1;
    for (i = 0; i < occupied.length; i++) {
      var b0 = occupied[i], l0 = Math.floor(b0 / (NA * NA)), a0 = Math.floor(b0 / NA) % NA, c0 = b0 % NA, score = 0;
      for (var dl = -1; dl <= 1; dl++) for (var da = -1; da <= 1; da++) for (var db = -1; db <= 1; db++) {
        var l1 = l0 + dl, a1 = a0 + da, c1 = c0 + db;
        if (l1 < 0 || a1 < 0 || c1 < 0 || l1 >= NL || a1 >= NA || c1 >= NA) continue;
        score += bins[(l1 * NA + a1) * NA + c1];
      }
      if (score > bestScore) { bestScore = score; best = b0; }
    }
    var bL = Math.floor(best / (NA * NA)), bA = Math.floor(best / NA) % NA, bB = best % NA;
    var cL = 0, cA = 0, cB = 0, n = 0;
    for (i = 0; i < count; i++) {
      var x = bin[i];
      if (Math.abs(Math.floor(x / (NA * NA)) - bL) <= 1 && Math.abs(Math.floor(x / NA) % NA - bA) <= 1 && Math.abs(x % NA - bB) <= 1) {
        cL += labs[i * 3]; cA += labs[i * 3 + 1]; cB += labs[i * 3 + 2]; n++;
      }
    }
    cL /= n; cA /= n; cB /= n;

    var R = Math.max(12, T * 1.5), R2 = R * R, use = new Uint8Array(count), resid = new Float32Array(count);
    for (i = 0; i < count; i++) {
      var eL = labs[i * 3] - cL, eA = labs[i * 3 + 1] - cA, eB = labs[i * 3 + 2] - cB;
      use[i] = eL * eL + eA * eA + eB * eB <= R2 ? 1 : 0;
    }
    var coef = fitModel(pts, uv, use, count);
    for (var pass = 0; pass < 3 && coef; pass++) {
      for (i = 0; i < count; i++) {
        var u = uv[i * 2], v = uv[i * 2 + 1];
        var fL = labs[i * 3] - evalModel(coef, 0, u, v), fA = labs[i * 3 + 1] - evalModel(coef, 1, u, v), fB = labs[i * 3 + 2] - evalModel(coef, 2, u, v);
        resid[i] = Math.sqrt(fL * fL + fA * fA + fB * fB);
        use[i] = resid[i] <= R ? 1 : 0;
      }
      if (pass < 2) coef = fitModel(pts, uv, use, count) || coef;
    }
    if (!coef) throw fail("plain");

    /* Plain enough: at least 35% of the opaque border sits near the model. */
    var near = 0, Rs = Math.max(T, 10), mr = 0, mg = 0, mb = 0;
    for (i = 0; i < count; i++) {
      if (resid[i] <= Rs) {
        near++;
        mr += pts[i * 6 + 3]; mg += pts[i * 6 + 4]; mb += pts[i * 6 + 5];
      }
    }
    if (near < count * 0.35) throw fail("plain");
    return { coef: coef, rgb: [Math.round(mr / near), Math.round(mg / near), Math.round(mb / near)] };
  }

  /* Box average of `src` round pixel (x, y), clamped to the image. */
  function boxAt(src, w, h, x, y, r) {
    var sum = 0, cnt = 0, y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r), x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
    for (var yy = y0; yy <= y1; yy++) {
      for (var q = yy * w + x0, end = yy * w + x1; q <= end; q++) sum += src[q];
      cnt += x1 - x0 + 1;
    }
    return sum / cnt;
  }

  function removeImageData(imageData, opts) {
    if (!imageData || !imageData.data || !imageData.width || !imageData.height) throw fail("input");
    var o = options(opts);
    var w = imageData.width, h = imageData.height, n = w * h, d = imageData.data;
    /* Tolerance 0-100 maps to a delta E of 2-40. */
    var T = 2 + o.tolerance * 0.38, T2 = 2 * T + 12;
    var bd = findBackdrop(d, w, h, T), coef = bd.coef;
    var su = w > 1 ? 1 / (w - 1) : 0, sv = h > 1 ? 1 / (h - 1) : 0;

    /* Distance of every pixel from the backdrop model. */
    var dist = new Float32Array(n), cur = new Float32Array(3), x, y, i, j;
    var pr = -1, pg = -1, pb = -1;
    for (y = 0; y < h; y++) {
      var v = y * sv;
      var L0 = coef[0] + coef[2] * v, L1 = coef[1] + coef[3] * v;
      var A0 = coef[4] + coef[6] * v, A1 = coef[5] + coef[7] * v;
      var B0 = coef[8] + coef[10] * v, B1 = coef[9] + coef[11] * v;
      for (x = 0; x < w; x++) {
        i = y * w + x;
        j = i * 4;
        if (d[j + 3] < 8) { dist[i] = 0; continue; }
        if (d[j] !== pr || d[j + 1] !== pg || d[j + 2] !== pb) {
          pr = d[j]; pg = d[j + 1]; pb = d[j + 2];
          lab(pr, pg, pb, cur, 0);
        }
        var u = x * su;
        var eL = cur[0] - L0 - L1 * u, eA = cur[1] - A0 - A1 * u, eB = cur[2] - B0 - B1 * u;
        dist[i] = Math.sqrt(eL * eL + eA * eA + eB * eB);
      }
    }

    /* Flood fill from the matching border: 1 = background. */
    var state = new Uint8Array(n), queue = new Int32Array(n), head = 0, tail = 0;
    var border = borderOf(w, h);
    for (i = 0; i < border.length; i++) {
      j = border[i];
      if (!state[j] && dist[j] <= T) { state[j] = 1; queue[tail++] = j; }
    }
    while (head < tail) {
      i = queue[head++];
      x = i % w;
      if (x > 0 && !state[i - 1] && dist[i - 1] <= T) { state[i - 1] = 1; queue[tail++] = i - 1; }
      if (x < w - 1 && !state[i + 1] && dist[i + 1] <= T) { state[i + 1] = 1; queue[tail++] = i + 1; }
      if (i >= w && !state[i - w] && dist[i - w] <= T) { state[i - w] = 1; queue[tail++] = i - w; }
      if (i + w < n && !state[i + w] && dist[i + w] <= T) { state[i + w] = 1; queue[tail++] = i + w; }
    }
    var kept = n - tail;
    if (kept < Math.max(4, n * 0.00005)) throw fail("empty");

    /* The edge band: subject pixels within `depth` steps of the background. */
    var D = o.feather + 1, depth = new Uint8Array(n);
    head = tail = 0;
    for (i = 0; i < n; i++) {
      if (state[i]) continue;
      x = i % w;
      if ((x > 0 && state[i - 1]) || (x < w - 1 && state[i + 1]) || (i >= w && state[i - w]) || (i + w < n && state[i + w])) {
        depth[i] = 1;
        queue[tail++] = i;
      }
    }
    while (head < tail) {
      i = queue[head++];
      var nd = depth[i] + 1;
      if (nd > D) continue;
      x = i % w;
      if (x > 0 && !state[i - 1] && !depth[i - 1]) { depth[i - 1] = nd; queue[tail++] = i - 1; }
      if (x < w - 1 && !state[i + 1] && !depth[i + 1]) { depth[i + 1] = nd; queue[tail++] = i + 1; }
      if (i >= w && !state[i - w] && !depth[i - w]) { depth[i - w] = nd; queue[tail++] = i - w; }
      if (i + w < n && !state[i + w] && !depth[i + w]) { depth[i + w] = nd; queue[tail++] = i + w; }
    }
    var edges = queue.subarray(0, tail), ne = tail;

    var out = new Uint8ClampedArray(d);
    var alpha = new Float32Array(n);
    for (i = 0; i < n; i++) alpha[i] = state[i] ? 0 : 255;

    /* Soft alpha and un-mixed colour for each edge pixel, against the nearest
       solid subject pixel (F) and the backdrop at that spot (B). */
    var S = D + 1, rgbOut = new Uint8ClampedArray(ne * 3);
    for (var e = 0; e < ne; e++) {
      i = edges[e];
      j = i * 4;
      x = i % w;
      y = (i - x) / w;
      var Cr = d[j], Cg = d[j + 1], Cb = d[j + 2];
      var Br = evalModel(coef, 3, x * su, y * sv), Bg = evalModel(coef, 4, x * su, y * sv), Bb = evalModel(coef, 5, x * su, y * sv);
      var fi = -1, fd = 1e9, mi = i, md = dist[i];
      var y0 = Math.max(0, y - S), y1 = Math.min(h - 1, y + S), x0 = Math.max(0, x - S), x1 = Math.min(w - 1, x + S);
      for (var yy = y0; yy <= y1; yy++) {
        for (var xx = x0; xx <= x1; xx++) {
          var q = yy * w + xx;
          if (state[q] || d[q * 4 + 3] < 128) continue;
          if (!depth[q]) {
            var dq = (xx - x) * (xx - x) + (yy - y) * (yy - y);
            if (dq < fd) { fd = dq; fi = q; }
          } else if (dist[q] > md) { md = dist[q]; mi = q; }
        }
      }
      if (fi < 0) fi = mi;
      var Fr = d[fi * 4] - Br, Fg = d[fi * 4 + 1] - Bg, Fb = d[fi * 4 + 2] - Bb;
      var Xr = Cr - Br, Xg = Cg - Bg, Xb = Cb - Bb;
      var len2 = Fr * Fr + Fg * Fg + Fb * Fb;
      var aDist = Math.min(1, Math.max(0, (dist[i] - T) / (T2 - T))), a;
      if (len2 < 100) {
        a = aDist;
      } else {
        a = Math.min(1, Math.max(0, (Xr * Fr + Xg * Fg + Xb * Fb) / len2));
        var rr = Xr - a * Fr, rg = Xg - a * Fg, rb = Xb - a * Fb;
        if (rr * rr + rg * rg + rb * rb > 0.25 * len2) a = aDist;
      }
      if (a >= 0.995) {
        rgbOut[e * 3] = Cr; rgbOut[e * 3 + 1] = Cg; rgbOut[e * 3 + 2] = Cb;
      } else if (a < 0.05) {
        rgbOut[e * 3] = d[fi * 4]; rgbOut[e * 3 + 1] = d[fi * 4 + 1]; rgbOut[e * 3 + 2] = d[fi * 4 + 2];
      } else {
        rgbOut[e * 3] = Br + Xr / a; rgbOut[e * 3 + 1] = Bg + Xg / a; rgbOut[e * 3 + 2] = Bb + Xb / a;
      }
      alpha[i] = a * 255;
    }

    /* Feather inside the band only: the background stays clear and the
       interior stays solid. */
    var soft = new Float32Array(ne);
    for (e = 0; e < ne; e++) {
      i = edges[e];
      soft[e] = alpha[i];
      if (o.feather > 0) {
        x = i % w;
        soft[e] = Math.min(alpha[i], boxAt(alpha, w, h, x, (i - x) / w, o.feather));
      }
    }
    for (e = 0; e < ne; e++) {
      i = edges[e];
      j = i * 4;
      alpha[i] = soft[e];
      out[j] = rgbOut[e * 3]; out[j + 1] = rgbOut[e * 3 + 1]; out[j + 2] = rgbOut[e * 3 + 2];
    }

    var lost = 0;
    for (i = 0; i < n; i++) {
      j = i * 4 + 3;
      var na = Math.min(d[j], Math.round(alpha[i]));
      lost += d[j] - na;
      out[j] = na;
    }

    var result;
    try { result = new ImageData(out, w, h); } catch (err) { result = { data: out, width: w, height: h }; }
    return { imageData: result, removed: lost / (255 * n), background: bd.rgb };
  }

  /* Loading. A cross-origin URL is asked for with CORS; if that fails but a
     plain request works, the site is what's in the way, not the link. */
  function isRemote(url) {
    if (!/^https?:/i.test(url)) return false;
    try { return new URL(url, location.href).origin !== location.origin; } catch (err) { return true; }
  }

  function image(url, cors) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(fail("load")); };
      img.decoding = "async";
      img.src = url;
    });
  }

  function load(src) {
    if (!src) return Promise.reject(fail("input"));
    if (typeof src === "string") {
      var remote = isRemote(src);
      return image(src, remote).then(null, function () {
        if (!remote) throw fail("load");
        return image(src, false).then(function () { throw fail("tainted"); }, function () { throw fail("load"); });
      });
    }
    if (typeof Blob !== "undefined" && src instanceof Blob) {
      var url = URL.createObjectURL(src);
      return image(url, false).then(function (img) {
        URL.revokeObjectURL(url);
        return img;
      }, function (err) {
        URL.revokeObjectURL(url);
        throw err;
      });
    }
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) {
      if (src.complete) return src.naturalWidth ? Promise.resolve(src) : Promise.reject(fail("load"));
      return new Promise(function (resolve, reject) {
        src.addEventListener("load", function () { resolve(src); });
        src.addEventListener("error", function () { reject(fail("load")); });
      });
    }
    if (src.data && src.width && src.height) {
      var c = document.createElement("canvas");
      c.width = src.width;
      c.height = src.height;
      c.getContext("2d").putImageData(src, 0, 0);
      return Promise.resolve(c);
    }
    if (src.width && src.height && (src.getContext || typeof src.close === "function")) return Promise.resolve(src);
    return Promise.reject(fail("input"));
  }

  function remove(src, opts) {
    var o = options(opts);
    return load(src).then(function (img) {
      var w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
      if (!w0 || !h0) throw fail("load");
      var scale = Math.min(1, o.maxSize / Math.max(w0, h0));
      var w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      var data;
      try { data = ctx.getImageData(0, 0, w, h); } catch (err) { throw fail("tainted"); }
      var r = removeImageData(data, o);
      ctx.putImageData(r.imageData, 0, 0);
      var url;
      try { url = canvas.toDataURL("image/png"); } catch (err) { throw fail("tainted"); }
      return { dataUrl: url, width: w, height: h, removed: r.removed, background: r.background };
    });
  }

  window.DovetailRemoveBackground = { remove: remove, removeImageData: removeImageData };
})();

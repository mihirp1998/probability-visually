/* Shared helpers for the interactive probability notes.
 * Everything lives on the global `P`.  No dependencies besides KaTeX (optional).
 *
 *   P.chart(el, opts)        – SVG chart with axes, returns drawing API
 *   P.slider / P.select / P.button / P.checkbox – controls
 *   P.readout(el, items)     – key/value readout row
 *   P.legend(el, items)      – color legend
 *   P.quiz(el, {...})        – multiple-choice quick check
 *   P.tex(el, src, display)  – render TeX into element
 *   P.rand.*                 – samplers
 *   P.m.*                    – math utilities (choose, pmfs, normal cdf, ...)
 */
(function () {
  const P = (window.P = {});
  const NS = "http://www.w3.org/2000/svg";

  /* ---------------------------------------------------------------- utils */
  P.$ = (sel, root = document) => (typeof sel === "string" ? root.querySelector(sel) : sel);
  P.el = function (tag, attrs = {}, parent) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  };
  function svgEl(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  }
  P.svgEl = svgEl;
  // 'c1'..'c6' -> CSS var; anything else passed through
  P.color = (c) => (c == null ? "var(--c1)" : /^c\d$/.test(c) ? `var(--${c})` : c);
  P.fmt = function (x, d = 3) {
    if (!isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "—";
    if (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) return x.toExponential(2);
    return (+x.toFixed(d)).toString();
  };
  P.pct = (x, d = 1) => (100 * x).toFixed(d) + "%";
  P.range = (a, b, step = 1) => { const r = []; for (let x = a; x <= b + 1e-12; x += step) r.push(x); return r; };
  P.linspace = (a, b, n = 200) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  P.sum = (arr) => arr.reduce((s, x) => s + x, 0);
  P.mean = (arr) => P.sum(arr) / arr.length;
  P.variance = (arr) => { const m = P.mean(arr); return P.mean(arr.map((x) => (x - m) ** 2)); };
  P.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ------------------------------------------------------------- tex */
  P.macros = {
    "\\E": "\\mathbb{E}", "\\Var": "\\operatorname{Var}", "\\Cov": "\\operatorname{Cov}",
    "\\Bern": "\\operatorname{Bernoulli}", "\\Bin": "\\operatorname{Binomial}", "\\Pois": "\\operatorname{Poisson}",
    "\\Geom": "\\operatorname{Geometric}", "\\Exp": "\\operatorname{Exp}", "\\Unif": "\\operatorname{Uniform}",
    "\\N": "\\mathcal{N}", "\\1": "\\mathbf{1}", "\\R": "\\mathbb{R}",
  };
  P.tex = function (el, src, display = false) {
    el = P.$(el);
    if (window.katex) {
      try { katex.render(src, el, { displayMode: display, throwOnError: false, macros: P.macros }); return el; } catch (e) {}
    }
    el.textContent = src;
    return el;
  };
  P.renderMath = function (root = document.body) {
    if (window.renderMathInElement) {
      renderMathInElement(root, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
        macros: P.macros,
        ignoredClasses: ["no-math"],
      });
    }
  };

  /* ------------------------------------------------------------ math */
  const m = (P.m = {});
  const LF = [0];
  m.logFact = function (n) {
    if (n < 0) return NaN;
    if (n < LF.length) return LF[n];
    for (let i = LF.length; i <= Math.min(n, 5000); i++) LF[i] = LF[i - 1] + Math.log(i);
    if (n <= 5000) return LF[n];
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n); // Stirling
  };
  m.fact = (n) => Math.round(Math.exp(m.logFact(n)));
  m.logChoose = (n, k) => (k < 0 || k > n ? -Infinity : m.logFact(n) - m.logFact(k) - m.logFact(n - k));
  m.choose = function (n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  };
  m.harmonic = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 1 / i; return s; };

  // PMFs / PDFs / CDFs
  m.bernoulliPmf = (k, p) => (k === 1 ? p : k === 0 ? 1 - p : 0);
  m.binomPmf = (k, n, p) => {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(m.logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  };
  m.poissonPmf = (k, l) => (k < 0 ? 0 : Math.exp(k * Math.log(l) - l - m.logFact(k)));
  m.geomPmf = (k, p) => (k < 1 ? 0 : Math.pow(1 - p, k - 1) * p); // trials until first success
  m.uniformPdf = (x, a, b) => (x >= a && x <= b ? 1 / (b - a) : 0);
  m.expPdf = (x, l) => (x < 0 ? 0 : l * Math.exp(-l * x));
  m.normalPdf = (x, mu = 0, s = 1) => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  m.erf = function (x) {
    // Abramowitz–Stegun 7.1.26 (max err ~1.5e-7)
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  };
  m.normalCdf = (x, mu = 0, s = 1) => 0.5 * (1 + m.erf((x - mu) / (s * Math.SQRT2)));
  m.normalInv = function (p) {
    // Acklam's rational approximation
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };

  // Solve linear system A x = b (Gaussian elimination, partial pivoting). Returns x.
  m.solve = function (A, b) {
    const n = A.length, M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  };

  /* ---------------------------------------------------------- random */
  const R = (P.rand = {});
  R.uniform = (a = 0, b = 1) => a + (b - a) * Math.random();
  R.int = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // inclusive
  R.bernoulli = (p) => (Math.random() < p ? 1 : 0);
  R.normal = (mu = 0, s = 1) => {
    let u = 0; while (u === 0) u = Math.random();
    return mu + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  };
  R.exp = (l) => -Math.log(1 - Math.random()) / l;
  R.binomial = (n, p) => { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return k; };
  R.poisson = (l) => {
    if (l > 50) return Math.max(0, Math.round(R.normal(l, Math.sqrt(l))));
    const L = Math.exp(-l); let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };
  R.geometric = (p) => Math.max(1, Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - p)));
  R.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  R.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // histogram: returns [{x0,x1,x (center), count, density}]
  P.histogram = function (samples, bins, lo, hi) {
    if (lo === undefined) { lo = Math.min(...samples); hi = Math.max(...samples); }
    const w = (hi - lo) / bins || 1;
    const out = Array.from({ length: bins }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, x: lo + (i + 0.5) * w, count: 0 }));
    for (const s of samples) {
      const i = Math.floor((s - lo) / w);
      if (i >= 0 && i < bins) out[i].count++;
      else if (s === hi) out[bins - 1].count++;
    }
    for (const b of out) b.density = b.count / (samples.length * w);
    return out;
  };
  // counts of integer samples -> [{x, count, freq}]
  P.counts = function (samples, lo, hi) {
    const out = [];
    for (let k = lo; k <= hi; k++) out.push({ x: k, count: 0 });
    for (const s of samples) if (s >= lo && s <= hi) out[s - lo].count++;
    for (const o of out) o.freq = o.count / samples.length;
    return out;
  };

  /* ----------------------------------------------------------- chart */
  function niceTicks(lo, hi, n = 6) {
    const span = hi - lo;
    if (!(span > 0)) return [lo];
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    const t = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return t;
  }
  P.niceTicks = niceTicks;

  /**
   * P.chart(el, {width, height, x:[lo,hi], y:[lo,hi], xLabel, yLabel, xTicks, yTicks,
   *              xFormat, yFormat, grid:true, margin:{t,r,b,l}})
   * Returns api: { svg, sx, sy, W, H, clear(), domain(x,y), bars(), line(), area(), vline(), hline(),
   *                dots(), text(), rect(), path(), g }
   * All drawing is in DATA coordinates. Colors: 'c1'..'c6' or any CSS color.
   */
  P.chart = function (el, o = {}) {
    el = P.$(el);
    const W = o.width || 640, H = o.height || 280;
    const mg = Object.assign({ t: 14, r: 14, b: o.xLabel ? 42 : 28, l: o.yLabel ? 56 : 44 }, o.margin || {});
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" }, el);
    const axes = svgEl("g", { class: "axis" }, svg);
    const g = svgEl("g", {}, svg);
    const api = { svg, g, W, H, mg };
    let xd = o.x || [0, 1], yd = o.y || [0, 1];
    api.sx = (v) => mg.l + ((v - xd[0]) / (xd[1] - xd[0])) * (W - mg.l - mg.r);
    api.sy = (v) => H - mg.b - ((v - yd[0]) / (yd[1] - yd[0])) * (H - mg.t - mg.b);
    api.ix = (px) => xd[0] + ((px - mg.l) / (W - mg.l - mg.r)) * (xd[1] - xd[0]); // inverse
    api.iy = (py) => yd[0] + ((H - mg.b - py) / (H - mg.t - mg.b)) * (yd[1] - yd[0]);
    const xf = o.xFormat || ((v) => P.fmt(v, 3)), yf = o.yFormat || ((v) => P.fmt(v, 3));

    function drawAxes() {
      axes.innerHTML = "";
      const { sx, sy } = api;
      if (o.grid !== false) {
        const gg = svgEl("g", { class: "grid" }, axes);
        for (const t of o.yTicks || niceTicks(yd[0], yd[1], 5)) svgEl("line", { x1: mg.l, x2: W - mg.r, y1: sy(t), y2: sy(t) }, gg);
      }
      svgEl("line", { x1: mg.l, x2: W - mg.r, y1: H - mg.b, y2: H - mg.b }, axes);
      svgEl("line", { x1: mg.l, x2: mg.l, y1: mg.t, y2: H - mg.b }, axes);
      if (o.xAxis !== false)
        for (const t of o.xTicks || niceTicks(xd[0], xd[1], o.xTickCount || 8)) {
          if (t < xd[0] - 1e-9 || t > xd[1] + 1e-9) continue;
          svgEl("line", { x1: sx(t), x2: sx(t), y1: H - mg.b, y2: H - mg.b + 4 }, axes);
          svgEl("text", { x: sx(t), y: H - mg.b + 16, "text-anchor": "middle" }, axes).textContent = xf(t);
        }
      if (o.yAxis !== false)
        for (const t of o.yTicks || niceTicks(yd[0], yd[1], 5)) {
          if (t < yd[0] - 1e-9 || t > yd[1] + 1e-9) continue;
          svgEl("text", { x: mg.l - 6, y: sy(t) + 4, "text-anchor": "end" }, axes).textContent = yf(t);
        }
      if (o.xLabel) svgEl("text", { x: (mg.l + W - mg.r) / 2, y: H - 6, "text-anchor": "middle" }, axes).textContent = o.xLabel;
      if (o.yLabel) svgEl("text", { x: 14, y: (mg.t + H - mg.b) / 2, "text-anchor": "middle", transform: `rotate(-90 14 ${(mg.t + H - mg.b) / 2})` }, axes).textContent = o.yLabel;
    }
    api.domain = function (x, y) { if (x) xd = x; if (y) y && (yd = y); drawAxes(); return api; };
    api.getDomain = () => ({ x: xd.slice(), y: yd.slice() });
    api.clear = function () { g.innerHTML = ""; return api; };

    const st = (color, extra = "") => `${extra}`;
    // bars: data [{x, y}] ; opts {w (data units), color, opacity, offset}
    api.bars = function (data, op = {}) {
      const w = op.w ?? 0.8, off = op.offset ?? 0, out = svgEl("g", {}, g);
      for (const d of data) {
        const x0 = api.sx(d.x - w / 2 + off), x1 = api.sx(d.x + w / 2 + off);
        const y0 = api.sy(Math.max(yd[0], 0)), y1 = api.sy(P.clamp(d.y, yd[0], yd[1]));
        const r = svgEl("rect", { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.max(0.5, Math.abs(x1 - x0)), height: Math.abs(y0 - y1),
          style: `fill:${P.color(d.color || op.color)};opacity:${op.opacity ?? 0.85}`, rx: 1.5 }, out);
        if (op.title || d.title) svgEl("title", {}, r).textContent = d.title || op.title(d);
      }
      return out;
    };
    // line: pts [[x,y],...] or [{x,y}]
    const toXY = (p) => (Array.isArray(p) ? p : [p.x, p.y]);
    // clip lines to the plot area (other marks are drawn unclipped so labels can overflow)
    const clipId = "clip" + Math.random().toString(36).slice(2, 9);
    const clip = svgEl("clipPath", { id: clipId }, svgEl("defs", {}, svg));
    const clipRect = svgEl("rect", {}, clip);
    const syncClip = () => { clipRect.setAttribute("x", mg.l); clipRect.setAttribute("y", mg.t - 2); clipRect.setAttribute("width", W - mg.l - mg.r); clipRect.setAttribute("height", H - mg.t - mg.b + 4); };
    syncClip();
    api.line = function (pts, op = {}) {
      // non-finite y values break the line into separate segments
      let d = "", pen = false;
      const span = yd[1] - yd[0];
      for (const [x, y] of pts.map(toXY)) {
        if (!isFinite(y) || !isFinite(x)) { pen = false; continue; }
        d += `${pen ? "L" : "M"}${api.sx(x).toFixed(2)},${api.sy(P.clamp(y, yd[0] - 10 * span, yd[1] + 10 * span)).toFixed(2)}`;
        pen = true;
      }
      return svgEl("path", { d, "clip-path": op.clip === false ? null : `url(#${clipId})`, style: `fill:none;stroke:${P.color(op.color)};stroke-width:${op.width ?? 2.2};opacity:${op.opacity ?? 1};${op.dash ? `stroke-dasharray:${op.dash === true ? "5 4" : op.dash};` : ""}stroke-linejoin:round;stroke-linecap:round` }, g);
    };
    // step line for CDFs of discrete RVs
    api.step = function (pts, op = {}) {
      const P2 = [];
      pts.map(toXY).forEach(([x, y], i, a) => { P2.push([x, y]); if (i < a.length - 1) P2.push([a[i + 1][0], y]); });
      return api.line(P2, op);
    };
    api.area = function (pts, op = {}) {
      const a = pts.map(toXY); if (!a.length) return;
      const base = op.base ?? Math.max(0, yd[0]);
      let d = `M${api.sx(a[0][0])},${api.sy(base)}`;
      for (const [x, y] of a) d += `L${api.sx(x).toFixed(2)},${api.sy(P.clamp(y, yd[0], yd[1])).toFixed(2)}`;
      d += `L${api.sx(a[a.length - 1][0])},${api.sy(base)}Z`;
      return svgEl("path", { d, style: `fill:${P.color(op.color)};opacity:${op.opacity ?? 0.25};stroke:none` }, g);
    };
    api.vline = function (x, op = {}) {
      const out = svgEl("g", {}, g);
      svgEl("line", { x1: api.sx(x), x2: api.sx(x), y1: api.sy(op.y0 ?? yd[0]), y2: api.sy(op.y1 ?? yd[1]),
        style: `stroke:${P.color(op.color || "c6")};stroke-width:${op.width ?? 1.5};${op.dash !== false ? "stroke-dasharray:4 3" : ""}` }, out);
      if (op.label) svgEl("text", { x: api.sx(x) + 4, y: api.sy(op.y1 ?? yd[1]) + 12, style: `fill:${P.color(op.color || "c6")};font-weight:600` }, out).textContent = op.label;
      return out;
    };
    api.hline = function (y, op = {}) {
      const out = svgEl("g", {}, g);
      svgEl("line", { x1: api.sx(op.x0 ?? xd[0]), x2: api.sx(op.x1 ?? xd[1]), y1: api.sy(y), y2: api.sy(y),
        style: `stroke:${P.color(op.color || "c6")};stroke-width:${op.width ?? 1.5};${op.dash !== false ? "stroke-dasharray:4 3" : ""}` }, out);
      if (op.label) svgEl("text", { x: api.sx(op.x1 ?? xd[1]) - 4, y: api.sy(y) - 5, "text-anchor": "end", style: `fill:${P.color(op.color || "c6")};font-weight:600` }, out).textContent = op.label;
      return out;
    };
    api.dots = function (pts, op = {}) {
      const out = svgEl("g", {}, g);
      for (const p of pts.map(toXY)) svgEl("circle", { cx: api.sx(p[0]), cy: api.sy(p[1]), r: op.r ?? 3.5, style: `fill:${P.color(op.color)};opacity:${op.opacity ?? 1};${op.stroke ? `stroke:${P.color(op.stroke)};stroke-width:1.5` : ""}` }, out);
      return out;
    };
    api.text = function (x, y, s, op = {}) {
      const t = svgEl("text", { x: api.sx(x) + (op.dx || 0), y: api.sy(y) + (op.dy || 0), "text-anchor": op.anchor || "middle",
        style: `fill:${P.color(op.color || "var(--ink)")};font-size:${op.size || 12}px;font-weight:${op.weight || 500}` }, g);
      t.textContent = s; return t;
    };
    api.rect = function (x0, y0, x1, y1, op = {}) {
      return svgEl("rect", { x: Math.min(api.sx(x0), api.sx(x1)), y: Math.min(api.sy(y0), api.sy(y1)), width: Math.abs(api.sx(x1) - api.sx(x0)), height: Math.abs(api.sy(y1) - api.sy(y0)),
        rx: op.rx ?? 0, style: `fill:${P.color(op.color)};opacity:${op.opacity ?? 0.3};${op.stroke ? `stroke:${P.color(op.stroke)};stroke-width:1.5` : ""}` }, g);
    };
    drawAxes();
    return api;
  };

  /* -------------------------------------------------------- controls */
  // P.slider(parent, {label, min, max, step, value, format, onInput}) -> {value, set(v), el}
  P.slider = function (parent, o) {
    const wrap = P.el("div", { class: "ctl" }, P.$(parent));
    const lab = P.el("label", {}, wrap);
    if (o.tex && window.katex) P.tex(lab, o.label); else lab.textContent = o.label;
    const inp = P.el("input", { type: "range", min: o.min, max: o.max, step: o.step ?? 1, value: o.value }, wrap);
    const v = P.el("span", { class: "v" }, wrap);
    const fmt = o.format || ((x) => P.fmt(x, 3));
    const api = {
      el: wrap,
      get value() { return +inp.value; },
      set(x, fire = true) { inp.value = x; v.textContent = fmt(+inp.value); if (fire && o.onInput) o.onInput(+inp.value); },
    };
    inp.addEventListener("input", () => { v.textContent = fmt(+inp.value); o.onInput && o.onInput(+inp.value); });
    v.textContent = fmt(+inp.value);
    return api;
  };
  // P.select(parent, {label, options:[{value,label}] | [string], value, onChange})
  P.select = function (parent, o) {
    const wrap = P.el("div", { class: "ctl" }, P.$(parent));
    if (o.label) P.el("label", { text: o.label }, wrap);
    const s = P.el("select", {}, wrap);
    for (const op of o.options) {
      const val = typeof op === "object" ? op.value : op, lab = typeof op === "object" ? op.label : op;
      P.el("option", { value: val, text: lab }, s);
    }
    if (o.value !== undefined) s.value = o.value;
    s.addEventListener("change", () => o.onChange && o.onChange(s.value));
    return { el: wrap, get value() { return s.value; }, set(x) { s.value = x; o.onChange && o.onChange(x); } };
  };
  P.button = function (parent, label, onClick, cls = "") {
    return P.el("button", { class: "btn " + cls, text: label, onclick: onClick }, P.$(parent));
  };
  P.checkbox = function (parent, o) {
    const wrap = P.el("label", { class: "ctl" }, P.$(parent));
    const c = P.el("input", { type: "checkbox" }, wrap);
    c.checked = !!o.value;
    P.el("span", { text: o.label }, wrap);
    c.addEventListener("change", () => o.onChange && o.onChange(c.checked));
    return { el: wrap, get value() { return c.checked; } };
  };
  // P.readout(el, [{label, value, color}])  (label may contain TeX if wrapped in $...$)
  P.readout = function (el, items) {
    el = P.$(el); el.innerHTML = "";
    for (const it of items) {
      const r = P.el("span", { class: "r" }, el);
      const l = P.el("span", {}, r);
      l.innerHTML = it.label;
      P.el("span", { text: " " }, r);
      const b = P.el("b", { text: it.value }, r);
      if (it.color) b.style.color = P.color(it.color);
    }
    P.renderMath(el);
  };
  P.legend = function (el, items) {
    el = P.$(el);
    const box = P.el("div", { class: "legend" }, el);
    for (const it of items) { const s = P.el("span", { class: it.dash ? "dash" : "" }, box); s.style.setProperty("--sw", P.color(it.color)); s.innerHTML = it.label; }
    P.renderMath(box);
    return box;
  };

  // Animation loop helper: P.loop(fn) -> {start, stop, running}; fn(dt) returns false to stop.
  P.loop = function (fn) {
    let id = null, last = 0;
    const api = {
      get running() { return id !== null; },
      start() { if (id !== null) return; last = performance.now(); const tick = (t) => { const r = fn(t - last); last = t; if (r === false) { id = null; api.onstop && api.onstop(); return; } id = requestAnimationFrame(tick); }; id = requestAnimationFrame(tick); },
      stop() { if (id !== null) cancelAnimationFrame(id); id = null; },
    };
    return api;
  };

  /* ------------------------------------------------------------ quiz */
  // P.quiz(el, {q, choices:[...], answer: index, explain})  — strings may contain $TeX$
  P.quiz = function (el, o) {
    el = P.$(el); el.classList.add("quiz");
    P.el("div", { class: "q", html: o.q }, el);
    const ch = P.el("div", { class: "choices" }, el);
    const ex = P.el("div", { class: "explain", html: o.explain || "" }, el);
    o.choices.forEach((c, i) => {
      const b = P.el("button", { class: "choice", html: c }, ch);
      b.onclick = () => {
        el.classList.add("answered");
        b.classList.add(i === o.answer ? "right" : "wrong");
        ch.children[o.answer].classList.add("right");
        ex.innerHTML = (i === o.answer ? "<b>✓ Correct.</b> " : "<b>✗ Not quite.</b> ") + (o.explain || "");
        P.renderMath(ex);
      };
    });
    P.renderMath(el);
  };
  // Declarative quizzes: <div class="quiz" data-answer="1"><div class="q">..</div><ul><li>..</li></ul><div class="explain">..</div></div>
  function initDeclarativeQuizzes() {
    document.querySelectorAll(".quiz[data-answer]").forEach((el) => {
      const q = el.querySelector(".q")?.innerHTML || "";
      const choices = [...el.querySelectorAll("li")].map((li) => li.innerHTML);
      const explain = el.querySelector(".explain")?.innerHTML || "";
      el.innerHTML = "";
      P.quiz(el, { q, choices, answer: +el.dataset.answer, explain });
    });
  }
  P._initQuizzes = initDeclarativeQuizzes;
})();

/* Widgets for expectation.html */
(function () {
  const { m, rand: R } = P;
  const svgEl = P.svgEl;
  // pointer event -> data x on a P.chart
  const toDataX = (c, e) => { const r = c.svg.getBoundingClientRect(); return c.ix(((e.clientX - r.left) * c.W) / r.width); };
  const intTicks = (v) => (Number.isInteger(v) ? v : "");

  /* ------------------------------------------------ tail formula */
  (function tail() {
    const D = {
      exp: { label: "Exponential(λ)", par: { k: "λ", min: 0.3, max: 3, step: 0.05, v: 0.7 }, xmax: 8,
        S: (x, q) => Math.exp(-q * x), mean: (q) => 1 / q, tex: "e^{-\\lambda x}" },
      unif: { label: "Uniform(0, b)", par: { k: "b", min: 0.5, max: 6, step: 0.1, v: 4 }, xmax: 6.5,
        S: (x, q) => P.clamp(1 - x / q, 0, 1), mean: (q) => q / 2, tex: "1-x/b" },
      geom: { label: "Geometric(p)  (discrete)", par: { k: "p", min: 0.1, max: 0.9, step: 0.01, v: 0.3 }, xmax: 14,
        S: (x, q) => Math.pow(1 - q, Math.floor(x)), mean: (q) => 1 / q, tex: "(1-p)^{\\lfloor x\\rfloor}" },
      max: { label: "max of n Uniform(0,1)", par: { k: "n", min: 1, max: 12, step: 1, v: 3 }, xmax: 1.2,
        S: (x, q) => (x >= 1 ? 0 : 1 - Math.pow(x, q)), mean: (q) => q / (q + 1), tex: "1-x^n" },
    };
    let cur = "exp", q = D[cur].par.v, t = 1;
    const parEl = P.$("#tl-params");
    P.select("#tl-ctl", { label: "Distribution", options: Object.entries(D).map(([k, d]) => ({ value: k, label: d.label })), value: cur, onChange: (v) => { cur = v; build(); } });
    function build() {
      parEl.innerHTML = "";
      const d = D[cur]; q = d.par.v; t = d.xmax * 0.2;
      P.slider(parEl, { label: d.par.k, min: d.par.min, max: d.par.max, step: d.par.step, value: q, onInput: (v) => { q = v; draw(); } });
      P.slider(parEl, { label: "strip at t", min: 0, max: d.xmax, step: d.xmax / 200, value: t, format: (v) => v.toFixed(2), onInput: (v) => { t = v; draw(); } });
      draw();
    }
    function draw() {
      const d = D[cur], el = P.$("#tl-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, d.xmax], y: [0, 1.1], height: 250, xLabel: "x", yLabel: "P(X > x)" });
      const xs = P.linspace(0, d.xmax, 1200), ys = xs.map((x) => d.S(x, q));
      // for step functions draw dense points; area as polygon
      c.area(xs.map((x, i) => [x, ys[i]]), { color: "c1", opacity: 0.22 });
      c.line(xs.map((x, i) => [x, ys[i]]), { color: "c1" });
      const w = d.xmax / 60, h = d.S(t, q);
      c.rect(t, 0, Math.min(d.xmax, t + w), h, { color: "c2", opacity: 0.75 });
      c.text(Math.min(t + w / 2, d.xmax * 0.97), h + 0.05, `P(X>${P.fmt(t, 2)}) = ${P.fmt(h, 3)}`, { color: "c2", weight: 600, anchor: t > d.xmax * 0.7 ? "end" : "start" });
      const mu = d.mean(q);
      c.vline(Math.min(mu, d.xmax), { color: "c4", label: "E[X]" });
      // numeric area (midpoint rule)
      // integrate well past the visible window so truncation doesn't show
      const XM = d.xmax * 12, N = 24000, dx = XM / N; let area = 0;
      for (let i = 0; i < N; i++) area += d.S((i + 0.5) * dx, q) * dx;
      P.readout("#tl-read", [
        { label: `$P(X>x)=${d.tex}$`, value: "" },
        { label: "area under curve", value: P.fmt(area, 4), color: "c1" },
        { label: "$\\E[X]$ =", value: P.fmt(mu, 4), color: "c4" },
      ]);
    }
    build();
  })();

  /* ------------------------------------------------ variance as squares */
  (function variance() {
    const init = [2, 3.5, 5, 6, 8.5];
    let pts = init.slice(), drag = -1;
    const el = P.$("#vr-chart");
    const W = 640, H = 300, mg = { l: 14, r: 14, t: 10, b: 30 };
    const pxPerUnit = (W - mg.l - mg.r) / 10;
    const c = P.chart(el, { width: W, height: H, margin: mg, x: [0, 10], y: [0, (H - mg.t - mg.b) / pxPerUnit], yAxis: false, grid: false });
    const cols = ["c1", "c3", "c5", "c2", "c4"];
    P.button("#vr-ctl", "Add point", () => { if (pts.length < 10) pts.push(+R.uniform(1, 9).toFixed(1)); draw(); });
    P.button("#vr-ctl", "Remove point", () => { if (pts.length > 2) pts.pop(); draw(); }, "ghost");
    P.button("#vr-ctl", "Add outlier", () => { if (pts.length < 10) pts.push(9.8); draw(); }, "ghost");
    P.button("#vr-ctl", "Reset", () => { pts = init.slice(); draw(); }, "ghost");

    c.svg.addEventListener("pointerdown", (e) => {
      const x = toDataX(c, e); let best = -1, bd = 1;
      pts.forEach((p, i) => { if (Math.abs(p - x) < bd) { bd = Math.abs(p - x); best = i; } });
      if (best >= 0) { drag = best; c.svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    c.svg.addEventListener("pointermove", (e) => { if (drag < 0) return; pts[drag] = +P.clamp(toDataX(c, e), 0, 10).toFixed(1); draw(); });
    const end = () => { drag = -1; draw(); };
    c.svg.addEventListener("pointerup", end);
    c.svg.addEventListener("pointercancel", end);

    function draw() {
      c.clear();
      const mu = P.mean(pts), v = P.variance(pts), sd = Math.sqrt(v);
      pts.forEach((p, i) => {
        const d = Math.abs(p - mu), col = cols[i % cols.length];
        if (d > 1e-9) c.rect(Math.min(p, mu), 0, Math.max(p, mu), d, { color: col, opacity: 0.16, stroke: col });
      });
      const sq = c.rect(mu - sd / 2, 0, mu + sd / 2, sd, { color: "c4", opacity: 0.12, stroke: "c4" });
      sq.style.strokeDasharray = "6 4"; sq.style.strokeWidth = "2.5";
      c.text(mu, sd + 0.12, "Var = avg area", { color: "c4", weight: 700, size: 12, dy: -4 });
      // fulcrum
      const fx = c.sx(mu), fy = c.sy(0);
      svgEl("path", { d: `M${fx},${fy} L${fx - 8},${fy + 12} L${fx + 8},${fy + 12} Z`, style: "fill:var(--c4)" }, c.g);
      pts.forEach((p, i) => c.dots([[p, 0]], { r: drag === i ? 10 : 8, color: cols[i % cols.length], stroke: "var(--panel)" }));
      const ex2 = P.mean(pts.map((x) => x * x));
      P.readout("#vr-read", [
        { label: "mean $\\mu$", value: P.fmt(mu, 3), color: "c4" },
        { label: "$\\frac1n\\sum(x_i-\\mu)^2$ =", value: P.fmt(v, 3), color: "c4" },
        { label: "$\\E[X^2]-\\mu^2$ =", value: `${P.fmt(ex2, 3)} − ${P.fmt(mu * mu, 3)} = ${P.fmt(ex2 - mu * mu, 3)}` },
        { label: "$\\sigma$ =", value: P.fmt(sd, 3) },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ PDF <-> CDF */
  (function pdfcdf() {
    const mix = { pdf: (x) => 0.6 * m.normalPdf(x, -1.2, 0.6) + 0.4 * m.normalPdf(x, 1.5, 0.8), cdf: (x) => 0.6 * m.normalCdf(x, -1.2, 0.6) + 0.4 * m.normalCdf(x, 1.5, 0.8) };
    const D = {
      normal: { label: "Normal(0, 1)", lo: -4, hi: 4, a: -1, b: 1, pdf: (x) => m.normalPdf(x), cdf: (x) => m.normalCdf(x) },
      exp: { label: "Exponential(1)", lo: -0.5, hi: 5, a: 0.5, b: 2, pdf: (x) => m.expPdf(x, 1), cdf: (x) => (x < 0 ? 0 : 1 - Math.exp(-x)) },
      mix: { label: "Bimodal mixture", lo: -4, hi: 4, a: -2, b: 0, pdf: mix.pdf, cdf: mix.cdf },
      binom: { label: "Binomial(6, ½)  (discrete)", lo: -1, hi: 7, a: 1, b: 4, discrete: true, pmf: (k) => m.binomPmf(k, 6, 0.5),
        cdf: (x) => { let s = 0; for (let k = 0; k <= Math.min(6, Math.floor(x + 1e-9)); k++) s += m.binomPmf(k, 6, 0.5); return s; } },
    };
    let cur = "normal", a, b;
    const parEl = P.$("#cd-params");
    P.select("#cd-ctl", { label: "Distribution", options: Object.entries(D).map(([k, d]) => ({ value: k, label: d.label })), value: cur, onChange: (v) => { cur = v; build(); } });
    let sa;
    P.button("#cd-ctl", "a = −∞", () => sa.set(D[cur].lo), "ghost");
    function build() {
      const d = D[cur]; a = d.a; b = d.b; parEl.innerHTML = "";
      const step = d.discrete ? 0.25 : 0.05;
      sa = P.slider(parEl, { label: "a", min: d.lo, max: d.hi, step, value: a, format: (v) => (v <= d.lo ? "−∞" : v.toFixed(2)), onInput: (v) => { a = v; draw(); } });
      P.slider(parEl, { label: "b", min: d.lo, max: d.hi, step, value: b, format: (v) => v.toFixed(2), onInput: (v) => { b = v; draw(); } });
      draw();
    }
    function draw() {
      const d = D[cur], lo = Math.min(a, b), hi = Math.max(a, b);
      const Fa = a <= d.lo ? 0 : d.cdf(lo), Fb = d.cdf(hi);
      const L = P.$("#cd-pdf"), Rr = P.$("#cd-cdf"); L.innerHTML = ""; Rr.innerHTML = "";
      let cl;
      if (d.discrete) {
        const ks = P.range(0, 6), ps = ks.map(d.pmf);
        cl = P.chart(L, { x: [d.lo, d.hi], y: [0, Math.max(...ps) * 1.25], width: 420, height: 260, xLabel: "x", yLabel: "PMF p(k)", xFormat: intTicks });
        cl.bars(ks.map((k, i) => ({ x: k, y: ps[i], color: (a <= d.lo || k > lo) && k <= hi ? "c2" : "c6" })), { w: 0.6 });
      } else {
        const xs = P.linspace(d.lo, d.hi, 400), ys = xs.map(d.pdf), ymax = Math.max(...ys) * 1.2;
        cl = P.chart(L, { x: [d.lo, d.hi], y: [0, ymax], width: 420, height: 260, xLabel: "x", yLabel: "PDF f(x)" });
        const inside = [lo, ...xs.filter((x) => x > lo && x < hi), hi].map((x) => [x, d.pdf(x)]);
        if (hi > lo) cl.area(inside, { color: "c2", opacity: 0.45 });
        cl.line(xs.map((x, i) => [x, ys[i]]), { color: "c1" });
      }
      if (a > d.lo) cl.vline(lo, { color: "c4", label: "a" });
      cl.vline(hi, { color: "c4", label: "b" });
      cl.text((d.lo + d.hi) / 2 + (d.hi - d.lo) * 0.3, cl.getDomain().y[1] * 0.85, `area = ${P.fmt(Fb - Fa, 3)}`, { color: "c2", weight: 700, size: 13 });

      const cr = P.chart(Rr, { x: [d.lo, d.hi], y: [0, 1.05], width: 420, height: 260, xLabel: "x", yLabel: "CDF F(x)", xFormat: d.discrete ? intTicks : undefined });
      if (d.discrete) {
        const ks = P.range(0, 6);
        cr.step([[d.lo, 0], ...ks.map((k) => [k, d.cdf(k)]), [d.hi, 1]], { color: "c1" });
        cr.dots(ks.map((k) => [k, d.cdf(k)]), { color: "c1" });
      } else {
        const xs = P.linspace(d.lo, d.hi, 400);
        cr.line(xs.map((x) => [x, d.cdf(x)]), { color: "c1" });
      }
      cr.hline(Fa, { color: "c6", x1: hi });
      cr.hline(Fb, { color: "c6", x1: hi });
      cr.line([[hi, Fa], [hi, Fb]], { color: "c2", width: 5, opacity: 0.85 });
      cr.dots([[hi, Fb]], { color: "c2", r: 4.5 });
      if (a > d.lo) cr.dots([[lo, Fa]], { color: "c4", r: 4.5 });
      cr.text(hi, (Fa + Fb) / 2, ` F(b) − F(a) = ${P.fmt(Fb - Fa, 3)}`, { color: "c2", anchor: hi > (d.lo + d.hi) / 2 ? "end" : "start", dx: hi > (d.lo + d.hi) / 2 ? -8 : 8, weight: 700 });
      const items = [
        { label: a <= d.lo ? "$F(a)=F(-\\infty)$ =" : "$F(a)$ =", value: P.fmt(Fa, 4), color: "c4" },
        { label: "$F(b)$ =", value: P.fmt(Fb, 4), color: "c2" },
        { label: d.discrete ? "$P(a<X\\le b)$ =" : "$P(a\\le X\\le b)$ =", value: P.fmt(Fb - Fa, 4), color: "c2" },
      ];
      if (a > b) items.push({ label: "(a > b, so they were swapped)", value: "" });
      P.readout("#cd-read", items);
    }
    build();
  })();

  /* ------------------------------------------------ Markov & Chebyshev */
  (function bounds() {
    const S2 = Math.sqrt(2 / Math.PI);
    const D = {
      exp: { label: "Exponential(1)", mu: 1, sd: 1,
        tail: (a) => Math.exp(-a),
        cheb: (k) => Math.exp(-(1 + k)) + (k < 1 ? 1 - Math.exp(-(1 - k)) : 0) },
      unif: { label: "Uniform(0, 2)", mu: 1, sd: 1 / Math.sqrt(3),
        tail: (a) => P.clamp(1 - a / 2, 0, 1),
        cheb: (k) => Math.max(0, 1 - k / Math.sqrt(3)) },
      half: { label: "|Z|, Z ~ N(0,1)", mu: S2, sd: Math.sqrt(1 - 2 / Math.PI),
        tail: (a) => 2 * (1 - m.normalCdf(a)),
        cheb: (k) => { const s = Math.sqrt(1 - 2 / Math.PI), u = S2 + k * s, l = S2 - k * s; return 2 * (1 - m.normalCdf(u)) + (l > 0 ? 2 * m.normalCdf(l) - 1 : 0); } },
      worst: { label: "Worst case (bound is tight)", mu: 1, sd: 1, worst: true },
    };
    let cur = "exp", A = 3, K = 2;
    P.select("#bd-ctl", { label: "Distribution", options: Object.entries(D).map(([k, d]) => ({ value: k, label: d.label })), value: cur, onChange: (v) => { cur = v; draw(); } });
    P.slider("#bd-ctl", { label: "Markov: a", min: 0.1, max: 6, step: 0.05, value: A, format: (v) => v.toFixed(2), onInput: (v) => { A = v; draw(); } });
    P.slider("#bd-ctl", { label: "Chebyshev: k", min: 0.2, max: 5, step: 0.05, value: K, format: (v) => v.toFixed(2), onInput: (v) => { K = v; draw(); } });
    function draw() {
      const d = D[cur];
      // worst case: X ∈ {0, a0} with P(X=a0)=1/a0 (mean 1); and X ∈ {μ±k0} w.p. 1/(2k0²) each, else μ (sd 1)
      const a0 = Math.max(A, 1), k0 = Math.max(K, 1);
      const tail = d.worst ? (a) => (a <= a0 ? 1 / a0 : 0) : d.tail;
      const cheb = d.worst ? (k) => (k <= k0 ? 1 / (k0 * k0) : 0) : d.cheb;
      // Markov
      const M = P.$("#bd-markov"); M.innerHTML = "";
      const c1 = P.chart(M, { x: [0, 6], y: [0, 1.05], width: 420, height: 270, xLabel: "a", yLabel: "P(X ≥ a)" });
      const as = P.linspace(0.01, 6, 600);
      c1.line(as.map((a) => [a, Math.min(1, d.mu / a)]), { color: "c4", dash: true });
      c1.line(as.map((a) => [a, tail(a)]), { color: "c1" });
      c1.vline(A, { color: "c6" });
      const mb = Math.min(1, d.mu / A), mt = tail(A);
      c1.dots([[A, mb]], { color: "c4", r: 5 }); c1.dots([[A, mt]], { color: "c1", r: 5 });
      c1.text(5.9, 0.97, "bound E[X]/a", { color: "c4", anchor: "end", weight: 600 });
      c1.text(5.9, 0.87, "true P(X ≥ a)", { color: "c1", anchor: "end", weight: 600 });
      // Chebyshev
      const C = P.$("#bd-cheb"); C.innerHTML = "";
      const c2 = P.chart(C, { x: [0, 5], y: [0, 1.05], width: 420, height: 270, xLabel: "k (in standard deviations)", yLabel: "P(|X−μ| ≥ kσ)" });
      const ks = P.linspace(0.01, 5, 600);
      c2.line(ks.map((k) => [k, Math.min(1, 1 / (k * k))]), { color: "c4", dash: true });
      c2.line(ks.map((k) => [k, cheb(k)]), { color: "c1" });
      c2.vline(K, { color: "c6" });
      const cb = Math.min(1, 1 / (K * K)), ct = cheb(K);
      c2.dots([[K, cb]], { color: "c4", r: 5 }); c2.dots([[K, ct]], { color: "c1", r: 5 });
      c2.text(4.9, 0.97, "bound 1/k²", { color: "c4", anchor: "end", weight: 600 });
      c2.text(4.9, 0.87, "true probability", { color: "c1", anchor: "end", weight: 600 });
      P.readout("#bd-read", [
        { label: `$\\mu$ = ${P.fmt(d.mu, 3)}, $\\sigma$ =`, value: P.fmt(d.sd, 3) },
        { label: "$P(X\\ge a)$:", value: P.fmt(mt, 4), color: "c1" },
        { label: "Markov ≤", value: P.fmt(mb, 4), color: "c4" },
        { label: "$P(|X-\\mu|\\ge k\\sigma)$:", value: P.fmt(ct, 4), color: "c1" },
        { label: "Chebyshev ≤", value: P.fmt(cb, 4), color: "c4" },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ Jensen */
  (function jensen() {
    const F = {
      sq: { label: "φ(x) = x²  (convex)", f: (x) => x * x },
      exp: { label: "φ(x) = eˣ  (convex)", f: (x) => Math.exp(x) },
      inv: { label: "φ(x) = 1/x  (convex)", f: (x) => 1 / x },
      sqrt: { label: "φ(x) = √x  (concave)", f: (x) => Math.sqrt(x) },
      log: { label: "φ(x) = log x  (concave)", f: (x) => Math.log(x) },
      lin: { label: "φ(x) = x/2 + 1  (linear)", f: (x) => x / 2 + 1 },
    };
    let cur = "sq", x1 = 0.6, x2 = 3.4, p = 0.5;
    const LO = 0.2, HI = 4;
    P.select("#jn-ctl", { label: "Function", options: Object.entries(F).map(([k, d]) => ({ value: k, label: d.label })), value: cur, onChange: (v) => { cur = v; draw(); } });
    P.slider("#jn-ctl", { label: "x₁", min: LO, max: HI, step: 0.05, value: x1, format: (v) => v.toFixed(2), onInput: (v) => { x1 = v; draw(); } });
    P.slider("#jn-ctl", { label: "x₂", min: LO, max: HI, step: 0.05, value: x2, format: (v) => v.toFixed(2), onInput: (v) => { x2 = v; draw(); } });
    P.slider("#jn-ctl", { label: "p = P(X = x₂)", min: 0, max: 1, step: 0.01, value: p, format: (v) => v.toFixed(2), onInput: (v) => { p = v; draw(); } });
    function draw() {
      const f = F[cur].f, xs = P.linspace(LO, HI, 300), ys = xs.map(f);
      let ylo = Math.min(...ys), yhi = Math.max(...ys); const pad = (yhi - ylo) * 0.08; ylo -= pad; yhi += pad;
      const el = P.$("#jn-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, HI + 0.2], y: [ylo, yhi], height: 280, xLabel: "x", yLabel: "φ(x)" });
      c.line(xs.map((x, i) => [x, ys[i]]), { color: "c1" });
      const f1 = f(x1), f2 = f(x2), ex = (1 - p) * x1 + p * x2, ef = (1 - p) * f1 + p * f2, fe = f(ex);
      c.line([[x1, f1], [x2, f2]], { color: "c2", width: 2 });
      c.vline(ex, { color: "c6", label: "E[X]" });
      c.line([[ex, fe], [ex, ef]], { color: "c4", width: 5, opacity: 0.8 });
      c.dots([[x1, f1], [x2, f2]], { color: "c6", r: 5 });
      c.text(x1, f1, `1−p = ${(1 - p).toFixed(2)}`, { color: "c6", dy: 18, size: 11 });
      c.text(x2, f2, `p = ${p.toFixed(2)}`, { color: "c6", dy: 18, size: 11 });
      c.dots([[ex, ef]], { color: "c2", r: 6 });
      c.dots([[ex, fe]], { color: "c1", r: 6 });
      const right = ex < HI * 0.6;
      c.text(ex, ef, "E[φ(X)]", { color: "c2", weight: 700, anchor: right ? "start" : "end", dx: right ? 10 : -10, dy: ef >= fe ? -6 : 14 });
      c.text(ex, fe, "φ(E[X])", { color: "c1", weight: 700, anchor: right ? "start" : "end", dx: right ? 10 : -10, dy: ef >= fe ? 14 : -6 });
      const gap = ef - fe;
      P.readout("#jn-read", [
        { label: "$\\E[X]$ =", value: P.fmt(ex, 3) },
        { label: "$\\varphi(\\E[X])$ =", value: P.fmt(fe, 4), color: "c1" },
        { label: "$\\E[\\varphi(X)]$ =", value: P.fmt(ef, 4), color: "c2" },
        { label: "gap $\\E[\\varphi(X)]-\\varphi(\\E[X])$ =", value: (Math.abs(gap) < 5e-10 ? "0" : P.fmt(gap, 4)), color: "c4" },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ Bayes grid */
  (function bayes() {
    let prev = 1, sens = 90, spec = 91;
    const COLS = 50, ROWS = 20, NN = COLS * ROWS, gap = 12.4, W = 640, H = ROWS * gap + 10;
    const el = P.$("#bayes-grid");
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": "1000 people grid" }, el);
    const x0 = (W - (COLS - 1) * gap) / 2, y0 = 5 + gap / 2 - 1;
    const dots = [];
    for (let i = 0; i < NN; i++) {
      const col = Math.floor(i / ROWS), row = i % ROWS;
      dots.push(svgEl("circle", { cx: x0 + col * gap, cy: y0 + row * gap, r: 4.6 }, svg));
    }
    P.slider("#by-ctl", { label: "prevalence", min: 0.1, max: 30, step: 0.1, value: prev, format: (v) => v.toFixed(1) + "%", onInput: (v) => { prev = v; draw(); } });
    P.slider("#by-ctl", { label: "sensitivity P(+|sick)", min: 50, max: 100, step: 1, value: sens, format: (v) => v + "%", onInput: (v) => { sens = v; draw(); } });
    P.slider("#by-ctl", { label: "specificity P(−|healthy)", min: 50, max: 100, step: 0.5, value: spec, format: (v) => v + "%", onInput: (v) => { spec = v; draw(); } });
    P.legend("#by-legend", [
      { label: "sick, test + (true positive)", color: "c4" },
      { label: "sick, test − (false negative)", color: "c4", dash: true },
      { label: "healthy, test + (false positive)", color: "c2" },
      { label: "healthy, test − (true negative)", color: "c6", dash: true },
    ]);
    const STY = {
      tp: "fill:var(--c4);stroke:none",
      fn: "fill:none;stroke:var(--c4);stroke-width:1.6",
      fp: "fill:var(--c2);stroke:none",
      tn: "fill:none;stroke:var(--c6);stroke-width:1;opacity:.45",
    };
    function draw() {
      const pr = prev / 100, se = sens / 100, sp = spec / 100;
      const sick = Math.round(NN * pr), tp = Math.round(sick * se), fn = sick - tp;
      const healthy = NN - sick, fp = Math.round(healthy * (1 - sp));
      dots.forEach((d, i) => {
        const k = i < tp ? "tp" : i < sick ? "fn" : i < sick + fp ? "fp" : "tn";
        d.setAttribute("style", STY[k]);
      });
      const exact = (se * pr) / (se * pr + (1 - sp) * (1 - pr));
      P.readout("#by-read", [
        { label: "sick:", value: `${sick}`, color: "c4" },
        { label: "positives:", value: `${tp} true + ${fp} false = ${tp + fp}` },
        { label: "$P(\\text{sick}\\mid +)\\approx$", value: tp + fp ? `${tp}/${tp + fp} = ${P.pct(tp / (tp + fp))}` : "—", color: "c4" },
        { label: "exact Bayes:", value: P.pct(exact, 2), color: "c4" },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ tree: total expectation */
  (function tree() {
    let p = 0.5, die = "fair", sim = null;
    const dies = { fair: [1, 1, 1, 1, 1, 1].map((x) => x / 6), loaded: [0.1, 0.1, 0.1, 0.1, 0.1, 0.5] };
    const el = P.$("#tree-svg");
    const W = 640, H = 360;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" }, el);
    P.select("#tr-ctl", { label: "Die", options: [{ value: "fair", label: "fair" }, { value: "loaded", label: "loaded (6 w.p. ½)" }], value: die, onChange: (v) => { die = v; sim = null; draw(); } });
    P.slider("#tr-ctl", { label: "coin p", min: 0, max: 1, step: 0.05, value: p, format: (v) => v.toFixed(2), onInput: (v) => { p = v; sim = null; draw(); } });
    P.button("#tr-ctl", "Simulate 20,000", () => {
      const w = dies[die]; let s = 0; const N = 20000;
      for (let i = 0; i < N; i++) { let u = Math.random(), y = 1; while (y < 6 && u > w[y - 1]) { u -= w[y - 1]; y++; } s += R.binomial(y, p); }
      sim = s / N; draw();
    });
    const T = (x, y, s, o = {}) => { const t = svgEl("text", { x, y, "text-anchor": o.anchor || "start", style: `fill:${P.color(o.color || "var(--ink)")};font-size:${o.size || 13}px;font-weight:${o.weight || 500}` }, svg); t.textContent = s; return t; };
    function draw() {
      svg.innerHTML = "";
      const w = dies[die], rx = 46, ry = 160, cx = 205;
      const ys = P.range(0, 5).map((i) => 22 + i * 46);
      T(cx + 70, 12, "E[X | Y=y]", { color: "c6", size: 11, weight: 700 });
      T(cx + 230, 12, "× P(Y=y)  =  contribution", { color: "c6", size: 11, weight: 700 });
      let total = 0;
      ys.forEach((y, i) => {
        const yy = i + 1, cond = yy * p, contrib = w[i] * cond; total += contrib;
        svgEl("path", { d: `M${rx + 18},${ry} C${(rx + cx) / 2 - 20},${ry} ${(rx + cx) / 2 - 20},${y} ${cx - 24},${y}`, class: "tree-edge", style: `stroke-width:${1 + 14 * w[i]};stroke:var(--c1);opacity:.55` }, svg);
        T(cx - 30, y - 5, P.fmt(w[i], 3), { color: "c1", size: 11, weight: 700, anchor: "end" });
        svgEl("rect", { x: cx - 24, y: y - 13, width: 62, height: 26, rx: 6, class: "tree-node" }, svg);
        T(cx + 7, y + 5, `Y = ${yy}`, { anchor: "middle", weight: 700 });
        T(cx + 70, y + 5, `${yy}·p = ${P.fmt(cond, 3)}`, { color: "c3" });
        T(cx + 230, y + 5, `× ${P.fmt(w[i], 3)}  =  ${P.fmt(contrib, 4)}`, { color: "c2" });
      });
      svgEl("circle", { cx: rx, cy: ry, r: 20, class: "tree-node" }, svg);
      T(rx, ry + 5, "Y", { anchor: "middle", weight: 700, size: 15 });
      svgEl("line", { x1: cx + 225, x2: W - 10, y1: 300, y2: 300, style: "stroke:var(--line);stroke-width:1.5" }, svg);
      T(cx + 230, 322, `E[X] = Σ = ${P.fmt(total, 4)}`, { color: "c4", weight: 700, size: 15 });
      const ey = P.sum(w.map((q, i) => q * (i + 1)));
      T(cx + 230, 346, `check: E[Y]·p = ${P.fmt(ey, 3)} × ${P.fmt(p, 2)} = ${P.fmt(ey * p, 4)}`, { color: "c6", size: 12 });
      P.readout("#tr-read", [
        { label: "tower property $\\E[\\E[X\\mid Y]]$ =", value: P.fmt(total, 4), color: "c4" },
        { label: "simulated mean of $X$:", value: sim === null ? "click Simulate" : P.fmt(sim, 4), color: "c2" },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ LLN running averages */
  (function lln() {
    const SRC = {
      die: { label: "fair die", mu: 3.5, sd: Math.sqrt(35 / 12), draw: () => R.int(1, 6), y: [1, 6] },
      coin: { label: "fair coin (0/1)", mu: 0.5, sd: 0.5, draw: () => R.bernoulli(0.5), y: [0, 1] },
      exp: { label: "Exponential(1)", mu: 1, sd: 1, draw: () => R.exp(1), y: [0, 3] },
    };
    const NP = 12, NMAX = 5000, LMAX = Math.log10(NMAX);
    let cur = "die", eps = 0.15, paths, sums, n, c;
    const loop = P.loop(() => { step(Math.max(1, Math.floor(n * 0.03))); render(); if (n >= NMAX) return false; });
    P.select("#ln-ctl", { label: "Source", options: Object.entries(SRC).map(([k, s]) => ({ value: k, label: s.label })), value: cur, onChange: (v) => { cur = v; loop.stop(); setup(true); } });
    P.slider("#ln-ctl", { label: "ε", min: 0.05, max: 1, step: 0.05, value: eps, format: (v) => v.toFixed(2), onInput: (v) => { eps = v; render(); } });
    const btn = P.button("#ln-ctl", "▶ Animate", () => {
      if (loop.running) { loop.stop(); btn.textContent = "▶ Resume"; return; }
      if (n >= NMAX) setup(false);
      btn.textContent = "⏸ Pause"; loop.start();
    });
    loop.onstop = () => (btn.textContent = "▶ Animate");
    P.button("#ln-ctl", "New paths", () => { loop.stop(); btn.textContent = "▶ Animate"; setup(true); }, "ghost");

    function setup(full) {
      const s = SRC[cur];
      paths = Array.from({ length: NP }, () => []); sums = new Array(NP).fill(0); n = 0;
      const el = P.$("#ln-chart"); el.innerHTML = "";
      c = P.chart(el, { x: [0, LMAX], y: s.y, height: 280, xLabel: "number of draws n (log scale)", yLabel: "running average", xTicks: [0, 1, 2, 3], xFormat: (v) => String(Math.round(10 ** v)) });
      if (full) step(NMAX);
      render();
    }
    function step(k) {
      const s = SRC[cur], target = Math.min(NMAX, n + k);
      while (n < target) {
        n++;
        const lg = Math.log10(n);
        for (let j = 0; j < NP; j++) {
          sums[j] += s.draw();
          const pj = paths[j];
          if (!pj.length || lg - pj[pj.length - 1][0] >= 0.004) pj.push([lg, sums[j] / n]);
        }
      }
    }
    function render() {
      const s = SRC[cur]; c.clear();
      c.rect(0, s.mu - eps, LMAX, s.mu + eps, { color: "c3", opacity: 0.15 });
      const xs = P.linspace(0, LMAX, 200);
      const cy = ([x, y]) => [x, P.clamp(y, s.y[0], s.y[1])];
      for (const sg of [1, -1]) c.line(xs.map((x) => [x, s.mu + sg * 2 * s.sd / Math.sqrt(10 ** x)]).filter(([, y]) => y >= s.y[0] && y <= s.y[1]), { color: "c2", dash: true, width: 1.8 });
      paths.forEach((pj, j) => c.line((n ? pj.concat([[Math.log10(n), sums[j] / n]]) : pj).map(cy), { color: j % 2 ? "c1" : "c5", width: 1.4, opacity: 0.6 }));
      c.hline(s.mu, { color: "c4", label: "μ" });
      if (n) c.vline(Math.log10(n), { color: "c6" });
      const out = sums.filter((v) => Math.abs(v / n - s.mu) > eps).length;
      P.readout("#ln-read", [
        { label: "$n$ =", value: n },
        { label: "paths outside $\\mu\\pm\\epsilon$:", value: n ? `${out}/${NP}` : "—", color: "c1" },
        { label: "Chebyshev bound $\\frac{\\sigma^2}{n\\epsilon^2}$ =", value: n ? P.fmt(Math.min(1, s.sd ** 2 / (n * eps * eps)), 3) : "—" },
        { label: "CLT estimate =", value: n ? P.fmt(2 * (1 - m.normalCdf(eps * Math.sqrt(n) / s.sd)), 3) : "—" },
        { label: "SE $\\sigma/\\sqrt n$ =", value: n ? P.fmt(s.sd / Math.sqrt(n), 4) : "—", color: "c2" },
      ]);
    }
    setup(true);
  })();

  /* ------------------------------------------------ CLT */
  (function clt() {
    const SRC = {
      unif: { label: "Uniform(0,1)", mu: 0.5, v: 1 / 12, draw: Math.random, range: [0, 1] },
      exp: { label: "Exponential(1) (skewed)", mu: 1, v: 1, draw: () => R.exp(1), range: [0, 5] },
      bimodal: { label: "Bimodal (±2 + noise)", mu: 0, v: 4.25, draw: () => (Math.random() < 0.5 ? -2 : 2) + R.normal(0, 0.5), range: [-3.5, 3.5] },
      die: { label: "Fair die (discrete)", mu: 3.5, v: 35 / 12, draw: () => R.int(1, 6), range: [0.5, 6.5], lattice: 1 },
      bern: { label: "Bernoulli(0.05) (very skewed)", mu: 0.05, v: 0.05 * 0.95, draw: () => (Math.random() < 0.05 ? 1 : 0), range: [-0.5, 1.5], lattice: 1 },
    };
    const NS = [1, 2, 3, 4, 5, 8, 10, 15, 20, 30, 50, 100];
    let cur = "exp", ni = 0, view = "raw", means = [];
    const NSAMP = 4000;
    P.select("#cl-ctl", { label: "Source", options: Object.entries(SRC).map(([k, s]) => ({ value: k, label: s.label })), value: cur, onChange: (v) => { cur = v; sample(); } });
    P.slider("#cl-ctl", { label: "n (draws averaged)", min: 0, max: NS.length - 1, value: ni, format: (i) => NS[i], onInput: (i) => { ni = i; sample(); } });
    P.select("#cl-ctl2", { label: "View", options: [{ value: "raw", label: "raw sample means" }, { value: "z", label: "standardized (x̄ − μ)/(σ/√n)" }], value: view, onChange: (v) => { view = v; draw(); } });
    P.button("#cl-ctl2", "Resample", () => sample(), "ghost");
    let animIdx = null;
    const loop = P.loop((dt) => { animIdx += dt / 600; const i = Math.min(NS.length - 1, Math.floor(animIdx)); if (i !== ni) { ni = i; slN(i); sample(); } if (i >= NS.length - 1) return false; });
    P.button("#cl-ctl2", "▶ Sweep n", () => { animIdx = 0; ni = 0; slN(0); sample(); loop.start(); });
    const slN = (i) => { const inp = P.$("#cl-ctl input[type=range]"); inp.value = i; inp.nextElementSibling.textContent = NS[i]; };

    function sample() {
      const s = SRC[cur], n = NS[ni];
      means = new Float64Array(NSAMP);
      for (let k = 0; k < NSAMP; k++) { let t = 0; for (let j = 0; j < n; j++) t += s.draw(); means[k] = t / n; }
      draw();
    }
    function draw() {
      const s = SRC[cur], n = NS[ni], se = Math.sqrt(s.v / n), z = view === "z";
      const [rlo, rhi] = z ? [s.mu - 4 * se, s.mu + 4 * se] : s.range;
      let w, start;
      if (s.lattice) {
        const h = s.lattice / n; w = h * Math.max(1, Math.ceil((rhi - rlo) / 60 / h));
        start = -h / 2 + Math.floor((rlo + h / 2) / w) * w;
      } else { w = (rhi - rlo) / 60; start = rlo; }
      const nb = Math.ceil((rhi - start) / w) + 1, counts = new Array(nb).fill(0);
      for (const x of means) { const i = Math.floor((x - start) / w); if (i >= 0 && i < nb) counts[i]++; }
      const tx = (x) => (z ? (x - s.mu) / se : x), sc = z ? se : 1; // density scale
      const bins = counts.map((cnt, i) => ({ x0: tx(start + i * w), x1: tx(start + (i + 1) * w), d: (cnt / (NSAMP * w)) * sc }));
      const [dlo, dhi] = z ? [-4, 4] : [rlo, rhi];
      const npdf = (x) => (z ? m.normalPdf(x) : m.normalPdf(x, s.mu, se));
      const vis = bins.filter((b) => b.x1 > dlo && b.x0 < dhi);
      const ymax = Math.max(npdf(z ? 0 : s.mu), ...vis.map((b) => b.d)) * 1.15;
      const el = P.$("#cl-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [dlo, dhi], y: [0, ymax], height: 270, xLabel: z ? "standardized mean z" : "sample mean x̄", yLabel: "density" });
      for (const b of vis) if (b.d > 0) c.rect(Math.max(dlo, b.x0), 0, Math.min(dhi, b.x1), Math.min(b.d, ymax), { color: "c5", opacity: 0.55 });
      c.line(P.linspace(dlo, dhi, 300).map((x) => [x, npdf(x)]), { color: "c2", width: 2.5 });
      c.vline(z ? 0 : s.mu, { color: "c4", label: "μ" });
      const mm = P.mean(Array.from(means)), sdm = Math.sqrt(P.variance(Array.from(means)));
      P.readout("#cl-read", [
        { label: "$n$ =", value: n },
        { label: "mean of $\\bar X$:", value: P.fmt(mm, 4), color: "c5" },
        { label: "$\\mu$ =", value: P.fmt(s.mu, 4), color: "c4" },
        { label: "sd of $\\bar X$:", value: P.fmt(sdm, 4), color: "c5" },
        { label: "$\\sigma/\\sqrt n$ =", value: P.fmt(se, 4), color: "c2" },
      ]);
    }
    sample();
  })();
})();

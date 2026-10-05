/* Widgets for statistics.html */
(function () {
  const { m, rand: R, svgEl } = P;
  let clipId = 0;
  // Clip drawings to the plot area (lib charts let out-of-range lines overflow the axes).
  function clip(c) {
    const id = "stat-clip-" + clipId++;
    const cp = svgEl("clipPath", { id }, c.svg);
    svgEl("rect", { x: c.mg.l, y: c.mg.t - 20, width: c.W - c.mg.l - c.mg.r, height: c.H - c.mg.t - c.mg.b + 20 }, cp);
    c.g.setAttribute("clip-path", `url(#${id})`);
  }

  /* ------------------------------------------------ Bernoulli MLE */
  (function bern() {
    let flips = [], pTrue = 0.6, a = 1;
    const add = (arr) => { flips.push(...arr); draw(); };
    P.button("#bm-ctl", "+ H", () => add([1]));
    P.button("#bm-ctl", "+ T", () => add([0]));
    P.button("#bm-ctl", "+10 random", () => add(Array.from({ length: 10 }, () => R.bernoulli(pTrue))), "ghost");
    P.button("#bm-ctl", "+100 random", () => add(Array.from({ length: 100 }, () => R.bernoulli(pTrue))), "ghost");
    P.button("#bm-ctl", "Reset", () => { flips = []; draw(); }, "ghost");
    P.slider("#bm-ctl2", { label: "p_true (for random flips)", min: 0.05, max: 0.95, step: 0.05, value: pTrue, onInput: (v) => { pTrue = v; draw(); } });
    P.slider("#bm-ctl2", { label: "prior Beta(a, a), a =", min: 1, max: 20, step: 1, value: a, format: (v) => (v === 1 ? "1 (flat = MLE)" : v), onInput: (v) => { a = v; draw(); } });

    function draw() {
      const n = flips.length, k = P.sum(flips);
      const shown = flips.slice(-80);
      P.$("#bm-coins").innerHTML = n
        ? (n > 80 ? '<span style="background:none;color:var(--muted);width:auto">…</span>' : "") + shown.map((f) => `<span style="background:var(${f ? "--c1" : "--c6"})">${f ? "H" : "T"}</span>`).join("")
        : '<span style="background:none;color:var(--muted);width:auto;font-size:13px;line-height:20px">No data yet: add some flips.</span>';
      const ll = (p, kk = k, nn = n) => (kk ? kk * Math.log(p) : 0) + (nn - kk ? (nn - kk) * Math.log(1 - p) : 0);
      const lp = (p) => ll(p) + (a - 1) * (Math.log(p) + Math.log(1 - p));
      const xs = P.linspace(0.001, 0.999, 400);
      const phat = n ? k / n : NaN, pmap = (k + a - 1) / (n + 2 * a - 2);
      const lmax = n ? ll(phat) : 0;
      const lpmax = a > 1 || n ? Math.max(...xs.map(lp)) : 0;
      // likelihood
      const A = P.$("#bm-L"); A.innerHTML = "";
      const c = P.chart(A, { x: [0, 1], y: [0, 1.12], width: 360, height: 250, xLabel: "p", yLabel: "L(p) / max L" });
      const Ly = xs.map((p) => [p, n ? Math.exp(ll(p) - lmax) : 1]);
      c.area(Ly, { color: "c1", opacity: 0.15 }); c.line(Ly, { color: "c1" });
      if (a > 1) c.line(xs.map((p) => [p, Math.exp(lp(p) - lpmax)]), { color: "c5", dash: true });
      c.vline(pTrue, { color: "c6", y1: 1.12 });
      if (n) c.vline(phat, { color: "c2", label: "p̂ = k/n", dash: false });
      // log-likelihood
      const B = P.$("#bm-l"); B.innerHTML = "";
      const ys = xs.map((p) => ll(p));
      const lo = n ? Math.max(Math.min(...ys.filter(isFinite)), lmax - Math.max(8, 2 * n)) : -1, hi = n ? lmax + 0.12 * (lmax - lo) + 0.2 : 1;
      const cl = P.chart(B, { x: [0, 1], y: [lo, hi], width: 360, height: 250, xLabel: "p", yLabel: "ℓ(p) = log L(p)" });
      clip(cl);
      cl.line(xs.map((p, i) => [p, ys[i]]), { color: "c1" });
      if (n) { cl.vline(phat, { color: "c2", dash: false }); cl.dots([[phat, lmax]], { color: "c2", r: 5 }); }
      const items = [{ label: "n =", value: n }, { label: "heads k =", value: k }, { label: "$\\hat p=k/n$ =", value: n ? P.fmt(phat, 3) : "—", color: "c2" }];
      if (n) items.push({ label: "$\\ell(\\hat p)$ =", value: P.fmt(lmax, 3) }, { label: "std. error $\\sqrt{\\hat p(1-\\hat p)/n}$ ≈", value: P.fmt(Math.sqrt(phat * (1 - phat) / n), 3) });
      if (a > 1) items.push({ label: `MAP $\\frac{k+${a - 1}}{n+${2 * a - 2}}$ =`, value: P.fmt(pmap, 3), color: "c5" });
      P.readout("#bm-read", items);
    }
    flips = Array.from({ length: 10 }, () => R.bernoulli(pTrue));
    draw();
  })();

  /* ------------------------------------------------ Exponential MLE */
  (function expo() {
    let lam = 1, n = 20, xs = [];
    P.slider("#ex-ctl", { label: "true λ", min: 0.2, max: 3, step: 0.1, value: lam, onInput: (v) => { lam = v; sample(); } });
    P.slider("#ex-ctl", { label: "n", min: 1, max: 200, value: n, onInput: (v) => { n = v; sample(); } });
    P.button("#ex-ctl", "New sample", () => sample());
    function sample() { xs = Array.from({ length: n }, () => R.exp(lam)); draw(); }
    function draw() {
      const S = P.sum(xs), xbar = S / n, lh = 1 / xbar;
      const xmax = Math.max(4.6 / lam, ...xs) * 1.05;
      const ymax = Math.max(lam, lh) * 1.15;
      const A = P.$("#ex-rug"); A.innerHTML = "";
      const c = P.chart(A, { x: [0, xmax], y: [0, ymax], width: 360, height: 250, xLabel: "x", yLabel: "density" });
      const grid = P.linspace(0, xmax, 200);
      c.line(grid.map((x) => [x, m.expPdf(x, lam)]), { color: "c6", dash: true });
      c.area(grid.map((x) => [x, m.expPdf(x, lh)]), { color: "c2", opacity: 0.12 });
      c.line(grid.map((x) => [x, m.expPdf(x, lh)]), { color: "c2" });
      for (const x of xs) c.line([[x, 0], [x, ymax * 0.07]], { color: "c1", width: 1.4, opacity: 0.7 });
      c.vline(xbar, { color: "c1", label: "x̄" });
      const B = P.$("#ex-ll"); B.innerHTML = "";
      const L = P.linspace(0.02, 3 * Math.max(lam, lh), 300), ll = (l) => n * Math.log(l) - l * S;
      const lmax = ll(lh), ys = L.map(ll);
      const lo = Math.max(Math.min(...ys.filter((_, i) => L[i] >= lh / 4)), lmax - Math.max(8, 3 * n)), hi = lmax + 0.12 * (lmax - lo) + 0.2;
      const cl = P.chart(B, { x: [0, L[L.length - 1]], y: [lo, hi], width: 360, height: 250, xLabel: "λ", yLabel: "ℓ(λ)" });
      clip(cl);
      cl.line(L.map((l, i) => [l, ys[i]]), { color: "c1" });
      cl.vline(lam, { color: "c6", label: "true" });
      cl.vline(lh, { color: "c2", label: "λ̂", dash: false });
      cl.dots([[lh, lmax]], { color: "c2", r: 5 });
      P.readout("#ex-read", [
        { label: "$\\bar x$ =", value: P.fmt(xbar, 3), color: "c1" },
        { label: "$\\hat\\lambda=1/\\bar x$ =", value: P.fmt(lh, 3), color: "c2" },
        { label: "true $\\lambda$ =", value: P.fmt(lam, 2) },
        { label: "fitted mean $1/\\hat\\lambda$ =", value: P.fmt(xbar, 3) },
      ]);
    }
    sample();
  })();

  /* ------------------------------------------------ Uniform MLE */
  (function unif() {
    let th = 2, n = 8, xs = [], rep = null;
    const XM = 3.4;
    P.slider("#un-ctl", { label: "true θ", min: 0.5, max: 3, step: 0.1, value: th, onInput: (v) => { th = v; rep = null; sample(); } });
    P.slider("#un-ctl", { label: "n", min: 1, max: 50, value: n, onInput: (v) => { n = v; rep = null; sample(); } });
    P.button("#un-ctl", "New sample", () => sample());
    P.button("#un-ctl", "Repeat 5,000×", () => {
      const N = 5000; let s = 0;
      for (let r = 0; r < N; r++) { let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, Math.random() * th); s += mx; }
      rep = s / N; draw();
    }, "ghost");
    function sample() { xs = Array.from({ length: n }, () => R.uniform(0, th)); draw(); }
    function draw() {
      const mx = Math.max(...xs);
      const A = P.$("#un-data"); A.innerHTML = "";
      const c = P.chart(A, { x: [0, XM], y: [0, 1], width: 360, height: 250, xLabel: "x", yAxis: false, grid: false });
      c.rect(0, 0.2, th, 0.8, { color: "c1", opacity: 0.08 });
      xs.forEach((x, i) => c.dots([[x, 0.3 + 0.4 * ((i * 0.618) % 1)]], { color: x === mx ? "c2" : "c1", r: x === mx ? 6 : 4 }));
      c.vline(th, { color: "c6", label: "θ (true)" });
      c.vline(mx, { color: "c2", label: "max", dash: false, y1: 0.9 });
      const B = P.$("#un-L"); B.innerHTML = "";
      const cl = P.chart(B, { x: [0, XM], y: [0, 1.12], width: 360, height: 250, xLabel: "θ", yLabel: "L(θ) / max L" });
      const pts = [[0, 0], [mx, 0], [mx, 1], ...P.linspace(mx, XM, 200).map((t) => [t, Math.pow(mx / t, n)])];
      cl.area(pts, { color: "c1", opacity: 0.15 }); cl.line(pts, { color: "c1" });
      cl.text(mx / 2, 0.08, "L = 0 (impossible)", { size: 11, color: "c6" });
      cl.vline(mx, { color: "c2", label: "θ̂ = max", dash: false });
      cl.vline(th, { color: "c6" });
      const items = [{ label: "$\\hat\\theta=\\max x_i$ =", value: P.fmt(mx, 3), color: "c2" }, { label: "true $\\theta$ =", value: P.fmt(th, 2) }, { label: "unbiased $\\frac{n+1}{n}\\max$ =", value: P.fmt(((n + 1) / n) * mx, 3) }];
      if (rep !== null) items.push({ label: "average max over 5,000 runs =", value: P.fmt(rep, 4), color: "c4" }, { label: "$\\frac{n}{n+1}\\theta$ =", value: P.fmt((n / (n + 1)) * th, 4), color: "c4" });
      P.readout("#un-read", items);
    }
    sample();
  })();

  /* ------------------------------------------------ dartboard */
  (function dart() {
    let k = 25;
    const cells = [
      { t: "Low bias, low variance", b: [0, 0], s: 0.12 },
      { t: "Low bias, high variance", b: [0, 0], s: 0.42 },
      { t: "High bias, low variance", b: [0.45, 0.3], s: 0.12 },
      { t: "High bias, high variance", b: [0.45, 0.3], s: 0.42 },
    ];
    P.slider("#dt-ctl", { label: "darts", min: 5, max: 80, value: k, onInput: (v) => { k = v; draw(); } });
    P.button("#dt-ctl", "Throw again", () => draw());
    function draw() {
      const grid = P.$("#dt-grid"); grid.innerHTML = "";
      for (const cell of cells) {
        const box = P.el("div", { class: "cell chart" }, grid);
        const S = 200, C = S / 2, sc = 80; // 1 unit = 80px
        const svg = svgEl("svg", { viewBox: `0 0 ${S} ${S}` }, box);
        [1, 0.75, 0.5, 0.25].forEach((rr, i) => svgEl("circle", { cx: C, cy: C, r: rr * sc, style: `fill:${i % 2 ? "var(--panel)" : "var(--accent-soft)"};stroke:var(--line);stroke-width:1` }, svg));
        svgEl("circle", { cx: C, cy: C, r: 5, style: "fill:var(--c4)" }, svg);
        const pts = Array.from({ length: k }, () => [cell.b[0] + R.normal(0, cell.s), cell.b[1] + R.normal(0, cell.s)]);
        for (const [x, y] of pts) svgEl("circle", { cx: C + x * sc, cy: C - y * sc, r: 3.2, style: "fill:var(--c1);opacity:.8" }, svg);
        const mx = P.mean(pts.map((p) => p[0])), my = P.mean(pts.map((p) => p[1]));
        const X = C + mx * sc, Y = C - my * sc;
        svgEl("path", { d: `M${X - 7},${Y}H${X + 7}M${X},${Y - 7}V${Y + 7}`, style: "stroke:var(--c2);stroke-width:3" }, svg);
        const b2 = mx * mx + my * my, v = P.mean(pts.map(([x, y]) => (x - mx) ** 2 + (y - my) ** 2));
        P.el("div", { html: `<b>${cell.t}</b><br><span class="cap">bias² ${P.fmt(b2, 3)} + var ${P.fmt(v, 3)} = MSE ${P.fmt(b2 + v, 3)}</span>` }, box);
      }
    }
    draw();
  })();

  /* ------------------------------------------------ estimator shoot-out */
  (function shootout() {
    let n = 5;
    const REPS = 4000, BINS = 60, LO = 0, HI = 2.05;
    const EST = [
      { name: "$\\max_i x_i$ (MLE)", plain: "max xᵢ  (MLE, biased)", color: "c2", f: (x, mx, mean) => mx, mse: (n) => 2 / ((n + 1) * (n + 2)) },
      { name: "$\\frac{n+1}{n}\\max_i x_i$", plain: "(n+1)/n · max xᵢ  (unbiased)", color: "c3", f: (x, mx, mean) => ((x.length + 1) / x.length) * mx, mse: (n) => 1 / (n * (n + 2)) },
      { name: "$2\\bar x$", plain: "2 · x̄  (unbiased)", color: "c5", f: (x, mx, mean) => 2 * mean, mse: (n) => 1 / (3 * n) },
    ];
    P.slider("#es-ctl", { label: "sample size n", min: 1, max: 50, value: n, onInput: (v) => { n = v; run(); } });
    P.button("#es-ctl", "Resample", () => run(), "ghost");
    function run() {
      const vals = EST.map(() => new Float64Array(REPS));
      const x = new Array(n);
      for (let r = 0; r < REPS; r++) {
        let mx = 0, s = 0;
        for (let i = 0; i < n; i++) { x[i] = Math.random(); if (x[i] > mx) mx = x[i]; s += x[i]; }
        EST.forEach((e, j) => (vals[j][r] = e.f(x, mx, s / n)));
      }
      const hs = vals.map((v) => P.histogram(v, BINS, LO, HI));
      const ymax = Math.max(...hs.flat().map((b) => b.density)) * 1.1;
      const rows = [];
      EST.forEach((e, j) => {
        const v = Array.from(vals[j]), mean = P.mean(v), vr = P.variance(v), mse = P.mean(v.map((t) => (t - 1) ** 2));
        rows.push({ e, bias: mean - 1, vr, mse });
        const el = P.$("#es-h" + j); el.innerHTML = "";
        const c = P.chart(el, { x: [LO, HI], y: [0, ymax], height: j === 2 ? 140 : 120, yAxis: false, grid: false, margin: { t: 6, b: j === 2 ? 40 : 18, l: 14, r: 14 }, xLabel: j === 2 ? "estimate of θ (truth = 1)" : undefined, xAxis: true });
        c.bars(hs[j].map((b) => ({ x: b.x, y: b.density })), { color: e.color, w: ((HI - LO) / BINS) * 0.92, opacity: 0.7 });
        c.vline(1, { color: "c6" });
        c.vline(mean, { color: e.color, dash: false, width: 2.5 });
        c.text(LO + 0.04, ymax * 0.82, e.plain, { anchor: "start", color: e.color, size: 13, weight: 700 });
      });
      const f = (x) => P.fmt(x, 5);
      let html = '<table class="est-table"><tr><th>estimator</th><th>bias</th><th>variance</th><th>bias² + var</th><th>simulated MSE</th><th>theory MSE</th></tr>';
      for (const r of rows) html += `<tr><td style="color:${P.color(r.e.color)}">${r.e.name}</td><td>${f(r.bias)}</td><td>${f(r.vr)}</td><td>${f(r.bias ** 2 + r.vr)}</td><td><b>${f(r.mse)}</b></td><td>${f(r.e.mse(n))}</td></tr>`;
      html += "</table>";
      const T = P.$("#es-table"); T.innerHTML = html; P.renderMath(T);
    }
    run();
  })();
})();

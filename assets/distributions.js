/* Widgets for distributions.html */
(function () {
  const { m, rand: R } = P;

  /* ------------------------------------------------ explorer */
  (function explorer() {
    const D = {
      bernoulli: { label: "Bernoulli(p)", discrete: true, params: [{ k: "p", min: 0.01, max: 0.99, step: 0.01, v: 0.3 }],
        range: () => [0, 1], pmf: (x, q) => m.bernoulliPmf(x, q.p), mean: (q) => q.p, var: (q) => q.p * (1 - q.p), sample: (q) => R.bernoulli(q.p) },
      binomial: { label: "Binomial(n, p)", discrete: true, params: [{ k: "n", min: 1, max: 60, step: 1, v: 20 }, { k: "p", min: 0.01, max: 0.99, step: 0.01, v: 0.3 }],
        range: (q) => [0, q.n], pmf: (x, q) => m.binomPmf(x, q.n, q.p), mean: (q) => q.n * q.p, var: (q) => q.n * q.p * (1 - q.p), sample: (q) => R.binomial(q.n, q.p) },
      poisson: { label: "Poisson(λ)", discrete: true, params: [{ k: "λ", min: 0.2, max: 25, step: 0.1, v: 4 }],
        range: (q) => [0, Math.ceil(q["λ"] + 5 * Math.sqrt(q["λ"]) + 3)], pmf: (x, q) => m.poissonPmf(x, q["λ"]), mean: (q) => q["λ"], var: (q) => q["λ"], sample: (q) => R.poisson(q["λ"]) },
      geometric: { label: "Geometric(p)", discrete: true, params: [{ k: "p", min: 0.03, max: 0.95, step: 0.01, v: 0.2 }],
        range: (q) => [1, Math.max(8, Math.ceil(Math.log(0.003) / Math.log(1 - q.p)))], pmf: (x, q) => m.geomPmf(x, q.p), mean: (q) => 1 / q.p, var: (q) => (1 - q.p) / q.p ** 2, sample: (q) => R.geometric(q.p) },
      uniform: { label: "Uniform(a, b)", discrete: false, params: [{ k: "a", min: -5, max: 4, step: 0.5, v: 0 }, { k: "b", min: -4, max: 5, step: 0.5, v: 2 }],
        range: (q) => [Math.min(q.a, q.b) - 1, Math.max(q.a, q.b) + 1], pdf: (x, q) => m.uniformPdf(x, Math.min(q.a, q.b), Math.max(q.a, q.b)), cdf: (x, q) => P.clamp((x - Math.min(q.a, q.b)) / Math.abs(q.b - q.a), 0, 1),
        mean: (q) => (q.a + q.b) / 2, var: (q) => (q.b - q.a) ** 2 / 12, sample: (q) => R.uniform(Math.min(q.a, q.b), Math.max(q.a, q.b)) },
      exponential: { label: "Exponential(λ)", discrete: false, params: [{ k: "λ", min: 0.2, max: 4, step: 0.05, v: 1 }],
        range: (q) => [0, 6 / q["λ"]], pdf: (x, q) => m.expPdf(x, q["λ"]), cdf: (x, q) => (x < 0 ? 0 : 1 - Math.exp(-q["λ"] * x)), mean: (q) => 1 / q["λ"], var: (q) => 1 / q["λ"] ** 2, sample: (q) => R.exp(q["λ"]) },
      normal: { label: "Normal(μ, σ²)", discrete: false, params: [{ k: "μ", min: -3, max: 3, step: 0.1, v: 0 }, { k: "σ", min: 0.3, max: 3, step: 0.05, v: 1 }],
        range: (q) => [-7, 7], pdf: (x, q) => m.normalPdf(x, q["μ"], q["σ"]), cdf: (x, q) => m.normalCdf(x, q["μ"], q["σ"]), mean: (q) => q["μ"], var: (q) => q["σ"] ** 2, sample: (q) => R.normal(q["μ"], q["σ"]) },
    };
    let cur = "binomial", q = {}, view = "pmf", samples = null;
    const chartEl = P.$("#ex-chart"), paramsEl = P.$("#ex-params");
    P.select("#ex-ctl", { label: "Distribution", options: Object.entries(D).map(([k, d]) => ({ value: k, label: d.label })), value: cur, onChange: (v) => { cur = v; samples = null; buildParams(); } });
    P.select("#ex-ctl", { label: "Show", options: [{ value: "pmf", label: "PMF / PDF" }, { value: "cdf", label: "CDF" }], value: view, onChange: (v) => { view = v; draw(); } });
    P.button("#ex-ctl", "Sample 2,000", () => { const d = D[cur]; samples = Array.from({ length: 2000 }, () => d.sample(q)); draw(); });
    P.button("#ex-ctl", "Clear", () => { samples = null; draw(); }, "ghost");

    function buildParams() {
      paramsEl.innerHTML = ""; q = {};
      for (const p of D[cur].params) {
        q[p.k] = p.v;
        P.slider(paramsEl, { label: p.k, min: p.min, max: p.max, step: p.step, value: p.v, onInput: (v) => { q[p.k] = v; samples = null; draw(); } });
      }
      draw();
    }
    function draw() {
      chartEl.innerHTML = "";
      const d = D[cur], [lo, hi] = d.range(q), mu = d.mean(q), sd = Math.sqrt(d.var(q));
      let ymax, c;
      if (d.discrete) {
        const xs = P.range(lo, hi);
        const ys = xs.map((x) => (view === "pmf" ? d.pmf(x, q) : xs.filter((t) => t <= x).reduce((s, t) => s + d.pmf(t, q), 0)));
        ymax = view === "cdf" ? 1.05 : Math.max(...ys) * 1.2;
        if (samples && view === "pmf") ymax = Math.max(ymax, Math.max(...P.counts(samples, lo, hi).map((c) => c.freq)) * 1.1);
        c = P.chart(chartEl, { x: [lo - 0.8, hi + 0.8], y: [0, ymax], xLabel: "x", yLabel: view === "pmf" ? "P(X = x)" : "P(X ≤ x)", xFormat: (v) => (Number.isInteger(v) ? v : "") });
        c.rect(mu - sd, 0, mu + sd, ymax, { color: "c1", opacity: 0.08 });
        if (view === "pmf") {
          c.bars(xs.map((x, i) => ({ x, y: ys[i], title: `P(X=${x}) = ${P.fmt(ys[i], 4)}` })), { color: "c1", w: samples ? 0.4 : 0.7, offset: samples ? -0.2 : 0 });
          if (samples) c.bars(P.counts(samples, lo, hi).map((o) => ({ x: o.x, y: o.freq })), { color: "c2", w: 0.4, offset: 0.2, opacity: 0.8 });
        } else {
          c.step([[lo - 0.8, 0], ...xs.map((x, i) => [x, ys[i]]), [hi + 0.8, 1]], { color: "c1" });
          c.dots(xs.map((x, i) => [x, ys[i]]), { color: "c1" });
        }
      } else {
        const xs = P.linspace(lo, hi, 300);
        const ys = xs.map((x) => (view === "pmf" ? d.pdf(x, q) : d.cdf(x, q)));
        ymax = view === "cdf" ? 1.05 : Math.max(...ys) * 1.2;
        let hist = null;
        if (samples && view === "pmf") { hist = P.histogram(samples, 40, lo, hi); ymax = Math.max(ymax, Math.max(...hist.map((b) => b.density)) * 1.1); }
        c = P.chart(chartEl, { x: [lo, hi], y: [0, ymax], xLabel: "x", yLabel: view === "pmf" ? "density f(x)" : "P(X ≤ x)" });
        c.rect(mu - sd, 0, mu + sd, ymax, { color: "c1", opacity: 0.08 });
        if (hist) c.bars(hist.map((b) => ({ x: b.x, y: b.density })), { color: "c2", w: (hi - lo) / 40 * 0.92, opacity: 0.55 });
        if (view === "pmf") c.area(xs.map((x, i) => [x, ys[i]]), { color: "c1", opacity: 0.15 });
        c.line(xs.map((x, i) => [x, ys[i]]), { color: "c1" });
      }
      c.vline(mu, { color: "c4", label: "mean" });
      P.$("#ex-read").innerHTML = "";
      const items = [{ label: "mean", value: P.fmt(mu, 3), color: "c4" }, { label: "variance", value: P.fmt(d.var(q), 3) }, { label: "std dev", value: P.fmt(sd, 3) }];
      if (samples) items.push({ label: "sample mean", value: P.fmt(P.mean(samples), 3), color: "c2" }, { label: "sample var", value: P.fmt(P.variance(samples), 3), color: "c2" });
      P.readout("#ex-read", items);
    }
    buildParams();
  })();

  /* ------------------------------------------------ binomial builder */
  (function binom() {
    let n = 10, p = 0.5, counts, total = 0, lastFlips = [];
    const reset = () => { counts = new Array(n + 1).fill(0); total = 0; lastFlips = []; draw(); };
    P.slider("#bn-ctl", { label: "n", min: 1, max: 30, value: n, onInput: (v) => { n = v; reset(); } });
    P.slider("#bn-ctl", { label: "p", min: 0.05, max: 0.95, step: 0.05, value: p, onInput: (v) => { p = v; reset(); } });
    const run = (k) => { for (let j = 0; j < k; j++) { lastFlips = Array.from({ length: n }, () => R.bernoulli(p)); counts[P.sum(lastFlips)]++; total++; } draw(); };
    P.button("#bn-ctl", "+1 experiment", () => run(1));
    P.button("#bn-ctl", "+100", () => run(100));
    const loop = P.loop(() => { run(5); if (total > 5000) return false; });
    const auto = P.button("#bn-ctl", "▶ Auto", () => { loop.running ? loop.stop() : loop.start(); auto.textContent = loop.running ? "⏸ Pause" : "▶ Auto"; }, "ghost");
    loop.onstop = () => (auto.textContent = "▶ Auto");
    P.button("#bn-ctl", "Reset", reset, "ghost");

    function draw() {
      const coins = P.$("#bn-coins");
      coins.innerHTML = lastFlips.length ? lastFlips.map((f) => `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;margin:2px;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#fff;background:var(${f ? "--c1" : "--c6"})">${f ? "H" : "T"}</span>`).join("") + ` <span class="muted small">→ ${P.sum(lastFlips)} heads</span>` : '<span class="muted small">Click a button to run experiments.</span>';
      const el = P.$("#bn-chart"); el.innerHTML = "";
      const pmf = P.range(0, n).map((k) => m.binomPmf(k, n, p));
      const emp = counts.map((c) => (total ? c / total : 0));
      const c = P.chart(el, { x: [-0.8, n + 0.8], y: [0, Math.max(...pmf, ...emp) * 1.15], xLabel: "number of heads k", yLabel: "fraction", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      c.bars(emp.map((y, k) => ({ x: k, y })), { color: "c1", w: 0.75 });
      c.dots(pmf.map((y, k) => [k, y]), { color: "c2", r: 4 });
      c.vline(n * p, { color: "c4", label: "np" });
      P.readout("#bn-read", [
        { label: "experiments", value: total },
        { label: "sample mean", value: total ? P.fmt(P.sum(counts.map((c, k) => c * k)) / total, 3) : "—", color: "c1" },
        { label: "$np$ =", value: P.fmt(n * p, 3), color: "c4" },
        { label: "$np(1-p)$ =", value: P.fmt(n * p * (1 - p), 3) },
      ]);
    }
    reset();
  })();

  /* ------------------------------------------------ binomial -> poisson */
  (function poisLimit() {
    let lam = 3, n = 6;
    P.slider("#pl-ctl", { label: "λ", min: 0.5, max: 8, step: 0.5, value: lam, onInput: (v) => { lam = v; n = Math.max(n, Math.ceil(lam)); draw(); } });
    const ns = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000];
    P.slider("#pl-ctl", { label: "n (slots)", min: 0, max: ns.length - 1, value: 4, format: (i) => ns[i], onInput: (i) => { n = ns[i]; draw(); } });
    n = ns[4];
    function draw() {
      const nn = Math.max(n, Math.ceil(lam) + 1), K = Math.ceil(lam + 4 * Math.sqrt(lam) + 3);
      const el = P.$("#pl-chart"); el.innerHTML = "";
      const b = P.range(0, K).map((k) => m.binomPmf(k, nn, lam / nn)), pp = P.range(0, K).map((k) => m.poissonPmf(k, lam));
      const c = P.chart(el, { x: [-0.8, K + 0.8], y: [0, Math.max(...b, ...pp) * 1.15], xLabel: "k", yLabel: "P(X = k)", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      c.bars(b.map((y, k) => ({ x: k, y })), { color: "c1", w: 0.7 });
      c.dots(pp.map((y, k) => [k, y]), { color: "c2", r: 4.5 });
      const tv = 0.5 * P.sum(P.range(0, K).map((k) => Math.abs(b[k] - pp[k])));
      P.readout("#pl-read", [
        { label: `Binomial(${nn}, ${P.fmt(lam / nn, 4)})`, value: "■", color: "c1" },
        { label: `Poisson(${lam})`, value: "●", color: "c2" },
        { label: "total variation distance", value: P.fmt(tv, 4) },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ memoryless */
  (function memless() {
    let p = 0.25, mm = 3;
    P.slider("#ml-ctl", { label: "p", min: 0.1, max: 0.6, step: 0.05, value: p, onInput: (v) => { p = v; draw(); } });
    P.slider("#ml-ctl", { label: "already failed m =", min: 0, max: 8, value: mm, onInput: (v) => { mm = v; draw(); } });
    function draw() {
      const K = 18, el = P.$("#ml-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0.2, K + 0.8], y: [0, p * 1.25], height: 240, xLabel: "k  (additional trials needed)", yLabel: "probability", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      const orig = P.range(1, K).map((k) => ({ x: k, y: m.geomPmf(k, p) }));
      const tail = Math.pow(1 - p, mm);
      const cond = P.range(1, K).map((k) => ({ x: k, y: m.geomPmf(k + mm, p) / tail }));
      c.bars(orig, { color: "c6", w: 0.7, opacity: 0.45 });
      c.bars(cond, { color: "c2", w: 0.35, opacity: 0.9 });
      c.text(K - 3, p * 1.12, `P(X = m+k | X > m), m=${mm}`, { color: "c2", anchor: "middle", weight: 600 });
      c.text(K - 3, p * 1.0, "P(X = k)", { color: "c6", anchor: "middle", weight: 600 });
    }
    draw();
  })();

  /* ------------------------------------------------ uniform sums */
  (function unif() {
    let mode = "diff";
    const modes = { one: ["U₁", 1, (u) => u[0], [0, 1]], diff: ["U₁ − U₂", 2, (u) => u[0] - u[1], [-1, 1]], sum2: ["U₁ + U₂", 2, (u) => u[0] + u[1], [0, 2]], sum3: ["U₁ + U₂ + U₃", 3, (u) => u[0] + u[1] + u[2], [0, 3]], sum6: ["sum of 6 uniforms", 6, (u) => P.sum(u), [0, 6]], max3: ["max(U₁, U₂, U₃)", 3, (u) => Math.max(...u), [0, 1]] };
    P.select("#un-ctl", { label: "Plot", options: Object.entries(modes).map(([k, v]) => ({ value: k, label: v[0] })), value: mode, onChange: (v) => { mode = v; draw(); } });
    P.button("#un-ctl", "Resample", () => draw(), "ghost");
    function draw() {
      const [, k, f, [lo, hi]] = modes[mode];
      const s = Array.from({ length: 20000 }, () => f(Array.from({ length: k }, Math.random)));
      const h = P.histogram(s, 50, lo, hi);
      const el = P.$("#un-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [lo, hi], y: [0, Math.max(...h.map((b) => b.density)) * 1.15], height: 220, yLabel: "density" });
      c.bars(h.map((b) => ({ x: b.x, y: b.density })), { color: "c5", w: ((hi - lo) / 50) * 0.92, opacity: 0.75 });
      if (k > 1 && mode.startsWith("sum")) { const mu = k / 2, sd = Math.sqrt(k / 12); c.line(P.linspace(lo, hi).map((x) => [x, m.normalPdf(x, mu, sd)]), { color: "c2", dash: true }); }
    }
    draw();
  })();

  /* ------------------------------------------------ Poisson process */
  (function pp() {
    let lam = 3;
    const T = 400;
    P.slider("#pp-ctl", { label: "rate λ", min: 0.5, max: 8, step: 0.5, value: lam, onInput: (v) => { lam = v; draw(); } });
    P.button("#pp-ctl", "New process", () => draw(), "ghost");
    function draw() {
      const ev = []; let t = 0;
      while ((t += R.exp(lam)) < T) ev.push(t);
      // timeline: first 10 units
      const L = P.$("#pp-line"); L.innerHTML = "";
      const c = P.chart(L, { x: [0, 10], y: [0, 1], height: 70, yAxis: false, grid: false, margin: { t: 8, b: 22, l: 14, r: 14 } });
      for (let u = 0; u < 10; u += 2) c.rect(u, 0, u + 1, 1, { color: "c1", opacity: 0.06 });
      ev.filter((x) => x < 10).forEach((x) => c.line([[x, 0.15], [x, 0.85]], { color: "c4", width: 2.5 }));
      // counts per unit window
      const counts = new Array(T).fill(0); ev.forEach((x) => counts[Math.floor(x)]++);
      const K = Math.ceil(lam + 4 * Math.sqrt(lam) + 2), cs = P.counts(counts, 0, K);
      const A = P.$("#pp-count"); A.innerHTML = "";
      const ca = P.chart(A, { x: [-0.8, K + 0.8], y: [0, Math.max(...cs.map((o) => o.freq), m.poissonPmf(Math.floor(lam), lam)) * 1.2], height: 220, xLabel: "# events per unit window", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      ca.bars(cs.map((o) => ({ x: o.x, y: o.freq })), { color: "c1", w: 0.7 });
      ca.dots(P.range(0, K).map((k) => [k, m.poissonPmf(k, lam)]), { color: "c2", r: 3.5 });
      ca.text(K * 0.7, Math.max(...cs.map((o) => o.freq)) * 1.1, `Poisson(${lam})`, { color: "c2", weight: 600 });
      // gaps
      const gaps = ev.slice(1).map((x, i) => x - ev[i]), hi = 5 / lam, h = P.histogram(gaps, 30, 0, hi);
      const B = P.$("#pp-gap"); B.innerHTML = "";
      const cb = P.chart(B, { x: [0, hi], y: [0, lam * 1.15], height: 220, xLabel: "gap between events" });
      cb.bars(h.map((b) => ({ x: b.x, y: b.density })), { color: "c3", w: (hi / 30) * 0.9, opacity: 0.7 });
      cb.line(P.linspace(0, hi).map((x) => [x, m.expPdf(x, lam)]), { color: "c2" });
      cb.text(hi * 0.65, lam * 0.8, `Exp(${lam})`, { color: "c2", weight: 600 });
    }
    draw();
  })();

  /* ------------------------------------------------ normal areas */
  (function normal() {
    let cval = 1.96, mode = "two";
    P.slider("#nm-ctl", { label: "c", min: 0, max: 3.5, step: 0.01, value: cval, format: (v) => v.toFixed(2), onInput: (v) => { cval = v; draw(); } });
    P.select("#nm-ctl", { label: "Region", options: [{ value: "two", label: "|Z| ≤ c (two-sided)" }, { value: "left", label: "Z ≤ c (one-sided)" }], value: mode, onChange: (v) => { mode = v; draw(); } });
    for (const [lab, v] of [["1σ", 1], ["2σ", 2], ["3σ", 3], ["95%", 1.96]]) P.button("#nm-ctl", lab, () => { sl.set(v); }, "ghost");
    const sl = { set: (v) => { const inp = P.$("#nm-ctl input"); inp.value = v; inp.dispatchEvent(new Event("input")); } };
    function draw() {
      const el = P.$("#nm-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [-4, 4], y: [0, 0.45], height: 240, xLabel: "z" });
      const xs = P.linspace(-4, 4, 400);
      const lo = mode === "two" ? -cval : -4;
      c.area(xs.filter((x) => x >= lo && x <= cval).map((x) => [x, m.normalPdf(x)]), { color: "c1", opacity: 0.35 });
      c.area(xs.filter((x) => x > cval).map((x) => [x, m.normalPdf(x)]), { color: "c4", opacity: 0.3 });
      if (mode === "two") c.area(xs.filter((x) => x < -cval).map((x) => [x, m.normalPdf(x)]), { color: "c4", opacity: 0.3 });
      c.line(xs.map((x) => [x, m.normalPdf(x)]), { color: "c1" });
      c.vline(cval, { color: "c4", label: "c" });
      if (mode === "two") c.vline(-cval, { color: "c4", label: "−c" });
      const inside = mode === "two" ? 2 * m.normalCdf(cval) - 1 : m.normalCdf(cval);
      c.text(0, 0.18, P.pct(inside, 2), { size: 16, weight: 700, color: "c1" });
      P.readout("#nm-read", [
        { label: mode === "two" ? "$P(|Z|\\le c)$ =" : "$P(Z\\le c)$ =", value: P.pct(inside, 2), color: "c1" },
        { label: "tail(s) $\\alpha$ =", value: P.pct(1 - inside, 2), color: "c4" },
        { label: mode === "two" ? "so $c = z_{1-\\alpha/2}$" : "so $c = z_{1-\\alpha}$", value: "" },
      ]);
    }
    draw();
  })();
})();

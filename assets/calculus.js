/* Widgets for calculus.html */
(function () {
  const { m } = P;
  const GAMMA = 0.5772156649;
  let clipId = 0;
  // Clip everything drawn in the chart body to the plot area (lib charts allow overflow).
  function clip(c) {
    const id = "calc-clip-" + clipId++;
    const cp = P.svgEl("clipPath", { id }, c.svg);
    P.svgEl("rect", { x: c.mg.l, y: c.mg.t, width: c.W - c.mg.l - c.mg.r, height: c.H - c.mg.t - c.mg.b }, cp);
    c.g.setAttribute("clip-path", `url(#${id})`);
  }
  // Draw y=f(x) as separate segments wherever f is undefined (NaN).
  function curve(c, xs, f, op) {
    let seg = [];
    for (const x of xs) {
      const y = f(x);
      if (isFinite(y)) seg.push([x, y]);
      else { if (seg.length > 1) c.line(seg, op); seg = []; }
    }
    if (seg.length > 1) c.line(seg, op);
  }

  /* ------------------------------------------------ Taylor explorer */
  (function taylor() {
    const F = {
      exp: { label: "eˣ", tex: "e^x", f: Math.exp, d: (k, a) => Math.exp(a), x: [-4, 4], y: [-3, 15], a: [-2, 2, 0], R: () => Infinity },
      sin: { label: "sin x", tex: "\\sin x", f: Math.sin, d: (k, a) => Math.sin(a + (k * Math.PI) / 2), x: [-8, 8], y: [-2.5, 2.5], a: [-3, 3, 0], R: () => Infinity },
      cos: { label: "cos x", tex: "\\cos x", f: Math.cos, d: (k, a) => Math.cos(a + (k * Math.PI) / 2), x: [-8, 8], y: [-2.5, 2.5], a: [-3, 3, 0], R: () => Infinity },
      log: { label: "log(1+x)", tex: "\\log(1+x)", f: (x) => (x > -1 ? Math.log1p(x) : NaN), d: (k, a) => (k === 0 ? Math.log1p(a) : ((k % 2 ? 1 : -1) * Math.exp(m.logFact(k - 1))) / Math.pow(1 + a, k)), x: [-1.5, 3.5], y: [-4, 2.5], a: [-0.8, 2, 0], R: (a) => 1 + a, sing: -1 },
      geo: { label: "1/(1−x)", tex: "\\frac{1}{1-x}", f: (x) => (Math.abs(1 - x) < 0.004 ? NaN : 1 / (1 - x)), d: (k, a) => Math.exp(m.logFact(k)) / Math.pow(1 - a, k + 1), x: [-3, 3], y: [-5, 8], a: [-2, 0.8, 0], R: (a) => 1 - a, sing: 1 },
    };
    let key = "exp", N = 3, a = 0;
    P.select("#ty-ctl", { label: "f(x) =", options: Object.entries(F).map(([k, v]) => ({ value: k, label: v.label })), value: key, onChange: (v) => { key = v; buildA(); } });
    P.slider("#ty-ctl", { label: "order N", min: 0, max: 12, value: N, onInput: (v) => { N = v; draw(); } });
    function buildA() {
      const el = P.$("#ty-a"); el.innerHTML = "";
      const [lo, hi, def] = F[key].a; a = def;
      const sl = P.slider(el, { label: "expansion point a", min: lo, max: hi, step: 0.1, value: a, format: (v) => v.toFixed(1), onInput: (v) => { a = v; draw(); } });
      P.button(el, "a = 0", () => sl.set(0), "ghost");
      draw();
    }
    function coeffs() { const fn = F[key]; return P.range(0, N).map((k) => fn.d(k, a) / Math.exp(m.logFact(k))); }
    function draw() {
      const fn = F[key], cs = coeffs(), R = fn.R(a);
      const T = (x) => cs.reduce((s, c, k) => s + c * Math.pow(x - a, k), 0);
      const el = P.$("#ty-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: fn.x, y: fn.y, height: 300, xLabel: "x" });
      clip(c);
      if (isFinite(R)) {
        c.rect(Math.max(fn.x[0], a - R), fn.y[0], Math.min(fn.x[1], a + R), fn.y[1], { color: "c3", opacity: 0.1 });
        c.vline(fn.sing, { color: "c4", label: "singularity" });
      }
      c.hline(0, { color: "c6", dash: false, width: 1 });
      const xs = P.linspace(fn.x[0], fn.x[1], 500);
      curve(c, xs, fn.f, { color: "c1", width: 3 });
      curve(c, xs, T, { color: "c2", width: 2.2 });
      c.dots([[a, fn.f(a)]], { color: "c2", r: 5, stroke: "var(--panel)" });
      // polynomial in TeX
      const xa = Math.abs(a) < 1e-9 ? "x" : a > 0 ? `(x-${P.fmt(a, 2)})` : `(x+${P.fmt(-a, 2)})`;
      const terms = [];
      cs.forEach((cf, k) => {
        if (Math.abs(cf) < 1e-10) return;
        const mag = Math.abs(cf), sgn = cf < 0 ? "-" : "+";
        const cstr = k === 0 || Math.abs(mag - 1) > 1e-9 ? P.fmt(mag, 4) : "";
        const pw = k === 0 ? "" : k === 1 ? xa : `${xa}^{${k}}`;
        terms.push({ sgn, s: cstr + (cstr && pw ? "\\," : "") + pw });
      });
      let src = terms.slice(0, 7).map((t, i) => (i === 0 ? (t.sgn === "-" ? "-" : "") : t.sgn) + t.s).join(" ");
      if (terms.length > 7) src += " + \\cdots";
      if (!terms.length) src = "0";
      P.tex("#ty-poly", `T_{${N}}(x) = ${src}`, true);
      const x1 = a + 0.9 * (isFinite(R) ? R : 1.5), x2 = isFinite(R) ? a + 1.3 * R : a + 3;
      const err = (x) => Math.abs(fn.f(x) - T(x));
      P.readout("#ty-read", [
        { label: "radius of convergence", value: isFinite(R) ? P.fmt(R, 2) : "∞", color: "c3" },
        { label: `error at x = ${P.fmt(x1, 2)}:`, value: P.fmt(err(x1), 3), color: "c2" },
        { label: `error at x = ${P.fmt(x2, 2)}:`, value: isFinite(fn.f(x2)) ? P.fmt(err(x2), 3) : "f undefined", color: "c4" },
      ]);
    }
    buildA();
  })();

  /* ------------------------------------------------ secant → tangent */
  (function tangent() {
    const F = {
      sq: { label: "x²", f: (x) => x * x, d: (x) => 2 * x, x: [-3, 3], y: [-2, 9], x0: 1 },
      cub: { label: "x³ − x", f: (x) => x ** 3 - x, d: (x) => 3 * x * x - 1, x: [-2, 2], y: [-3, 3], x0: 0.6 },
      exp: { label: "eˣ", f: Math.exp, d: Math.exp, x: [-3, 2.5], y: [-1, 10], x0: 0.5 },
      sin: { label: "sin x", f: Math.sin, d: Math.cos, x: [-4, 4], y: [-2, 2], x0: 1 },
      log: { label: "log x", f: (x) => (x > 0 ? Math.log(x) : NaN), d: (x) => 1 / x, x: [0, 5], y: [-3, 2.5], x0: 1 },
    };
    let key = "sq", x0 = 1, h = 1;
    const ctl = P.$("#tg-ctl");
    P.select(ctl, { label: "f(x) =", options: Object.entries(F).map(([k, v]) => ({ value: k, label: v.label })), value: key, onChange: (v) => { key = v; x0 = F[key].x0; xs.set(x0, false); draw(); } });
    const xs = P.slider(ctl, { label: "x₀", min: -2, max: 2, step: 0.05, value: x0, format: (v) => v.toFixed(2), onInput: (v) => { x0 = v; draw(); } });
    P.slider(ctl, { label: "h", min: 0.01, max: 2, step: 0.01, value: h, format: (v) => v.toFixed(2), onInput: (v) => { h = v; draw(); } });
    function draw() {
      const fn = F[key];
      let X0 = x0;
      if (key === "log" && X0 <= 0.05) X0 = 0.05;
      const el = P.$("#tg-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: fn.x, y: fn.y, height: 280, xLabel: "x" });
      clip(c);
      c.hline(0, { color: "c6", dash: false, width: 1 });
      curve(c, P.linspace(fn.x[0], fn.x[1], 400), fn.f, { color: "c1", width: 3 });
      const y0 = fn.f(X0), y1 = fn.f(X0 + h), sec = (y1 - y0) / h, tan = fn.d(X0);
      const L = fn.x;
      c.line([[L[0], y0 + tan * (L[0] - X0)], [L[1], y0 + tan * (L[1] - X0)]], { color: "c3", dash: true, width: 2 });
      if (isFinite(sec)) c.line([[L[0], y0 + sec * (L[0] - X0)], [L[1], y0 + sec * (L[1] - X0)]], { color: "c2", width: 2 });
      c.dots([[X0, y0]], { color: "c3", r: 5, stroke: "var(--panel)" });
      if (isFinite(y1)) c.dots([[X0 + h, y1]], { color: "c2", r: 5, stroke: "var(--panel)" });
      P.readout("#tg-read", [
        { label: "secant slope $\\frac{f(x_0+h)-f(x_0)}{h}$ =", value: P.fmt(sec, 4), color: "c2" },
        { label: "$f'(x_0)$ =", value: P.fmt(tan, 4), color: "c3" },
        { label: "difference", value: P.fmt(sec - tan, 4) },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ harmonic numbers */
  (function harm() {
    const NS = [10, 20, 50, 100, 200, 500, 1000, 2000];
    let n = 100;
    P.slider("#hm-ctl", { label: "n up to", min: 0, max: NS.length - 1, value: 3, format: (i) => NS[i], onInput: (i) => { n = NS[i]; draw(); } });
    function draw() {
      const H = [0]; for (let k = 1; k <= n; k++) H.push(H[k - 1] + 1 / k);
      const ks = P.range(1, n);
      const A = P.$("#hm-a"); A.innerHTML = "";
      const c = P.chart(A, { x: [0, n], y: [0, Math.log(n) + GAMMA + 0.6], width: 360, height: 250, xLabel: "n" });
      c.line(ks.map((k) => [k, Math.log(k) + GAMMA]), { color: "c3", dash: true });
      c.line(ks.map((k) => [k, Math.log(k)]), { color: "c2" });
      c.line(ks.map((k) => [k, H[k]]), { color: "c1" });
      if (n <= 50) c.dots(ks.map((k) => [k, H[k]]), { color: "c1", r: 2.5 });
      c.text(n * 0.98, Math.log(n) + GAMMA + 0.3, "Hₙ", { anchor: "end", color: "c1", weight: 700 });
      c.text(n * 0.98, Math.log(n) - 0.35, "ln n", { anchor: "end", color: "c2", weight: 700 });
      const B = P.$("#hm-b"); B.innerHTML = "";
      const cb = P.chart(B, { x: [0, n], y: [0.5, 1.02], width: 360, height: 250, xLabel: "n", yLabel: "Hₙ − ln n" });
      cb.hline(GAMMA, { color: "c3", label: "γ ≈ 0.5772" });
      cb.line(ks.map((k) => [k, H[k] - Math.log(k)]), { color: "c5" });
      if (n <= 50) cb.dots(ks.map((k) => [k, H[k] - Math.log(k)]), { color: "c5", r: 2.5 });
      P.readout("#hm-read", [
        { label: `$H_{${n}}$ =`, value: P.fmt(H[n], 5), color: "c1" },
        { label: `$\\ln ${n}$ =`, value: P.fmt(Math.log(n), 5), color: "c2" },
        { label: `$\\ln ${n}+\\gamma$ =`, value: P.fmt(Math.log(n) + GAMMA, 5), color: "c3" },
        { label: "gap − γ =", value: P.fmt(H[n] - Math.log(n) - GAMMA, 5) },
        { label: "$\\frac1{2n}$ =", value: P.fmt(1 / (2 * n), 5) },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ e limits vs series */
  (function elim() {
    let x = 1, nmax = 30;
    const ctl = P.$("#el-ctl");
    const xs = P.slider(ctl, { label: "x", min: -3, max: 3, step: 0.5, value: x, onInput: (v) => { x = v; draw(); } });
    P.slider(ctl, { label: "n up to", min: 5, max: 100, step: 5, value: nmax, onInput: (v) => { nmax = v; draw(); } });
    P.button(ctl, "x = 1  (e)", () => xs.set(1), "ghost");
    P.button(ctl, "x = −1  (1/e)", () => xs.set(-1), "ghost");
    function draw() {
      const target = Math.exp(x), ns = P.range(1, nmax);
      const lim = ns.map((n) => [n, Math.pow(1 + x / n, n)]);
      const ser = []; let term = 1, s = 1;
      for (let n = 1; n <= nmax; n++) { term *= x / n; s += term; ser.push([n, s]); }
      const band = Math.max(1.5, 1.2 * Math.abs(target));
      const vals = [...lim, ...ser].map((p) => p[1]).concat(target);
      const lo = Math.max(Math.min(...vals), target - band), hi = Math.min(Math.max(...vals), target + band);
      const pad = 0.08 * (hi - lo || 1);
      const el = P.$("#el-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, nmax + 1], y: [lo - pad, hi + pad], height: 280, xLabel: "n" });
      clip(c);
      c.hline(target, { color: "c2", label: `eˣ = ${P.fmt(target, 4)}` });
      c.line(lim, { color: "c1", width: 1.2, opacity: 0.5 });
      c.dots(lim, { color: "c1", r: 3 });
      c.line(ser, { color: "c3", width: 1.2, opacity: 0.5 });
      c.dots(ser, { color: "c3", r: 3 });
      const L = lim[lim.length - 1][1], S = ser[ser.length - 1][1];
      P.readout("#el-read", [
        { label: `$(1+x/n)^n$ at $n=${nmax}$:`, value: P.fmt(L, 6), color: "c1" },
        { label: "error", value: P.fmt(L - target, 3), color: "c1" },
        { label: `$\\sum_{k\\le ${nmax}} x^k/k!$:`, value: P.fmt(S, 6), color: "c3" },
        { label: "error", value: P.fmt(S - target, 3), color: "c3" },
        { label: "predicted limit-form error $\\approx -e^x x^2/2n$:", value: P.fmt((-target * x * x) / (2 * nmax), 3) },
      ]);
    }
    draw();
  })();
})();

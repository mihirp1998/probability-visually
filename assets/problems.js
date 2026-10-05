/* Widgets for problems.html */
(function () {
  const { m, rand: R } = P;
  const S = P.svgEl;

  /* ======================================================== coin-pattern first-step analysis */
  (function pattern() {
    let pat = "HH", p = 0.5, L, delta, E, overlap;
    // simulator state
    let cur = 0, flipsThis = 0, coins = [], doneFlash = false, trials = 0, totalFlips = 0, hist = [], stride = 1, lastEdge = null;
    let speed = "medium", acc = 0, lastLen = 0;

    const ctl = P.$("#pt-ctl"), ctl2 = P.$("#pt-ctl2");
    const presets = ["HH", "HT", "HHH", "HTH", "HHT", "THH", "HTHT", "HHHH"];
    P.select(ctl, { label: "Target", options: presets, value: pat, onChange: (v) => { pat = v; customIn.value = v; rebuild(); } });
    const cw = P.el("div", { class: "ctl" }, ctl);
    P.el("label", { text: "or type (H/T, ≤5)" }, cw);
    const customIn = P.el("input", { type: "text", value: pat, maxlength: 5, "aria-label": "custom pattern" }, cw);
    customIn.addEventListener("input", () => {
      const v = customIn.value.toUpperCase().replace(/[^HT]/g, "").slice(0, 5);
      if (v.length >= 1 && v !== pat) { pat = v; rebuild(); }
    });
    P.slider(ctl, { label: "P(heads) p", min: 0.1, max: 0.9, step: 0.05, value: p, format: (v) => v.toFixed(2), onInput: (v) => { p = v; rebuild(); } });

    P.select(ctl2, { label: "Speed", options: [{ value: "slow", label: "slow (3 flips/s)" }, { value: "medium", label: "medium (12/s)" }, { value: "fast", label: "fast (60/s)" }, { value: "turbo", label: "turbo (~10⁶/s)" }], value: speed, onChange: (v) => { speed = v; } });
    const loop = P.loop((dt) => {
      if (speed === "turbo") {
        for (let k = 0; k < 40000; k++) step(true);
        render();
        if (trials >= 300000) return false;
        return;
      }
      const rate = { slow: 3, medium: 12, fast: 60 }[speed];
      acc += (dt * rate) / 1000;
      let k = Math.floor(acc); acc -= k;
      if (k > 0) { while (k--) step(false); render(); }
    });
    const runBtn = P.button(ctl2, "▶ Run", () => { loop.running ? loop.stop() : loop.start(); runBtn.textContent = loop.running ? "⏸ Pause" : "▶ Run"; });
    loop.onstop = () => (runBtn.textContent = "▶ Run");
    P.button(ctl2, "1 flip", () => { step(false); render(); }, "ghost");
    P.button(ctl2, "+10,000 trials", () => { const t = trials + 10000; let guard = 0; while (trials < t && guard++ < 5e6) step(true); render(); }, "ghost");
    P.button(ctl2, "Reset", () => { resetSim(); render(); }, "ghost");

    const name = (i) => (i === 0 ? "∅" : pat.slice(0, i));
    const texName = (i) => (i === 0 ? "\\varnothing" : `\\text{${pat.slice(0, i)}}`);
    const prob = (s) => [...s].reduce((a, c) => a * (c === "H" ? p : 1 - p), 1);

    function nextState(i, c) {
      const s = pat.slice(0, i) + c;
      for (let k = Math.min(L, s.length); k > 0; k--) if (s.endsWith(pat.slice(0, k))) return k;
      return 0;
    }
    function solveModel() {
      L = pat.length;
      delta = [];
      for (let i = 0; i < L; i++) delta.push({ H: nextState(i, "H"), T: nextState(i, "T") });
      const A = Array.from({ length: L }, () => new Array(L).fill(0)), b = new Array(L).fill(1);
      for (let i = 0; i < L; i++) {
        A[i][i] += 1;
        for (const c of "HT") { const j = delta[i][c]; if (j < L) A[i][j] -= c === "H" ? p : 1 - p; }
      }
      E = m.solve(A, b).concat([0]);
      overlap = 0;
      for (let k = 1; k <= L; k++) if (pat.slice(0, k) === pat.slice(L - k)) overlap += 1 / prob(pat.slice(0, k));
    }

    /* ---- diagram ---- */
    let nodeEls = [], edgeEls = {};
    function drawDiagram() {
      const host = P.$("#pt-diagram"); host.innerHTML = "";
      const W = 640, r = 28, y = 106;
      const maxBack = Math.max(0, ...delta.map((d, i) => Math.max(i - d.H, i - d.T)));
      const H = y + r + (maxBack > 0 ? 34 + 20 * maxBack : 10) + 16;
      const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "diagram", role: "img", "aria-label": "state diagram" }, host);
      const defs = S("defs", {}, svg);
      for (const [id, col] of [["fw", "c3"], ["bk", "c6"], ["hl", "c2"]]) {
        const mk = S("marker", { id: "pt-arr-" + id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, defs);
        S("path", { d: "M0,0 L10,5 L0,10 z", style: `fill:${P.color(col)}` }, mk);
      }
      const gap = L ? (W - 100) / L : 0;
      const X = (i) => 50 + i * gap;
      nodeEls = []; edgeEls = {};
      const edgesG = S("g", {}, svg), nodesG = S("g", {}, svg);
      const lbl = (x, yy, t, col) => { const e = S("text", { x, y: yy, "text-anchor": "middle", style: `fill:${P.color(col)};font-size:13px;font-weight:700` }, edgesG); e.textContent = t; return e; };
      for (let i = 0; i < L; i++) {
        for (const c of "HT") {
          const j = delta[i][c], x = X(i);
          let d, lx, ly, kind;
          if (j === i + 1) { d = `M${x + r},${y} L${X(j) - r - 1},${y}`; lx = (x + X(j)) / 2; ly = y - 8; kind = "fw"; }
          else if (j === i) { d = `M${x - r * 0.5},${y - r * 0.87} C${x - 34},${y - r - 50} ${x + 34},${y - r - 50} ${x + r * 0.5},${y - r * 0.87}`; lx = x; ly = y - r - 46; kind = "bk"; }
          else { const h = 26 + 20 * (i - j); d = `M${x - r * 0.5},${y + r * 0.87} C${x - 10},${y + r + h} ${X(j) + 10},${y + r + h} ${X(j) + r * 0.5},${y + r * 0.87}`; lx = (x + X(j)) / 2; ly = y + r + 0.75 * h + 15; kind = "bk"; }
          const path = S("path", { d, "marker-end": `url(#pt-arr-${kind})`, style: `fill:none;stroke:${P.color(kind === "fw" ? "c3" : "c6")};stroke-width:2;transition:stroke .15s` }, edgesG);
          const pr = c === "H" ? p : 1 - p;
          const t = lbl(lx, ly, p === 0.5 ? c : `${c} (${P.fmt(pr, 2)})`, kind === "fw" ? "c3" : "c6");
          edgeEls[i + c] = { path, t, kind };
        }
      }
      for (let i = 0; i <= L; i++) {
        const g = S("g", {}, nodesG);
        const circ = S("circle", { cx: X(i), cy: y, r, style: `fill:var(--panel);stroke:${P.color(i === L ? "c3" : "c1")};stroke-width:2;transition:fill .15s` }, g);
        if (i === L) S("circle", { cx: X(i), cy: y, r: r - 4, style: `fill:none;stroke:${P.color("c3")};stroke-width:1.5` }, g);
        const t1 = S("text", { x: X(i), y: y + 1, "text-anchor": "middle", style: "fill:var(--ink);font-size:13px;font-weight:700" }, g); t1.textContent = name(i);
        const t2 = S("text", { x: X(i), y: y + 15, "text-anchor": "middle", style: "fill:var(--muted);font-size:10px" }, g); t2.textContent = "E=" + P.fmt(E[i], 2);
        nodeEls.push(circ);
      }
      const leg = S("text", { x: 8, y: 13, style: "fill:var(--muted);font-size:11px" }, svg);
      leg.textContent = "green = progress · gray = fallback (longest suffix that is still a prefix) · double circle = done";
    }
    function highlight() {
      nodeEls.forEach((c, i) => { c.style.fill = i === cur ? "var(--accent-soft)" : "var(--panel)"; c.style.strokeWidth = i === cur ? 4 : 2; c.style.stroke = P.color(i === cur ? "c2" : i === L ? "c3" : "c1"); });
      if (doneFlash) nodeEls[L].style.fill = "var(--tip)";
      for (const [k, e] of Object.entries(edgeEls)) {
        const on = k === lastEdge;
        e.path.style.stroke = P.color(on ? "c2" : e.kind === "fw" ? "c3" : "c6");
        e.path.style.strokeWidth = on ? 3.5 : 2;
        e.path.setAttribute("marker-end", `url(#pt-arr-${on ? "hl" : e.kind})`);
      }
    }

    /* ---- equations ---- */
    function drawEqs() {
      const coef = (c) => { const v = c === "H" ? p : 1 - p; return v === 0.5 ? "\\tfrac12" : P.fmt(v, 2); };
      const lines = [];
      for (let i = 0; i < L; i++) {
        const terms = ["H", "T"].map((c) => { const j = delta[i][c]; return `${coef(c)}\\,${j === L ? "\\underbrace{E_{" + texName(L) + "}}_{=\\,0}" : "E_{" + texName(j) + "}"}`; });
        lines.push(`E_{${texName(i)}} &= 1 + ${terms[0]} + ${terms[1]} & &(\\text{H}\\to ${texName(delta[i].H)},\\ \\text{T}\\to ${texName(delta[i].T)})`);
      }
      const sol = E.slice(0, L).map((v, i) => `E_{${texName(i)}}=${P.fmt(v, 4)}`).join(",\\;\\; ");
      const src = `\\begin{gathered}\\begin{aligned}${lines.join("\\\\")}\\end{aligned}\\\\[2pt]\\Downarrow\\\\[2pt] ${sol}\\end{gathered}`;
      P.tex(P.$("#pt-eqs"), src, true);
    }

    /* ---- simulation ---- */
    function resetSim() { cur = 0; flipsThis = 0; coins = []; doneFlash = false; trials = 0; totalFlips = 0; hist = []; stride = 1; lastEdge = null; acc = 0; }
    function step() {
      if (cur === L) { cur = 0; coins = []; doneFlash = false; } // previous trial just finished
      const c = Math.random() < p ? "H" : "T";
      lastEdge = cur + c;
      cur = delta[cur][c];
      flipsThis++;
      coins.push(c);
      if (coins.length > 36) coins.shift();
      if (cur === L) {
        trials++; totalFlips += flipsThis; lastLen = flipsThis; flipsThis = 0; doneFlash = true;
        if (trials % stride === 0) { hist.push([trials, totalFlips / trials]); if (hist.length > 1500) { hist = hist.filter((_, i) => i % 2 === 1); stride *= 2; } }
      }
    }

    function render() {
      highlight();
      const ce = P.$("#pt-coins");
      ce.innerHTML = coins.length
        ? coins.map((c, i) => `<span class="coin ${c === "H" ? "h" : "t"}${doneFlash && i >= coins.length - L ? " done" : ""}">${c}</span>`).join("") +
          ` <span class="muted small">${doneFlash ? `→ got ${pat} after ${lastLen} flips` : `${flipsThis} flip${flipsThis === 1 ? "" : "s"} so far`}</span>`
        : '<span class="muted small">Press ▶ Run or "1 flip" to start flipping.</span>';
      const el = P.$("#pt-chart"); el.innerHTML = "";
      const E0 = E[0], xmax = Math.max(10, trials);
      const ys = hist.map((h) => h[1]);
      const ymax = Math.max(E0 * 2, ...(ys.length ? ys.slice(Math.min(3, ys.length - 1)) : [0])) * 1.05;
      const c = P.chart(el, { x: [0, xmax], y: [0, ymax], height: 200, xLabel: "trials completed", yLabel: "average flips" });
      c.hline(E0, { color: "c4", label: `exact E∅ = ${P.fmt(E0, 3)}` });
      if (hist.length) c.line([[hist[0][0], hist[0][1]], ...hist.map((h) => [h[0], Math.min(h[1], ymax * 1.5)]), [trials, trials ? totalFlips / trials : 0]], { color: "c1" });
      P.readout("#pt-read", [
        { label: "exact E∅", value: P.fmt(E0, 4), color: "c4" },
        { label: "overlap formula", value: P.fmt(overlap, 4) },
        { label: "trials", value: trials.toLocaleString() },
        { label: "simulated average", value: trials ? P.fmt(totalFlips / trials, 3) : "—", color: "c1" },
        { label: "current state", value: doneFlash ? pat + " ✓" : name(cur), color: "c2" },
      ]);
    }
    function rebuild() {
      loop.stop(); runBtn.textContent = "▶ Run";
      solveModel(); resetSim(); drawDiagram(); drawEqs(); render();
    }
    rebuild();
  })();

  /* ======================================================== fixed points of a permutation */
  (function fixedPoints() {
    let n = 8, perm = [], counts, total, sum2, K;
    P.slider("#fx-ctl", { label: "n cards", min: 2, max: 15, value: n, onInput: (v) => { n = v; reset(); } });
    const shuffleOnce = () => { perm = R.shuffle(P.range(1, n)); const f = perm.filter((v, i) => v === i + 1).length; counts[f]++; total++; sum2 += f * f; return f; };
    P.button("#fx-ctl", "Shuffle", () => { shuffleOnce(); draw(); });
    P.button("#fx-ctl", "+1,000", () => { for (let i = 0; i < 1000; i++) shuffleOnce(); draw(); }, "ghost");
    const loop = P.loop(() => { for (let i = 0; i < 300; i++) shuffleOnce(); draw(); if (total >= 200000) return false; });
    const auto = P.button("#fx-ctl", "▶ Auto", () => { loop.running ? loop.stop() : loop.start(); auto.textContent = loop.running ? "⏸ Pause" : "▶ Auto"; }, "ghost");
    loop.onstop = () => (auto.textContent = "▶ Auto");
    P.button("#fx-ctl", "Reset", () => reset(), "ghost");

    function exactPmf(n) {
      const D = [1, 0]; for (let k = 2; k <= n; k++) D[k] = (k - 1) * (D[k - 1] + D[k - 2]);
      let f = 1; for (let k = 2; k <= n; k++) f *= k;
      return P.range(0, n).map((k) => (m.choose(n, k) * D[n - k]) / f);
    }
    function reset() { loop.stop(); auto.textContent = "▶ Auto"; counts = new Array(n + 1).fill(0); total = 0; sum2 = 0; shuffleOnce(); draw(); }
    function draw() {
      const cards = P.$("#fx-cards");
      cards.innerHTML = perm.map((v, i) => `<div class="pcard${v === i + 1 ? " fixed" : ""}"><div class="face">${v}</div><div class="slot">slot ${i + 1}</div></div>`).join("");
      K = Math.min(n, 6);
      const ex = exactPmf(n), emp = counts.map((c) => (total ? c / total : 0));
      const el = P.$("#fx-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [-0.8, K + 0.8], y: [0, 0.55], height: 220, xLabel: "number of fixed points", yLabel: "fraction", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      c.bars(P.range(0, K).map((k) => ({ x: k, y: emp[k] || 0, title: `simulated P(${k}) = ${P.fmt(emp[k] || 0, 4)}` })), { color: "c1", w: 0.7 });
      c.dots(P.range(0, K).map((k) => [k, ex[k]]), { color: "c2", r: 4 });
      c.dots(P.range(0, K).map((k) => [k, m.poissonPmf(k, 1)]), { color: "none", stroke: "c4", r: 7 });
      c.vline(1, { color: "c3", label: "mean = 1" });
      const mean = total ? P.sum(counts.map((cc, k) => cc * k)) / total : NaN;
      const fixedNow = perm.filter((v, i) => v === i + 1).length;
      P.readout("#fx-read", [
        { label: "this shuffle:", value: total ? `${fixedNow} fixed` : "—", color: "c3" },
        { label: "shuffles", value: total.toLocaleString() },
        { label: "avg #fixed", value: total ? P.fmt(mean, 3) : "—", color: "c1" },
        { label: "sample var", value: total > 1 ? P.fmt(sum2 / total - mean * mean, 3) : "—" },
        { label: "P(none): sim", value: total ? P.fmt(emp[0], 4) : "—", color: "c1" },
        { label: "exact", value: P.fmt(ex[0], 4), color: "c2" },
        { label: "1/e", value: P.fmt(Math.exp(-1), 4), color: "c4" },
      ]);
    }
    P.legend("#w-fixed", [{ label: "simulated", color: "c1" }, { label: "exact distribution", color: "c2" }, { label: "Poisson(1)", color: "c4" }]);
    reset();
  })();

  /* ======================================================== n uniforms: gaps, max, min */
  (function uniforms() {
    let n = 4, pts = [], sMax = 0, sMin = 0, cnt = 0, maxima = [];
    P.slider("#un-ctl", { label: "n points", min: 1, max: 20, value: n, onInput: (v) => { n = v; reset(); } });
    const sample = () => {
      pts = Array.from({ length: n }, Math.random).sort((a, b) => a - b);
      sMax += pts[n - 1]; sMin += pts[0]; cnt++;
      if (maxima.length < 20000) maxima.push(pts[n - 1]);
    };
    P.button("#un-ctl", "New sample", () => { sample(); draw(); });
    P.button("#un-ctl", "+1,000", () => { for (let i = 0; i < 1000; i++) sample(); draw(); }, "ghost");
    const loop = P.loop(() => { for (let i = 0; i < 150; i++) sample(); draw(); if (cnt >= 50000) return false; });
    const auto = P.button("#un-ctl", "▶ Auto", () => { loop.running ? loop.stop() : loop.start(); auto.textContent = loop.running ? "⏸ Pause" : "▶ Auto"; }, "ghost");
    loop.onstop = () => (auto.textContent = "▶ Auto");
    P.button("#un-ctl", "Reset", () => reset(), "ghost");

    function reset() { loop.stop(); auto.textContent = "▶ Auto"; sMax = sMin = cnt = 0; maxima = []; sample(); draw(); }
    function draw() {
      // strip
      const el = P.$("#un-strip"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, 1], y: [0, 1], height: 96, yAxis: false, grid: false, margin: { t: 6, b: 24, l: 14, r: 14 } });
      const cuts = [0, ...pts, 1];
      for (let i = 0; i < cuts.length - 1; i++) {
        const r = c.rect(cuts[i], 0.3, cuts[i + 1], 0.62, { color: i % 2 ? "c3" : "c1", opacity: 0.38 });
        S("title", {}, r).textContent = `gap ${i + 1}: ${P.fmt(cuts[i + 1] - cuts[i], 3)}`;
      }
      c.dots(pts.slice(1, -1).map((x) => [x, 0.46]), { color: "c6", r: 4.5 });
      c.dots([[pts[0], 0.46]], { color: "c2", r: 6.5 });
      c.dots([[pts[n - 1], 0.46]], { color: "c4", r: 6.5 });
      c.text(pts[0], 0.78, "min", { color: "c2", weight: 700 });
      c.text(pts[n - 1], n > 1 && pts[n - 1] - pts[0] < 0.08 ? 0.98 : 0.78, "max", { color: "c4", weight: 700 });
      P.readout("#un-read", [
        { label: "samples", value: cnt.toLocaleString() },
        { label: "avg max", value: P.fmt(sMax / cnt, 4), color: "c4" },
        { label: "$\\tfrac{n}{n+1}$ =", value: P.fmt(n / (n + 1), 4), color: "c4" },
        { label: "avg min", value: P.fmt(sMin / cnt, 4), color: "c2" },
        { label: "$\\tfrac{1}{n+1}$ =", value: P.fmt(1 / (n + 1), 4), color: "c2" },
      ]);
      // CDF chart
      const el2 = P.$("#un-cdf"); el2.innerHTML = "";
      const c2 = P.chart(el2, { x: [0, 1], y: [0, 1.02], height: 240, xLabel: "x", yLabel: "CDF" });
      const xs = P.linspace(0, 1, 120);
      for (let k = 1; k <= 10; k++) if (k !== n) c2.line(xs.map((x) => [x, x ** k]), { color: "c6", width: 1, opacity: 0.35 });
      if (maxima.length >= 20) {
        const s = maxima.slice().sort((a, b) => a - b), N = s.length, step = Math.max(1, Math.floor(N / 200));
        const ptsE = [[0, 0]]; for (let i = 0; i < N; i += step) ptsE.push([s[i], (i + 1) / N]); ptsE.push([s[N - 1], 1], [1, 1]);
        c2.step(ptsE, { color: "c1", width: 2, opacity: 0.8 });
      }
      c2.line(xs.map((x) => [x, x ** n]), { color: "c4", width: 2.6 });
      c2.line(xs.map((x) => [x, 1 - (1 - x) ** n]), { color: "c2", width: 2.6 });
      c2.vline(n / (n + 1), { color: "c4", label: "E[max]" });
      c2.vline(1 / (n + 1), { color: "c2", label: "E[min]" });
      P.legend(el2, [{ label: `F<sub>M</sub>(x) = x<sup>${n}</sup>`, color: "c4" }, { label: `F<sub>m</sub>(x) = 1 − (1−x)<sup>${n}</sup>`, color: "c2" }, { label: "empirical CDF of max", color: "c1" }, { label: "x<sup>k</sup>, k = 1..10", color: "c6" }]);
    }
    reset();
  })();

  /* ======================================================== race of exponential clocks */
  (function expMin() {
    const lam = [1, 0.5, 2];
    lam.forEach((v, j) => P.slider("#em-ctl", { label: `λ${"₁₂₃"[j]}`, min: 0.2, max: 3, step: 0.1, value: v, format: (x) => x.toFixed(1), onInput: (x) => { lam[j] = x; draw(); } }));
    P.button("#em-ctl", "Resample", () => draw(), "ghost");
    function draw() {
      const N = 20000, Lsum = P.sum(lam), wins = [0, 0, 0], mins = new Array(N);
      for (let i = 0; i < N; i++) {
        let best = Infinity, arg = 0;
        for (let j = 0; j < 3; j++) { const t = R.exp(lam[j]); if (t < best) { best = t; arg = j; } }
        mins[i] = best; wins[arg]++;
      }
      const hi = 4 / Lsum, h = P.histogram(mins, 40, 0, hi);
      const el = P.$("#em-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, hi], y: [0, Lsum * 1.15], height: 220, xLabel: "time of first ring  min(X₁, X₂, X₃)", yLabel: "density" });
      c.bars(h.map((b) => ({ x: b.x, y: b.density })), { color: "c5", w: (hi / 40) * 0.92, opacity: 0.6 });
      c.line(P.linspace(0, hi).map((x) => [x, m.expPdf(x, Lsum)]), { color: "c2" });
      c.text(hi * 0.6, Lsum * 0.7, `Exp(λ₁+λ₂+λ₃ = ${P.fmt(Lsum, 2)})`, { color: "c2", weight: 600 });
      const cols = ["c1", "c3", "c4"];
      P.readout("#em-read", [
        { label: "mean of min", value: P.fmt(P.mean(mins), 4), color: "c5" },
        { label: "$1/\\sum\\lambda$ =", value: P.fmt(1 / Lsum, 4), color: "c2" },
        ...[0, 1, 2].map((j) => ({ label: `clock ${j + 1} wins`, value: `${P.pct(wins[j] / N)} (theory ${P.pct(lam[j] / Lsum)})`, color: cols[j] })),
      ]);
    }
    draw();
  })();

  /* ======================================================== growth of extremes */
  (function extremes() {
    const ns = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const lg = (n) => Math.log10(n);
    let dist = "normal", sel = 7, sMax, sMin, reps;
    const smoothN = [...new Set(P.linspace(0, lg(5000), 70).map((t) => Math.round(10 ** t)))];

    // exact normal E[max] by numerical integration on a grid
    const gx = P.linspace(-8.5, 8.5, 1701), gdx = gx[1] - gx[0], gphi = gx.map((x) => m.normalPdf(x)), gPhi = gx.map((x) => m.normalCdf(x));
    const normMaxCache = new Map();
    const normMax = (n) => {
      if (n === 1) return 0;
      if (normMaxCache.has(n)) return normMaxCache.get(n);
      let s = 0; for (let i = 0; i < gx.length; i++) s += gx[i] * n * gphi[i] * Math.pow(gPhi[i], n - 1);
      normMaxCache.set(n, s * gdx); return s * gdx;
    };
    const D = {
      uniform: { label: "Uniform[0,1]", y: [0, 1.05], draw: () => Math.random(), max: (n) => n / (n + 1), min: (n) => 1 / (n + 1), maxTex: "n/(n+1)", minTex: "1/(n+1)" },
      exponential: { label: "Exponential(λ=1)", y: [0, 10], draw: () => R.exp(1), max: (n) => m.harmonic(n), min: (n) => 1 / n, maxTex: "H_n", minTex: "1/n" },
      normal: { label: "Normal(0,1)", y: [-4.3, 4.3], draw: () => R.normal(), max: normMax, min: (n) => -normMax(n), maxTex: "exact", minTex: "exact", approx: (n) => Math.sqrt(2 * Math.log(n)) },
    };
    P.select("#xt-ctl", { label: "Distribution", options: Object.entries(D).map(([k, d]) => ({ value: k, label: d.label })), value: dist, onChange: (v) => { dist = v; reset(); } });
    P.slider("#xt-ctl", { label: "inspect n", min: 0, max: ns.length - 1, value: sel, format: (i) => ns[i], onInput: (i) => { sel = i; draw(); } });
    const loop = P.loop(() => {
      const d = D[dist];
      for (let r = 0; r < 12; r++)
        ns.forEach((n, i) => {
          let mx = -Infinity, mn = Infinity;
          for (let k = 0; k < n; k++) { const x = d.draw(); if (x > mx) mx = x; if (x < mn) mn = x; }
          sMax[i] += mx; sMin[i] += mn; reps[i]++;
        });
      draw();
      if (reps[0] >= 600) return false;
    });
    const run = P.button("#xt-ctl", "▶ Simulate", () => { loop.running ? loop.stop() : loop.start(); run.textContent = loop.running ? "⏸ Pause" : "▶ Simulate"; });
    loop.onstop = () => (run.textContent = "▶ Simulate");
    P.button("#xt-ctl", "Reset", () => reset(), "ghost");

    function reset() { loop.stop(); run.textContent = "▶ Simulate"; sMax = ns.map(() => 0); sMin = ns.map(() => 0); reps = ns.map(() => 0); draw(); }
    function draw() {
      const d = D[dist], el = P.$("#xt-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [-0.08, lg(5000) + 0.08], y: d.y, height: 280, xLabel: "n (log scale)", yLabel: "expected value", xTicks: [0, 1, 2, 3], xFormat: (t) => String(Math.round(10 ** t)) });
      if (dist === "normal") c.hline(0, { color: "c6", dash: false, width: 1 });
      c.line(smoothN.map((n) => [lg(n), d.max(n)]), { color: "c4" });
      c.line(smoothN.map((n) => [lg(n), d.min(n)]), { color: "c2" });
      if (d.approx) {
        c.line(smoothN.map((n) => [lg(n), d.approx(n)]), { color: "c6", dash: true });
        c.line(smoothN.map((n) => [lg(n), -d.approx(n)]), { color: "c6", dash: true });
      }
      if (dist === "exponential") c.line(smoothN.map((n) => [lg(n), Math.log(n)]), { color: "c6", dash: true, width: 1.5 });
      c.vline(lg(ns[sel]), { color: "c5", label: `n=${ns[sel]}` });
      if (reps[0]) {
        c.dots(ns.map((n, i) => [lg(n), sMax[i] / reps[i]]), { color: "c4", r: 4.5, stroke: "var(--panel)" });
        c.dots(ns.map((n, i) => [lg(n), sMin[i] / reps[i]]), { color: "c2", r: 4.5, stroke: "var(--panel)" });
      }
      const n = ns[sel], i = sel;
      const items = [
        { label: `n = ${n}: exact E[max]`, value: P.fmt(d.max(n), 4), color: "c4" },
        { label: "simulated", value: reps[i] ? P.fmt(sMax[i] / reps[i], 4) : "—", color: "c4" },
        { label: "exact E[min]", value: P.fmt(d.min(n), 4), color: "c2" },
        { label: "simulated", value: reps[i] ? P.fmt(sMin[i] / reps[i], 4) : "—", color: "c2" },
      ];
      if (d.approx) items.push({ label: "√(2 ln n)", value: P.fmt(d.approx(n), 4) });
      if (dist === "exponential") items.push({ label: "ln n (dashed)", value: P.fmt(Math.log(n), 4) });
      items.push({ label: "runs per n", value: reps[0] });
      P.readout("#xt-read", items);
    }
    reset();
  })();
})();

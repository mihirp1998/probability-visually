/* Widgets for markov.html */
(function () {
  const { m, svgEl } = P;
  const SC = ["c1", "c2", "c3"]; // per-state colors
  const NAMES = ["A", "B", "C"];
  const intX = (v) => (Number.isInteger(v) ? v : "");
  const nameX = (v) => (Number.isInteger(v) && v >= 0 && v < 3 ? NAMES[v] : "");

  /* ------------------------------------------------ shared chain state */
  const PRESETS = {
    default: { label: "Generic (irreducible, aperiodic)", P: [[0.5, 0.3, 0.2], [0.2, 0.5, 0.3], [0.4, 0.1, 0.5]] },
    sticky: { label: "Sticky (slow mixing)", P: [[0.9, 0.05, 0.05], [0.1, 0.8, 0.1], [0.05, 0.15, 0.8]] },
    cycleish: { label: "Mostly rotates A→B→C", P: [[0.1, 0.8, 0.1], [0.1, 0.1, 0.8], [0.8, 0.1, 0.1]] },
    periodic: { label: "Periodic (A→B→C→A)", P: [[0, 1, 0], [0, 0, 1], [1, 0, 0]] },
    absorbing: { label: "Reducible: C absorbs", P: [[0.5, 0.5, 0], [0.3, 0.4, 0.3], [0, 0, 1]] },
    twoclass: { label: "Reducible: A and C both absorb", P: [[1, 0, 0], [0.3, 0.4, 0.3], [0, 0, 1]] },
  };
  const clone = (A) => A.map((r) => r.slice());
  const chain = { P: clone(PRESETS.default.P), subs: [] };
  chain.set = function (Pm, src) { chain.P = Pm; chain.subs.forEach((f) => f(src)); };

  function stationary(Pm) {
    const n = Pm.length, A = [], b = [];
    for (let j = 0; j < n - 1; j++) { A.push(Pm.map((row, i) => row[j] - (i === j ? 1 : 0))); b.push(0); }
    A.push(new Array(n).fill(1)); b.push(1);
    let x;
    try { x = m.solve(A, b); } catch (e) { return null; }
    if (x.some((v) => !isFinite(v) || v < -1e-7)) return null;
    for (let j = 0; j < n; j++) {
      let s = 0; for (let i = 0; i < n; i++) s += x[i] * Pm[i][j];
      if (Math.abs(s - x[j]) > 1e-6) return null;
    }
    return x.map((v) => Math.max(0, v));
  }
  const stepDist = (pi, Pm) => Pm[0].map((_, j) => pi.reduce((s, p, i) => s + p * Pm[i][j], 0));
  const cumRows = (Pm) => Pm.map((r) => { let s = 0; return r.map((v) => (s += v)); });
  const nextState = (cum, i) => { const u = Math.random() * cum[i][cum[i].length - 1]; let j = 0; while (j < cum[i].length - 1 && u >= cum[i][j]) j++; return j; };

  /* ------------------------------------------------ widget 1: graph + token */
  (function chainWidget() {
    const W = 440, H = 350, r = 26;
    const pos = [[220, 100], [96, 280], [344, 280]];
    const cen = [220, 220];
    let cur = 0, visits = [1, 0, 0], steps = 0, hop = null, running = false, speed = 2;
    let edgePaths = [], nodeEls = [], token = null, svg = null;

    // controls
    P.select("#mc-ctl", { label: "Preset", options: Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label })), value: "default",
      onChange: (k) => { chain.set(clone(PRESETS[k].P), "preset"); } });
    P.slider("#mc-ctl", { label: "speed (hops/s)", min: 0.5, max: 20, step: 0.5, value: speed, onInput: (v) => (speed = v) });
    const runBtn = P.button("#mc-ctl", "▶ Run", () => { running = !running; runBtn.textContent = running ? "⏸ Pause" : "▶ Run"; if (running) { if (!hop) startHop(); loop.start(); } });
    P.button("#mc-ctl", "Step", () => { if (!hop) { startHop(); loop.start(); } }, "ghost");
    P.button("#mc-ctl", "Reset counts", () => { visits = [0, 0, 0]; visits[cur] = 1; steps = 0; readout(); }, "ghost");

    // matrix editor
    const mx = P.el("table", { class: "mx" }, P.$("#mc-matrix"));
    const head = P.el("tr", {}, mx);
    P.el("th", { html: "from ↓ to →" }, head);
    NAMES.forEach((n, j) => { const th = P.el("th", { text: n }, head); th.style.color = P.color(SC[j]); });
    P.el("th", { text: "row sum" }, head);
    const inputs = [], sums = [];
    for (let i = 0; i < 3; i++) {
      const tr = P.el("tr", {}, mx);
      const th = P.el("th", { text: NAMES[i] }, tr); th.style.color = P.color(SC[i]);
      inputs.push([]);
      for (let j = 0; j < 3; j++) {
        const td = P.el("td", {}, tr);
        const inp = P.el("input", { type: "number", min: 0, step: 0.05, "aria-label": `P(${NAMES[i]}→${NAMES[j]})` }, td);
        inp.addEventListener("input", () => readMatrix(false));
        inp.addEventListener("change", () => readMatrix(true));
        inputs[i].push(inp);
      }
      sums.push(P.el("td", { class: "sum" }, tr));
    }
    P.el("div", { class: "msg", html: "Rows are rescaled to sum to 1." }, P.$("#mc-matrix"));
    function writeMatrix() {
      for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) inputs[i][j].value = +chain.P[i][j].toFixed(3); sums[i].textContent = "1"; }
    }
    function readMatrix(rewrite) {
      const Pm = inputs.map((row, i) => {
        const w = row.map((inp) => Math.max(0, +inp.value || 0)), s = P.sum(w);
        sums[i].textContent = P.fmt(s, 3);
        return s > 0 ? w.map((x) => x / s) : w.map((_, j) => (j === i ? 1 : 0));
      });
      chain.set(Pm, "editor");
      if (rewrite) writeMatrix();
    }

    // drawing
    const unit = (x, y) => { const L = Math.hypot(x, y) || 1; return [x / L, y / L]; };
    const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    function arrowHead(g, tip, dir, w, color) {
      const L = 7 + 1.4 * w, hw = 4 + 0.7 * w, perp = [-dir[1], dir[0]];
      const b = [tip[0] - dir[0] * L, tip[1] - dir[1] * L];
      svgEl("path", { d: `M${tip[0]},${tip[1]}L${b[0] + perp[0] * hw},${b[1] + perp[1] * hw}L${b[0] - perp[0] * hw},${b[1] - perp[1] * hw}Z`, style: `fill:${P.color(color)}` }, g);
    }
    function draw() {
      const el = P.$("#mc-graph"); el.innerHTML = "";
      svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "graph-svg" }, el);
      const ge = svgEl("g", {}, svg), gn = svgEl("g", {}, svg), gl = svgEl("g", {}, svg);
      edgePaths = [[], [], []];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const p = chain.P[i][j], w = 1 + 10 * p, col = SC[i];
        const g = svgEl("g", { style: `opacity:${p > 1e-9 ? 0.85 : 0}` }, ge);
        let d, lab, tip, dir;
        if (i === j) {
          const u = unit(pos[i][0] - cen[0], pos[i][1] - cen[1]);
          const a = rot(u, -0.55), b = rot(u, 0.55);
          const s = [pos[i][0] + a[0] * r, pos[i][1] + a[1] * r], e = [pos[i][0] + b[0] * r, pos[i][1] + b[1] * r];
          const c1 = [pos[i][0] + rot(u, -0.75)[0] * (r + 58), pos[i][1] + rot(u, -0.75)[1] * (r + 58)];
          const c2 = [pos[i][0] + rot(u, 0.75)[0] * (r + 58), pos[i][1] + rot(u, 0.75)[1] * (r + 58)];
          d = `M${s}C${c1} ${c2} ${e}`;
          tip = e; dir = unit(e[0] - c2[0], e[1] - c2[1]);
          lab = [pos[i][0] + u[0] * (r + 52), pos[i][1] + u[1] * (r + 52)];
        } else {
          const A = pos[i], B = pos[j], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
          const dv = unit(B[0] - A[0], B[1] - A[1]), nv = [-dv[1], dv[0]];
          const C = [M[0] + nv[0] * 34, M[1] + nv[1] * 34];
          const us = unit(C[0] - A[0], C[1] - A[1]), ue = unit(C[0] - B[0], C[1] - B[1]);
          const s = [A[0] + us[0] * r, A[1] + us[1] * r], e = [B[0] + ue[0] * r, B[1] + ue[1] * r];
          d = `M${s}Q${C} ${e}`;
          tip = e; dir = unit(e[0] - C[0], e[1] - C[1]);
          const mid = [0.25 * s[0] + 0.5 * C[0] + 0.25 * e[0], 0.25 * s[1] + 0.5 * C[1] + 0.25 * e[1]];
          lab = [mid[0] + nv[0] * 12, mid[1] + nv[1] * 12];
        }
        const path = svgEl("path", { d, style: `fill:none;stroke:${P.color(col)};stroke-width:${w};stroke-linecap:round` }, g);
        arrowHead(g, tip, dir, w, col);
        if (p > 1e-9) svgEl("text", { x: lab[0], y: lab[1] + 4, "text-anchor": "middle", style: `font-size:12px;font-weight:600;fill:${P.color(col)};paint-order:stroke;stroke:var(--panel);stroke-width:4px` }, gl).textContent = P.fmt(p, 2);
        edgePaths[i][j] = path;
      }
      nodeEls = pos.map((q, i) => {
        const c = svgEl("circle", { cx: q[0], cy: q[1], r, style: `fill:var(--panel);stroke:${P.color(SC[i])};stroke-width:2.5` }, gn);
        svgEl("circle", { cx: q[0], cy: q[1], r, style: `fill:${P.color(SC[i])};opacity:.15` }, gn);
        svgEl("text", { x: q[0], y: q[1] + 6, "text-anchor": "middle", style: "font-size:18px;font-weight:700" }, gn).textContent = NAMES[i];
        return c;
      });
      token = svgEl("circle", { r: 8, style: "fill:var(--c4);stroke:var(--panel);stroke-width:2" }, svg);
      placeToken(pos[cur]);
      highlight();
    }
    function placeToken(q) { token.setAttribute("cx", q[0] + r * 0.72); token.setAttribute("cy", q[1] - r * 0.72); } // rest on the node rim, clear of its label
    function highlight() { nodeEls.forEach((c, i) => c.style.strokeWidth = i === cur ? 6 : 2.5); }

    function startHop() {
      const to = nextState(cumRows(chain.P), cur);
      const path = edgePaths[cur][to];
      hop = { to, path, len: path.getTotalLength(), u: 0 };
    }
    const loop = P.loop((dt) => {
      if (!hop) return false;
      hop.u += dt / (1000 / speed);
      if (hop.u >= 1) {
        cur = hop.to; steps++; visits[cur]++; hop = null;
        placeToken(pos[cur]); highlight(); readout();
        if (running) { startHop(); return true; }
        return false;
      }
      const pt = hop.path.getPointAtLength(hop.u * hop.len);
      token.setAttribute("cx", pt.x); token.setAttribute("cy", pt.y);
      return true;
    });
    function readout() {
      const pi = stationary(chain.P), tot = P.sum(visits);
      const items = [{ label: "steps", value: steps }, { label: "now at", value: NAMES[cur], color: SC[cur] }];
      NAMES.forEach((n, i) => items.push({ label: `visits to ${n}:`, value: P.pct(visits[i] / tot, 1), color: SC[i] }));
      if (pi) items.push({ label: "stationary $\\pi$ =", value: "(" + pi.map((v) => P.fmt(v, 3)).join(", ") + ")" });
      else items.push({ label: "stationary $\\pi$:", value: "not unique" });
      P.readout("#mc-read", items);
    }
    chain.subs.push((src) => {
      loop.stop(); hop = null;
      if (src !== "editor") writeMatrix();
      visits = [0, 0, 0]; visits[cur] = 1; steps = 0;
      draw(); readout();
      if (running) { startHop(); loop.start(); }
    });
    writeMatrix(); draw(); readout();
  })();

  /* ------------------------------------------------ widget 2: convergence */
  (function convWidget() {
    let start = 0, T = 30, tSel = 5, emp = null;
    P.select("#cv-ctl", { label: "start state", options: NAMES.map((n, i) => ({ value: i, label: n })), value: 0, onChange: (v) => { start = +v; simulate(); draw(); } });
    P.slider("#cv-ctl", { label: "time t", min: 0, max: T, value: tSel, onInput: (v) => { tSel = v; draw(); } });
    P.button("#cv-ctl", "Re-simulate run", () => { simulate(); draw(); }, "ghost");
    P.legend("#cv-legend", [
      { label: "πₜ(A)", color: "c1" }, { label: "πₜ(B)", color: "c2" }, { label: "πₜ(C)", color: "c3" }, { label: "stationary π", color: "c6", dash: true },
      { label: "bars: πₜ at chosen t", color: "c5" }, { label: "bars: stationary π", color: "c6" }, { label: "bars: simulated time fraction (20,000 steps)", color: "c4" },
    ]);
    function simulate() {
      const cum = cumRows(chain.P), cnt = [0, 0, 0], N = 20000;
      let s = start;
      for (let t = 0; t < N; t++) { cnt[s]++; s = nextState(cum, s); }
      emp = cnt.map((c) => c / N);
    }
    function draw() {
      const pi = stationary(chain.P);
      const traj = [[0, 0, 0]]; traj[0][start] = 1;
      for (let t = 1; t <= 200; t++) traj.push(stepDist(traj[t - 1], chain.P));
      // lines
      const L = P.$("#cv-lines"); L.innerHTML = "";
      const c = P.chart(L, { x: [0, T], y: [0, 1.02], height: 260, width: 360, xLabel: "time t", yLabel: "P(Xₜ = state)", xTickCount: 6 });
      c.vline(tSel, { color: "c6", dash: true });
      for (let i = 0; i < 3; i++) {
        if (pi) c.hline(pi[i], { color: SC[i], width: 1.2 });
        c.line(traj.slice(0, T + 1).map((d, t) => [t, d[i]]), { color: SC[i], width: 2 });
        c.dots([[tSel, traj[tSel][i]]], { color: SC[i], r: 4.5 });
      }
      // bars
      const B = P.$("#cv-bars"); B.innerHTML = "";
      const cb = P.chart(B, { x: [-0.6, 2.6], y: [0, 1.02], height: 260, width: 360, xLabel: "state", xTicks: [0, 1, 2], xFormat: nameX });
      cb.bars(traj[tSel].map((y, i) => ({ x: i, y, title: `π_t(${NAMES[i]}) = ${P.fmt(y, 4)}` })), { color: "c5", w: 0.26, offset: -0.28 });
      if (pi) cb.bars(pi.map((y, i) => ({ x: i, y, title: `π(${NAMES[i]}) = ${P.fmt(y, 4)}` })), { color: "c6", w: 0.26, offset: 0 });
      if (emp) cb.bars(emp.map((y, i) => ({ x: i, y, title: `time fraction ${P.fmt(y, 4)}` })), { color: "c4", w: 0.26, offset: 0.28 });
      // readout
      const items = [{ label: `$\\pi_{${tSel}}$ =`, value: "(" + traj[tSel].map((v) => P.fmt(v, 3)).join(", ") + ")", color: "c5" }];
      if (pi) {
        items.push({ label: "$\\pi$ =", value: "(" + pi.map((v) => P.fmt(v, 3)).join(", ") + ")" });
        const tv = (t) => 0.5 * P.sum(traj[t].map((v, i) => Math.abs(v - pi[i])));
        items.push({ label: `distance $\\tfrac12\\|\\pi_{${tSel}}-\\pi\\|_1$ =`, value: P.fmt(tv(tSel), 4) });
        if (tv(200) > 1e-3) items.push({ label: "⚠️", value: "πₜ never settles: the chain is periodic (time averages still → π)", color: "c4" });
      } else items.push({ label: "⚠️", value: "πP = π has many solutions: the chain is reducible, so where you end up depends on the start", color: "c4" });
      items.push({ label: "simulated", value: "(" + emp.map((v) => P.fmt(v, 3)).join(", ") + ")", color: "c4" });
      P.readout("#cv-read", items);
    }
    chain.subs.push(() => { simulate(); draw(); });
    simulate(); draw();
  })();

  /* ------------------------------------------------ widget 3: return times */
  (function returnWidget() {
    let sel = 0, gaps = null;
    P.select("#rt-ctl", { label: "histogram for state", options: NAMES.map((n, i) => ({ value: i, label: n })), value: 0, onChange: (v) => { sel = +v; draw(); } });
    P.button("#rt-ctl", "Re-run 200,000 steps", () => { simulate(); draw(); }, "ghost");
    function simulate() {
      const cum = cumRows(chain.P), last = [-1, -1, -1], N = 200000;
      gaps = [[], [], []];
      let s = 0;
      for (let t = 0; t < N; t++) { if (last[s] >= 0) gaps[s].push(t - last[s]); last[s] = t; s = nextState(cum, s); }
    }
    function draw() {
      const pi = stationary(chain.P);
      const sim = gaps.map((g) => (g.length ? P.mean(g) : NaN));
      const theo = pi ? pi.map((v) => (v > 1e-9 ? 1 / v : Infinity)) : [NaN, NaN, NaN];
      const fin = [...sim, ...theo].filter((v) => isFinite(v));
      const ymax = (fin.length ? Math.max(...fin) : 5) * 1.25;
      const B = P.$("#rt-bars"); B.innerHTML = "";
      const c = P.chart(B, { x: [-0.6, 2.6], y: [0, ymax], height: 240, width: 360, xLabel: "state", yLabel: "mean return time", xTicks: [0, 1, 2], xFormat: nameX });
      c.bars(sim.map((y, i) => ({ x: i, y: isFinite(y) ? y : 0, color: SC[i], title: `simulated ${P.fmt(y, 3)}` })), { w: 0.5, opacity: 0.6 });
      c.dots(theo.map((y, i) => [i, y]).filter(([, y]) => isFinite(y)), { color: "c4", r: 6, stroke: "var(--panel)" });
      sim.forEach((y, i) => { if (!isFinite(y)) c.text(i, ymax * 0.1, "never returns", { size: 11, color: SC[i] }); });
      // histogram
      const H = P.$("#rt-hist"); H.innerHTML = "";
      const g = gaps[sel];
      if (!g.length) { H.innerHTML = `<p class="muted small">State ${NAMES[sel]} is never revisited (it is transient, or never reached from A).</p>`; }
      else {
        const sorted = g.slice().sort((a, b) => a - b), K = Math.max(5, Math.min(60, sorted[Math.floor(0.98 * (sorted.length - 1))]));
        const cs = P.counts(g, 1, K);
        const ch = P.chart(H, { x: [0.3, K + 0.7], y: [0, Math.max(...cs.map((o) => o.freq)) * 1.2], height: 240, width: 360, xLabel: `return time to ${NAMES[sel]}`, yLabel: "fraction", xFormat: intX });
        ch.bars(cs.map((o) => ({ x: o.x, y: o.freq })), { color: SC[sel], w: 0.75 });
        if (isFinite(sim[sel])) ch.vline(Math.min(sim[sel], K), { color: "c4", label: "mean" });
      }
      const items = [];
      NAMES.forEach((n, i) => items.push({ label: `${n}: simulated`, value: P.fmt(sim[i], 3), color: SC[i] }, { label: `vs $1/\\pi_${n}$ =`, value: P.fmt(theo[i], 3), color: "c4" }));
      P.readout("#rt-read", items);
    }
    chain.subs.push(() => { simulate(); draw(); });
    simulate(); draw();
  })();

  /* ------------------------------------------------ widget 4: absorption on a line */
  (function absorbWidget() {
    let N = 6, p = 0.5, sim = null;
    P.slider("#ab-ctl", { label: "N", min: 2, max: 14, value: N, onInput: (v) => { N = v; sim = null; draw(); } });
    P.slider("#ab-ctl", { label: "p (step right)", min: 0.05, max: 0.95, step: 0.05, value: p, onInput: (v) => { p = v; sim = null; draw(); } });
    P.button("#ab-ctl", "Simulate 3,000 walks per start", () => { simulate(); draw(); });
    P.button("#ab-ctl", "Clear", () => { sim = null; draw(); }, "ghost");
    P.legend("#ab-legend", [{ label: "solved from the linear system", color: "c1" }, { label: "closed form", color: "c2" }, { label: "simulation", color: "c4" }]);

    function solveChain() {
      const n = N - 1, A = [], bh = [], bq = [];
      for (let r = 0; r < n; r++) {
        const row = new Array(n).fill(0), i = r + 1;
        row[r] = 1;
        if (i + 1 <= N - 1) row[r + 1] -= p;
        if (i - 1 >= 1) row[r - 1] -= 1 - p;
        A.push(row); bh.push(1); bq.push(i + 1 === N ? p : 0);
      }
      const h = [0, ...m.solve(A, bh), 0], q = [0, ...m.solve(A, bq), 1];
      return { h, q };
    }
    function closed(i) {
      if (Math.abs(p - 0.5) < 1e-9) return { h: i * (N - i), q: i / N };
      const rr = (1 - p) / p, q = (1 - Math.pow(rr, i)) / (1 - Math.pow(rr, N));
      return { h: (N * q - i) / (2 * p - 1), q };
    }
    function simulate() {
      sim = { h: [0], q: [0] };
      const R = 3000;
      for (let i = 1; i < N; i++) {
        let tot = 0, win = 0;
        for (let k = 0; k < R; k++) { let x = i, t = 0; while (x > 0 && x < N) { x += Math.random() < p ? 1 : -1; t++; } tot += t; if (x === N) win++; }
        sim.h.push(tot / R); sim.q.push(win / R);
      }
      sim.h.push(0); sim.q.push(1);
    }
    function lineDiagram() {
      const el = P.$("#ab-line"); el.innerHTML = "";
      const W = 640, H = 74, x0 = 30, dx = (W - 60) / N, y = 40, rad = Math.min(13, dx * 0.32);
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "graph-svg" }, el);
      for (let i = 1; i < N; i++) {
        const cx = x0 + i * dx;
        const wr = 1 + 5 * p, wl = 1 + 5 * (1 - p);
        svgEl("path", { d: `M${cx + rad * 0.7},${y - rad * 0.7} Q${cx + dx / 2},${y - rad - 14} ${cx + dx - rad * 0.8},${y - rad * 0.6}`, style: `fill:none;stroke:var(--c3);stroke-width:${wr};opacity:.8` }, svg);
        svgEl("path", { d: `M${cx - rad * 0.7},${y + rad * 0.7} Q${cx - dx / 2},${y + rad + 14} ${cx - dx + rad * 0.8},${y + rad * 0.6}`, style: `fill:none;stroke:var(--c4);stroke-width:${wl};opacity:.8` }, svg);
      }
      if (N >= 2) {
        const cx = x0 + dx;
        svgEl("text", { x: cx + dx / 2, y: y - rad - 14, "text-anchor": "middle", style: "font-size:11px;fill:var(--c3);font-weight:600" }, svg).textContent = `p=${P.fmt(p, 2)}`;
        svgEl("text", { x: cx - dx / 2, y: y + rad + 26, "text-anchor": "middle", style: "font-size:11px;fill:var(--c4);font-weight:600" }, svg).textContent = `1−p=${P.fmt(1 - p, 2)}`;
      }
      for (let i = 0; i <= N; i++) {
        const cx = x0 + i * dx, abs = i === 0 || i === N;
        if (abs) svgEl("rect", { x: cx - rad, y: y - rad, width: 2 * rad, height: 2 * rad, rx: 3, style: "fill:var(--c6);opacity:.35;stroke:var(--c6);stroke-width:2" }, svg);
        else svgEl("circle", { cx, cy: y, r: rad, style: "fill:var(--panel);stroke:var(--c1);stroke-width:2" }, svg);
        svgEl("text", { x: cx, y: y + 4, "text-anchor": "middle", style: "font-size:12px;font-weight:700" }, svg).textContent = i;
      }
    }
    function equations() {
      const pp = P.fmt(p, 2), qq = P.fmt(1 - p, 2);
      const row = (i) => `h_{${i}} &= 1 + ${pp}\\,h_{${i + 1}} + ${qq}\\,h_{${i - 1}} &\\qquad q_{${i}} &= ${pp}\\,q_{${i + 1}} + ${qq}\\,q_{${i - 1}}`;
      const lines = [`h_0 &= 0 &\\qquad q_0 &= 0`];
      if (N - 1 <= 5) for (let i = 1; i < N; i++) lines.push(row(i));
      else { lines.push(row(1), row(2), `&\\ \\ \\vdots && \\ \\ \\vdots`, row(N - 1)); }
      lines.push(`h_{${N}} &= 0 &\\qquad q_{${N}} &= 1`);
      P.tex("#ab-eqs", `\\begin{aligned}${lines.join("\\\\")}\\end{aligned}`, true);
    }
    function draw() {
      lineDiagram(); equations();
      const { h, q } = solveChain();
      const cl = P.range(0, N).map(closed);
      const hmax = Math.max(...h, ...(sim ? sim.h : [0])) * 1.2 || 1;
      const Hc = P.$("#ab-h"); Hc.innerHTML = "";
      const c = P.chart(Hc, { x: [-0.6, N + 0.6], y: [0, hmax], height: 230, width: 360, xLabel: "start i", yLabel: "expected steps hᵢ", xFormat: intX, xTicks: N <= 10 ? P.range(0, N) : undefined });
      c.bars(h.map((y, i) => ({ x: i, y, title: `h_${i} = ${P.fmt(y, 4)}` })), { color: "c1", w: 0.6, opacity: 0.6 });
      c.dots(cl.map((o, i) => [i, o.h]), { color: "c2", r: 4 });
      if (sim) c.dots(sim.h.map((y, i) => [i, y]), { color: "c4", r: 3, opacity: 0.9 });
      const Qc = P.$("#ab-q"); Qc.innerHTML = "";
      const cq = P.chart(Qc, { x: [-0.6, N + 0.6], y: [0, 1.05], height: 230, width: 360, xLabel: "start i", yLabel: "P(end at N) = qᵢ", xFormat: intX, xTicks: N <= 10 ? P.range(0, N) : undefined });
      cq.bars(q.map((y, i) => ({ x: i, y, title: `q_${i} = ${P.fmt(y, 4)}` })), { color: "c1", w: 0.6, opacity: 0.6 });
      cq.dots(cl.map((o, i) => [i, o.q]), { color: "c2", r: 4 });
      if (sim) cq.dots(sim.q.map((y, i) => [i, y]), { color: "c4", r: 3, opacity: 0.9 });
      const fair = Math.abs(p - 0.5) < 1e-9;
      const mid = Math.floor(N / 2);
      P.readout("#ab-read", [
        { label: "closed form:", value: "" },
        { label: fair ? "$h_i=i(N-i),\\ q_i=\\tfrac iN$" : "$q_i=\\frac{1-r^i}{1-r^N},\\ r=\\frac{1-p}{p};\\ \\ h_i=\\frac{Nq_i-i}{2p-1}$", value: "" },
        { label: `$h_{${mid}}$ =`, value: P.fmt(h[mid], 4), color: "c1" },
        { label: `$q_{${mid}}$ =`, value: P.fmt(q[mid], 4), color: "c1" },
      ]);
    }
    draw();
  })();

  /* ------------------------------------------------ widget 5: hitting time on symmetric graphs */
  (function cycleWidget() {
    let type = "cycle", n = 8, hist = null, walk = null;
    const W = 360, H = 300, cx = 180, cy = 150, Rr = 112;
    let token = null, posArr = [], label = null, nodeEls = [];
    P.select("#cy-ctl", { label: "graph", options: [{ value: "cycle", label: "cycle Cₙ" }, { value: "complete", label: "complete Kₙ" }, { value: "star", label: "star (not symmetric)" }], value: type, onChange: (v) => { type = v; reset(); } });
    P.slider("#cy-ctl", { label: "n nodes", min: 3, max: 16, value: n, onInput: (v) => { n = v; reset(); } });
    const animBtn = P.button("#cy-ctl", "▶ Animate one walk", () => { if (loop.running) { loop.stop(); animBtn.textContent = "▶ Animate one walk"; } else startWalk(); });
    P.button("#cy-ctl", "Simulate 5,000", () => { simulate(); drawHist(); }, "ghost");

    const START = 0, TARGET = 1;
    function nbrs(v) {
      if (type === "cycle") return [(v + 1) % n, (v - 1 + n) % n];
      if (type === "complete") return P.range(0, n - 1).filter((u) => u !== v);
      return v === 0 ? P.range(1, n - 1) : [0]; // star: 0 = center
    }
    function exact() { return type === "star" ? 2 * n - 3 : n - 1; }
    function positions() {
      if (type === "star") return [[cx, cy], ...P.range(1, n - 1).map((k) => { const a = -Math.PI / 2 + (2 * Math.PI * (k - 1)) / (n - 1); return [cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)]; })];
      return P.range(0, n - 1).map((k) => { const a = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * k) / n; return [cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)]; });
    }
    function drawGraph() {
      const el = P.$("#cy-graph"); el.innerHTML = "";
      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "graph-svg" }, el);
      posArr = positions();
      const ge = svgEl("g", {}, svg);
      for (let v = 0; v < n; v++) for (const u of nbrs(v)) if (u > v) svgEl("line", { x1: posArr[v][0], y1: posArr[v][1], x2: posArr[u][0], y2: posArr[u][1], style: `stroke:var(--c6);stroke-width:${type === "complete" ? 1 : 2};opacity:${type === "complete" ? 0.45 : 0.8}` }, ge);
      const rad = n > 12 ? 10 : 13;
      nodeEls = posArr.map((q, v) => {
        const col = v === START ? "c2" : v === TARGET ? "c3" : "c6";
        const c = svgEl("circle", { cx: q[0], cy: q[1], r: rad, style: `fill:${v === START || v === TARGET ? P.color(col) : "var(--panel)"};stroke:${P.color(col)};stroke-width:2` }, svg);
        return c;
      });
      svgEl("text", { x: posArr[START][0], y: posArr[START][1] + (type === "star" ? 30 : 0) - (type === "star" ? 0 : 20), "text-anchor": "middle", style: "font-size:11px;font-weight:700;fill:var(--c2)" }, svg).textContent = "start";
      svgEl("text", { x: posArr[TARGET][0], y: posArr[TARGET][1] - 18, "text-anchor": "middle", style: "font-size:11px;font-weight:700;fill:var(--c3)" }, svg).textContent = "target";
      token = svgEl("circle", { cx: posArr[START][0], cy: posArr[START][1], r: 7, style: "fill:var(--c4);stroke:var(--panel);stroke-width:2" }, svg);
      label = svgEl("text", { x: W / 2, y: H - 4, "text-anchor": "middle", style: "font-size:13px;font-weight:600" }, svg);
      label.textContent = "";
    }
    function startWalk() {
      walk = { at: START, to: null, u: 0, steps: 0 };
      token.setAttribute("cx", posArr[START][0]); token.setAttribute("cy", posArr[START][1]);
      animBtn.textContent = "⏸ Stop";
      loop.start();
    }
    const loop = P.loop((dt) => {
      if (!walk) return false;
      if (walk.to === null) { walk.to = P.rand.choice(nbrs(walk.at)); walk.u = 0; }
      walk.u += dt / 220;
      const a = posArr[walk.at], b = posArr[walk.to], u = Math.min(1, walk.u);
      token.setAttribute("cx", a[0] + (b[0] - a[0]) * u); token.setAttribute("cy", a[1] + (b[1] - a[1]) * u);
      if (walk.u >= 1) {
        walk.at = walk.to; walk.to = null; walk.steps++;
        label.textContent = `steps: ${walk.steps}`;
        if (walk.at === TARGET) { label.textContent = `hit the target after ${walk.steps} steps`; walk = null; return false; }
        if (walk.steps > 400) { label.textContent = "stopped after 400 steps"; walk = null; return false; }
      }
      return true;
    });
    loop.onstop = () => (animBtn.textContent = "▶ Animate one walk");
    function simulate() {
      const Nn = 5000, out = new Array(Nn);
      const nb = P.range(0, n - 1).map(nbrs);
      for (let k = 0; k < Nn; k++) {
        let v = START, t = 0;
        while (v !== TARGET && t < 1e5) { const a = nb[v]; v = a[Math.floor(Math.random() * a.length)]; t++; }
        out[k] = t;
      }
      hist = out;
    }
    function drawHist() {
      const el = P.$("#cy-hist"); el.innerHTML = "";
      const ex = exact();
      if (!hist) {
        el.innerHTML = '<p class="muted small" style="margin-top:2em">Click <b>Simulate 5,000</b> to estimate the expected hitting time.</p>';
        P.readout("#cy-read", [{ label: "$n-1$ =", value: n - 1, color: "c3" }, { label: "exact answer", value: ex, color: "c2" }]);
        return;
      }
      const sorted = hist.slice().sort((a, b) => a - b), K = Math.max(8, Math.min(120, sorted[Math.floor(0.95 * (sorted.length - 1))]));
      const cs = P.counts(hist, 1, K), mean = P.mean(hist);
      const c = P.chart(el, { x: [0.3, K + 0.7], y: [0, Math.max(...cs.map((o) => o.freq)) * 1.25], height: 300, width: 360, xLabel: "hitting time", yLabel: "fraction", xFormat: intX });
      c.bars(cs.map((o) => ({ x: o.x, y: o.freq })), { color: "c5", w: 0.8, opacity: 0.7 });
      if (n - 1 <= K) c.vline(n - 1, { color: "c3", label: "n−1" });
      if (mean <= K) c.vline(mean, { color: "c4", label: "mean", dash: false });
      P.readout("#cy-read", [
        { label: "simulated mean", value: P.fmt(mean, 3), color: "c4" },
        { label: "$n-1$ =", value: n - 1, color: "c3" },
        { label: type === "star" ? "exact (center → leaf) $2n-3$ =" : "exact", value: ex, color: "c2" },
      ]);
    }
    function reset() { loop.stop(); walk = null; hist = null; drawGraph(); drawHist(); }
    reset();
  })();
})();

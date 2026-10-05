/* Widgets for puzzles.html */
(function () {
  const { m, rand: R, svgEl: S } = P;
  const col = (c) => P.color(c);
  // update a P.slider's max (lib has no API for it)
  function setMax(sl, max) {
    const inp = sl.el.querySelector("input");
    inp.max = max;
    sl.set(Math.min(+inp.value, max), false);
  }
  function svgBox(el, W, H) {
    el = P.$(el); el.innerHTML = "";
    return S("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet" }, el);
  }
  function txt(parent, x, y, s, o = {}) {
    const t = S("text", { x, y, "text-anchor": o.anchor || "middle", style: `fill:${col(o.color || "var(--muted)")};font-size:${o.size || 12}px;font-weight:${o.weight || 500}` }, parent);
    t.textContent = s; return t;
  }
  // polygon band in data coords
  function band(c, xs, lo, hi, color, opacity) {
    let d = "";
    xs.forEach((x, i) => (d += `${i ? "L" : "M"}${c.sx(x).toFixed(1)},${c.sy(hi[i]).toFixed(1)}`));
    for (let i = xs.length - 1; i >= 0; i--) d += `L${c.sx(xs[i]).toFixed(1)},${c.sy(lo[i]).toFixed(1)}`;
    return S("path", { d: d + "Z", style: `fill:${col(color)};opacity:${opacity};stroke:none` }, c.g);
  }

  /* ================================================= BIRTHDAY */
  (function birthday() {
    const d = 365;
    let n = 23, room = null, sim = { rooms: 0, hits: 0 };
    const exact = (n) => { let q = 1; for (let i = 0; i < n; i++) q *= (d - i) / d; return 1 - q; };
    const approx = (n) => 1 - Math.exp((-n * (n - 1)) / (2 * d));
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const MLEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const MSTART = MLEN.reduce((a, l, i) => (a.push(i ? a[i - 1] + MLEN[i - 1] : 0), a), []);
    const dayName = (i) => { let k = 11; while (MSTART[k] > i) k--; return `${MONTHS[k]} ${i - MSTART[k] + 1}`; };

    P.slider("#bd-ctl", { label: "people n", min: 1, max: 80, value: n, onInput: (v) => { n = v; room = null; sim = { rooms: 0, hits: 0 }; draw(); } });
    P.button("#bd-ctl", "New room", () => { newRoom(); draw(); });
    P.button("#bd-ctl", "Simulate 2,000 rooms", () => {
      for (let r = 0; r < 2000; r++) {
        const seen = new Uint8Array(d); let hit = 0;
        for (let i = 0; i < n; i++) { const b = (Math.random() * d) | 0; if (seen[b]) { hit = 1; break; } seen[b] = 1; }
        sim.rooms++; sim.hits += hit;
      }
      newRoom(); draw();
    }, "ghost");

    function newRoom() { room = Array.from({ length: n }, () => (Math.random() * d) | 0); }

    function draw() {
      const el = P.$("#bd-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0, 80], y: [0, 1], height: 250, xLabel: "number of people n", yLabel: "P(shared birthday)", yFormat: (v) => Math.round(v * 100) + "%" });
      const xs = P.range(1, 80);
      c.line(xs.map((x) => [x, approx(x)]), { color: "c2", dash: true, width: 1.8 });
      c.line(xs.map((x) => [x, exact(x)]), { color: "c1" });
      c.hline(0.5, { color: "c6" });
      c.vline(23, { color: "c4", label: "23 → 50.7%" });
      if (sim.rooms) c.dots([[n, sim.hits / sim.rooms]], { color: "c3", r: 6 });
      c.dots([[n, exact(n)]], { color: "c1", r: 5.5, stroke: "var(--panel)" });
      P.legend(el, [{ color: "c1", label: "exact" }, { color: "c2", label: "1 − e^(−n(n−1)/2d)", dash: true }, ...(sim.rooms ? [{ color: "c3", label: "simulated" }] : [])]);

      // calendar: 53 weeks x 7 days
      const cs = 12, gap = 2, W = 53 * (cs + gap) + 10, H = 7 * (cs + gap) + 26;
      const svg = svgBox("#bd-cal", W, H);
      const counts = new Array(d).fill(0);
      if (room) room.forEach((b) => counts[b]++);
      MSTART.forEach((s, k) => txt(svg, 5 + Math.floor(s / 7) * (cs + gap), 12, MONTHS[k], { anchor: "start", size: 10 }));
      for (let i = 0; i < d; i++) {
        const x = 5 + Math.floor(i / 7) * (cs + gap), y = 18 + (i % 7) * (cs + gap);
        const cnt = counts[i];
        const r = S("rect", { x, y, width: cs, height: cs, rx: 2, style: `fill:${cnt === 0 ? "var(--line)" : cnt === 1 ? col("c1") : col("c4")};opacity:${cnt ? 1 : 0.6}` }, svg);
        S("title", {}, r).textContent = `${dayName(i)}: ${cnt} ${cnt === 1 ? "person" : "people"}`;
        if (cnt >= 2) txt(svg, x + cs / 2, y + cs - 2.5, cnt, { size: 9, weight: 700, color: "var(--panel)" });
      }
      const st = P.$("#bd-status");
      if (!room) st.innerHTML = '<span class="muted">Click <b>New room</b> to seat ' + n + " people.</span>";
      else {
        const shared = counts.map((c, i) => [c, i]).filter(([c]) => c >= 2);
        st.innerHTML = shared.length
          ? `<b>${shared.length} shared birthday${shared.length > 1 ? "s" : ""}:</b> ` + shared.map(([c, i]) => `${dayName(i)} (${c})`).join(", ")
          : "No shared birthdays in this room.";
      }
      P.readout("#bd-read", [
        { label: "n =", value: n },
        { label: "pairs $\\binom n2$ =", value: (n * (n - 1)) / 2 },
        { label: "exact P =", value: P.pct(exact(n)), color: "c1" },
        { label: "approx =", value: P.pct(approx(n)), color: "c2" },
        { label: "simulated =", value: sim.rooms ? `${P.pct(sim.hits / sim.rooms)} (${sim.rooms} rooms)` : "—", color: "c3" },
      ]);
    }
    newRoom(); draw();
  })();

  /* ================================================= GAMBLER'S RUIN */
  (function gambler() {
    let a = 10, N = 20, p = 0.5;
    let paths = [], cur = null, stats = { games: 0, wins: 0, steps: 0 };
    const fair = () => Math.abs(p - 0.5) < 1e-9;
    const winP = (i) => { if (fair()) return i / N; const r = (1 - p) / p; return (1 - r ** i) / (1 - r ** N); };
    const dur = (i) => (fair() ? i * (N - i) : i / (1 - 2 * p) - (N / (1 - 2 * p)) * winP(i));
    const reset = () => { loop.stop(); cur = null; paths = []; stats = { games: 0, wins: 0, steps: 0 }; draw(); };

    const slA = P.slider("#gr-ctl", { label: "start a", min: 1, max: N - 1, value: a, onInput: (v) => { a = v; reset(); } });
    P.slider("#gr-ctl", { label: "target N", min: 2, max: 50, value: N, onInput: (v) => { N = v; setMax(slA, N - 1); a = slA.value; reset(); } });
    P.slider("#gr-ctl", { label: "win prob p", min: 0.4, max: 0.6, step: 0.01, value: p, format: (v) => v.toFixed(2), onInput: (v) => { p = v; reset(); } });

    function finish(path) {
      const w = path[path.length - 1] === N;
      stats.games++; stats.wins += w; stats.steps += path.length - 1;
      paths.push(path); if (paths.length > 12) paths.shift();
    }
    function playOne() { let x = a; const path = [x]; while (x > 0 && x < N) { x += Math.random() < p ? 1 : -1; path.push(x); } return path; }

    const loop = P.loop(() => {
      if (!cur) return false;
      const k = Math.max(1, Math.ceil(dur(a) / 150));
      for (let j = 0; j < k; j++) {
        const x = cur[cur.length - 1];
        if (x <= 0 || x >= N) { finish(cur); cur = null; draw(); return false; }
        cur.push(x + (Math.random() < p ? 1 : -1));
      }
      draw();
    });
    P.button("#gr-btn", "Play 1 game", () => { if (cur) return; cur = [a]; loop.start(); });
    P.button("#gr-btn", "Run 2,000 games", () => {
      loop.stop(); cur = null;
      for (let g = 0; g < 2000; g++) {
        if (g >= 1988) { finish(playOne()); continue; }
        let x = a, t = 0; while (x > 0 && x < N) { x += Math.random() < p ? 1 : -1; t++; }
        stats.games++; stats.wins += x === N; stats.steps += t;
      }
      draw();
    });
    P.button("#gr-btn", "Reset", reset, "ghost");

    function pathPts(path) {
      const stride = Math.max(1, Math.floor(path.length / 600));
      const pts = [];
      for (let t = 0; t < path.length; t += stride) pts.push([t, path[t]]);
      pts.push([path.length - 1, path[path.length - 1]]);
      return pts;
    }
    function draw() {
      const el = P.$("#gr-chart"); el.innerHTML = "";
      let T = Math.max(20, Math.ceil(dur(a) * 2.2));
      for (const pth of paths) T = Math.max(T, pth.length);
      if (cur) T = Math.max(T, cur.length);
      const c = P.chart(el, { x: [0, T], y: [-0.5, N + 0.5], height: 250, xLabel: "round", yLabel: "wealth", yTicks: N <= 10 ? P.range(0, N) : [0, Math.round(N / 2), N] });
      c.rect(0, N, T, N + 0.5, { color: "c3", opacity: 0.15 });
      c.rect(0, -0.5, T, 0, { color: "c4", opacity: 0.15 });
      c.hline(N, { color: "c3", label: "win (N)" });
      c.hline(0, { color: "c4", label: "ruin (0)" });
      c.hline(a, { color: "c6", dash: true, width: 1 });
      paths.forEach((pth, i) => c.line(pathPts(pth), { color: pth[pth.length - 1] === N ? "c3" : "c4", width: 1.3, opacity: cur || i < paths.length - 1 ? 0.3 : 0.85 }));
      if (cur) c.line(pathPts(cur), { color: "c1", width: 2 });

      const el2 = P.$("#gr-curve"); el2.innerHTML = "";
      const c2 = P.chart(el2, { x: [0, N], y: [0, 1], height: 190, xLabel: "starting wealth i", yLabel: "P(reach N)", yFormat: (v) => Math.round(v * 100) + "%" });
      c2.line(P.range(0, N).map((i) => [i, i / N]), { color: "c6", dash: true, width: 1.3 });
      c2.line(P.range(0, N).map((i) => [i, winP(i)]), { color: "c1" });
      c2.dots([[a, winP(a)]], { color: "c1", r: 4.5 });
      if (stats.games) c2.dots([[a, stats.wins / stats.games]], { color: "c2", r: 5.5, stroke: "var(--panel)" });
      if (!fair()) c2.text(N * 0.03, 0.9, "dashed = fair game a/N", { anchor: "start", size: 11, color: "var(--muted)" });

      P.readout("#gr-read", [
        { label: "games", value: stats.games },
        { label: "win rate", value: stats.games ? P.pct(stats.wins / stats.games) : "—", color: "c2" },
        { label: fair() ? "theory $a/N$ =" : "theory $\\frac{1-(q/p)^a}{1-(q/p)^N}$ =", value: P.pct(winP(a)), color: "c1" },
        { label: "avg rounds", value: stats.games ? P.fmt(stats.steps / stats.games, 1) : "—", color: "c2" },
        { label: fair() ? "theory $a(N-a)$ =" : "theory $\\E[T]$ =", value: P.fmt(dur(a), 1), color: "c1" },
      ]);
    }
    draw(); cur = [a]; loop.start();
  })();

  /* ================================================= RANDOM WALK */
  (function walk() {
    const NS = [50, 100, 200, 500, 1000, 2000];
    let n = 200, K = 100, p = 0.5, walks = [], t = 0;
    const loop = P.loop(() => { t = Math.min(n, t + Math.ceil(n / 80)); draw(); if (t >= n) return false; });
    const gen = () => {
      walks = Array.from({ length: K }, () => {
        const w = new Int16Array(n + 1);
        for (let i = 1; i <= n; i++) w[i] = w[i - 1] + (Math.random() < p ? 1 : -1);
        return w;
      });
      t = 0; loop.start();
    };
    P.slider("#rw-ctl", { label: "steps n", min: 0, max: NS.length - 1, value: 2, format: (i) => NS[i], onInput: (i) => { n = NS[i]; gen(); } });
    P.slider("#rw-ctl", { label: "walks", min: 1, max: 200, value: K, onInput: (v) => { K = v; gen(); } });
    P.slider("#rw-ctl", { label: "p (up)", min: 0.3, max: 0.7, step: 0.01, value: p, format: (v) => v.toFixed(2), onInput: (v) => { p = v; gen(); } });
    P.button("#rw-ctl", "New walks", gen);

    function draw() {
      const el = P.$("#rw-chart"); el.innerHTML = "";
      const mu = (k) => k * (2 * p - 1), sd = (k) => 2 * Math.sqrt(k * p * (1 - p));
      let lo = Math.min(0, mu(n) - 2.6 * sd(n)), hi = Math.max(0, mu(n) + 2.6 * sd(n));
      for (const w of walks) for (let i = 0; i <= t; i++) { if (w[i] < lo) lo = w[i]; if (w[i] > hi) hi = w[i]; }
      const c = P.chart(el, { x: [0, n], y: [lo - 1, hi + 1], height: 280, xLabel: "step", yLabel: "position S" });
      const xs = P.linspace(0, n, 120);
      band(c, xs, xs.map((k) => mu(k) - sd(k)), xs.map((k) => mu(k) + sd(k)), "c1", 0.12);
      c.line(xs.map((k) => [k, mu(k) + 2 * sd(k)]), { color: "c1", dash: true, width: 1.2 });
      c.line(xs.map((k) => [k, mu(k) - 2 * sd(k)]), { color: "c1", dash: true, width: 1.2 });
      const stride = Math.max(1, Math.floor(n / 250));
      const op = Math.max(0.12, Math.min(0.8, 4 / Math.sqrt(K * 4)));
      for (const w of walks) {
        const pts = [];
        for (let i = 0; i <= t; i += stride) pts.push([i, w[i]]);
        if (pts[pts.length - 1][0] !== t) pts.push([t, w[t]]);
        c.line(pts, { color: "c2", width: 1, opacity: op });
      }
      c.line(xs.map((k) => [k, mu(k)]), { color: "c4", width: 1.8 });
      const ends = walks.map((w) => w[t]);
      const em = P.mean(ends), es = Math.sqrt(P.variance(ends));
      const within = ends.filter((x) => Math.abs(x - mu(t)) <= sd(t) + 1e-9).length / ends.length;
      P.readout("#rw-read", [
        { label: `at step ${t}: mean`, value: P.fmt(em, 2), color: "c2" },
        { label: "theory $n(2p-1)$ =", value: P.fmt(mu(t), 2), color: "c4" },
        { label: "sd", value: P.fmt(es, 2), color: "c2" },
        { label: "theory $2\\sqrt{np(1-p)}$ =", value: P.fmt(sd(t), 2), color: "c1" },
        { label: "within ±1 sd", value: P.pct(within, 0) },
      ]);
    }
    gen();
  })();

  /* ================================================= COUPON COLLECTOR */
  (function coupons() {
    let n = 10, have, copies, distinct, boxes, phases, curLen, last, totals = [];
    const reset = () => { loop.stop(); syncAuto(); have = new Uint8Array(n); copies = new Array(n).fill(0); distinct = 0; boxes = 0; phases = []; curLen = 0; last = -1; draw(); };
    P.slider("#cc-ctl", { label: "types n", min: 2, max: 50, value: n, onInput: (v) => { n = v; totals = []; reset(); } });
    function open() {
      if (distinct === n) return false;
      const c = (Math.random() * n) | 0;
      boxes++; curLen++; copies[c]++; last = c;
      if (!have[c]) { have[c] = 1; distinct++; phases.push(curLen); curLen = 0; }
      return distinct < n;
    }
    P.button("#cc-ctl", "Open box", () => { if (distinct === n) reset(); open(); draw(); });
    let acc = 0;
    const loop = P.loop((dt) => {
      acc += dt;
      const per = Math.max(15, 220 / Math.sqrt(n));
      let go = true;
      while (acc > per && go) { acc -= per; go = open(); }
      draw();
      if (!go) return false;
    });
    const auto = P.button("#cc-ctl", "▶ Auto", () => { if (loop.running) loop.stop(); else { if (distinct === n) reset(); acc = 0; loop.start(); } syncAuto(); }, "ghost");
    function syncAuto() { if (auto) auto.textContent = loop.running ? "⏸ Pause" : "▶ Auto"; }
    loop.onstop = syncAuto;
    P.button("#cc-ctl", "Run 2,000 collections", () => {
      for (let r = 0; r < 2000; r++) {
        const h = new Uint8Array(n); let d = 0, b = 0;
        while (d < n) { const c = (Math.random() * n) | 0; b++; if (!h[c]) { h[c] = 1; d++; } }
        totals.push(b);
      }
      draw();
    });
    P.button("#cc-ctl", "Reset", () => { totals = []; reset(); }, "ghost");

    function draw() {
      const Hn = m.harmonic(n), E = n * Hn;
      // cards
      const cols = Math.min(n, 10), cw = 54, ch = 38, rows = Math.ceil(n / cols);
      const svg = svgBox("#cc-cards", cols * (cw + 6) + 6, rows * (ch + 6) + 6);
      for (let i = 0; i < n; i++) {
        const x = 6 + (i % cols) * (cw + 6), y = 6 + Math.floor(i / cols) * (ch + 6);
        S("rect", { x, y, width: cw, height: ch, rx: 6, style: `fill:${have[i] ? col("c3") : "var(--bg)"};opacity:${have[i] ? 0.85 : 1};stroke:${i === last ? col("c2") : "var(--line)"};stroke-width:${i === last ? 3 : 1.2}` }, svg);
        txt(svg, x + cw / 2, y + 18, "#" + (i + 1), { size: 13, weight: 700, color: have[i] ? "var(--panel)" : "var(--muted)" });
        if (copies[i] > 1) txt(svg, x + cw / 2, y + 32, "×" + copies[i], { size: 10, color: "var(--panel)" });
      }
      // phase bar: expected (outline) vs actual (filled)
      const W = 640, H = 70, L = 70, span = Math.max(E * 1.15, boxes + 1), sc = (W - L - 10) / span;
      const pb = svgBox("#cc-phase", W, H);
      txt(pb, L - 6, 24, "expected", { anchor: "end", size: 11 });
      txt(pb, L - 6, 54, "actual", { anchor: "end", size: 11 });
      let x = 0;
      for (let k = 0; k < n; k++) {
        const len = n / (n - k);
        S("rect", { x: L + x * sc, y: 12, width: Math.max(0.5, len * sc), height: 18, style: `fill:none;stroke:${col("c6")};stroke-width:1` }, pb);
        if (len * sc > 22 && k >= n - 3) txt(pb, L + (x + len / 2) * sc, 25, P.fmt(len, 1), { size: 10 });
        x += len;
      }
      x = 0;
      const all = [...phases, ...(distinct < n && boxes ? [curLen] : [])];
      all.forEach((len, k) => {
        const done = k < phases.length;
        S("rect", { x: L + x * sc, y: 42, width: Math.max(0.5, len * sc - 0.6), height: 18, style: `fill:${col(k % 2 ? "c5" : "c1")};opacity:${done ? 0.85 : 0.35}` }, pb);
        if (len * sc > 16) txt(pb, L + (x + len / 2) * sc, 55, len, { size: 10, weight: 700, color: "var(--panel)" });
        x += len;
      });
      // histogram of totals
      const el = P.$("#cc-hist"); el.innerHTML = "";
      if (totals.length) {
        const hi = Math.ceil(Math.max(E * 2.5, ...totals.slice(-2000)));
        const bins = Math.min(40, hi - n + 1);
        const h = P.histogram(totals, bins, n - 0.5, hi + 0.5);
        const c = P.chart(el, { x: [n - 0.5, hi + 0.5], y: [0, Math.max(...h.map((b) => b.count)) * 1.15], height: 200, xLabel: "boxes to collect all n", yLabel: "count" });
        c.bars(h.map((b) => ({ x: b.x, y: b.count })), { color: "c1", w: (h[0].x1 - h[0].x0) * 0.9 });
        c.vline(E, { color: "c4", label: "nHₙ" });
      }
      P.readout("#cc-read", [
        { label: "boxes opened", value: boxes, color: "c2" },
        { label: "types collected", value: `${distinct}/${n}`, color: "c3" },
        { label: "$nH_n$ =", value: P.fmt(E, 2), color: "c4" },
        { label: "last phase expects", value: n + " boxes" },
        ...(totals.length ? [{ label: `sim avg (${totals.length})`, value: P.fmt(P.mean(totals), 2), color: "c1" }] : []),
      ]);
    }
    reset();

    // growth plot
    (function growth() {
      const el = P.$("#cc-growth");
      const c = P.chart(el, { x: [1, 100], y: [0, 560], height: 220, xLabel: "n", yLabel: "boxes" });
      const xs = P.range(1, 100);
      c.line(xs.map((k) => [k, k]), { color: "c6", dash: "2 3", width: 1.5 });
      c.line(xs.map((k) => [k, k * Math.log(k)]), { color: "c2", dash: true });
      c.line(xs.map((k) => [k, k * m.harmonic(k)]), { color: "c1" });
      P.legend(el, [{ color: "c1", label: "n·Hₙ (exact)" }, { color: "c2", label: "n ln n", dash: true }, { color: "c6", label: "n", dash: true }]);
    })();
  })();

  /* ================================================= COINS / BALANCE */
  (function coins() {
    let K = 9, heavy, assign, hist, cands, revealed, lastRes = null;
    const sel = P.select("#cn-ctl", { label: "coins", options: [3, 9, 27, 81].map((v) => ({ value: v, label: `${v} coins (3^${Math.round(Math.log(v) / Math.log(3))})` })), value: "9", onChange: (v) => { K = +v; newGame(); } });
    P.button("#cn-ctl", "⚖️ Weigh", weigh);
    P.button("#cn-ctl", "Optimal next weighing", optimal, "ghost");
    P.button("#cn-ctl", "Clear pans", () => { assign.fill(0); lastRes = null; draw(); }, "ghost");
    P.button("#cn-ctl", "Reveal", () => { revealed = true; draw(); }, "ghost");
    P.button("#cn-ctl", "New game", newGame, "ghost");

    function newGame() { heavy = (Math.random() * K) | 0; assign = new Array(K).fill(0); hist = []; revealed = false; lastRes = null; cands = P.range(0, K - 1); draw(); }
    function outcome(L, Rr, h) {
      const wl = L.length + (L.includes(h) ? 0.5 : 0), wr = Rr.length + (Rr.includes(h) ? 0.5 : 0);
      return wl > wr ? "L" : wr > wl ? "R" : "=";
    }
    function weigh() {
      const L = [], Rr = [];
      assign.forEach((a, i) => (a === 1 ? L.push(i) : a === 2 ? Rr.push(i) : 0));
      if (!L.length && !Rr.length) { P.$("#cn-status").innerHTML = "Put some coins on the pans first (click them)."; return; }
      const res = outcome(L, Rr, heavy);
      cands = cands.filter((c) => outcome(L, Rr, c) === res);
      hist.push({ L, R: Rr, res, left: cands.length });
      lastRes = res;
      draw();
    }
    function optimal() {
      if (cands.length <= 1) return;
      const t = Math.ceil(cands.length / 3);
      assign.fill(0);
      cands.forEach((c, i) => { if (i < t) assign[c] = 1; else if (i < 2 * t) assign[c] = 2; });
      lastRes = null; draw();
    }
    const fmtSet = (s) => "{" + s.map((i) => i + 1).join(",") + "}";

    function draw() {
      // scale
      const W = 460, H = 150, cx = W / 2, by = 46, arm = 150;
      const svg = svgBox("#cn-scale", W, H);
      const ang = lastRes === "L" ? -10 : lastRes === "R" ? 10 : 0, rad = (ang * Math.PI) / 180;
      S("path", { d: `M${cx},${by} L${cx - 22},${H - 8} L${cx + 22},${H - 8} Z`, style: `fill:${col("c6")};opacity:.35` }, svg);
      const lx = cx - arm * Math.cos(rad), ly = by - arm * Math.sin(rad), rx = cx + arm * Math.cos(rad), ry = by + arm * Math.sin(rad);
      S("line", { x1: lx, y1: ly, x2: rx, y2: ry, style: `stroke:var(--ink);stroke-width:4;stroke-linecap:round` }, svg);
      S("circle", { cx, cy: by, r: 5, style: "fill:var(--ink)" }, svg);
      const nL = assign.filter((a) => a === 1).length, nR = assign.filter((a) => a === 2).length;
      [[lx, ly, nL, "c1", "left"], [rx, ry, nR, "c2", "right"]].forEach(([x, y, k, c, s]) => {
        S("line", { x1: x, y1: y, x2: x - 30, y2: y + 40, style: "stroke:var(--muted);stroke-width:1" }, svg);
        S("line", { x1: x, y1: y, x2: x + 30, y2: y + 40, style: "stroke:var(--muted);stroke-width:1" }, svg);
        S("path", { d: `M${x - 40},${y + 40} Q${x},${y + 66} ${x + 40},${y + 40} Z`, style: `fill:${col(c)};opacity:.25;stroke:${col(c)};stroke-width:1.5` }, svg);
        txt(svg, x, y + 55, `${k} coin${k === 1 ? "" : "s"}`, { size: 12, weight: 700, color: col(c) });
      });
      txt(svg, cx, 18, lastRes === null ? "set up the pans, then weigh" : lastRes === "L" ? "LEFT side heavier" : lastRes === "R" ? "RIGHT side heavier" : "BALANCED", { size: 14, weight: 700, color: lastRes === null ? "var(--muted)" : "var(--ink)" });

      // coins
      const cols = K <= 9 ? K : K === 27 ? 9 : 14, r = 15, sp = 38, rows = Math.ceil(K / cols);
      const cs = svgBox("#cn-coins", cols * sp + 10, rows * sp + 10);
      const alive = new Set(cands);
      for (let i = 0; i < K; i++) {
        const x = 5 + sp / 2 + (i % cols) * sp, y = 5 + sp / 2 + Math.floor(i / cols) * sp;
        const g = S("g", { style: `cursor:pointer;opacity:${alive.has(i) ? 1 : 0.28}` }, cs);
        const a = assign[i], show = revealed && i === heavy;
        S("circle", { cx: x, cy: y, r, style: `fill:${a === 1 ? col("c1") : a === 2 ? col("c2") : "var(--bg)"};stroke:${show ? col("c4") : a ? "none" : "var(--muted)"};stroke-width:${show ? 4 : 1.2}` }, g);
        txt(g, x, y + 4, i + 1, { size: 11, weight: 700, color: a ? "var(--panel)" : "var(--ink)" });
        if (!alive.has(i)) S("line", { x1: x - 10, y1: y - 10, x2: x + 10, y2: y + 10, style: "stroke:var(--muted);stroke-width:1.5" }, g);
        g.addEventListener("click", () => { assign[i] = (assign[i] + 1) % 3; lastRes = null; draw(); });
      }

      const lb = Math.ceil(Math.log(K) / Math.log(3) - 1e-9);
      const st = P.$("#cn-status");
      if (cands.length === 1) {
        const ok = cands[0] === heavy;
        st.innerHTML = `🎉 <b>Found it: coin #${cands[0] + 1}</b> in ${hist.length} weighing${hist.length === 1 ? "" : "s"}${ok ? "" : " (?)"}. ` +
          (hist.length <= lb ? "That's optimal." : `The minimum is ${lb}. Try splitting candidates into equal thirds.`);
      } else {
        st.innerHTML = `Candidates left: <b>${cands.length}</b> · weighings used: <b>${hist.length}</b> · lower bound ⌈log₃ ${K}⌉ = <b>${lb}</b>` +
          (hist.length ? ` · still need ≥ ⌈log₃ ${cands.length}⌉ = ${Math.ceil(Math.log(cands.length) / Math.log(3) - 1e-9)} more` : "") +
          (revealed ? ` · heavy coin is <b>#${heavy + 1}</b>` : "");
      }
      P.$("#cn-hist").innerHTML = hist.map((h, i) => `<div>#${i + 1}: ${fmtSet(h.L)} vs ${fmtSet(h.R)} → <b>${h.res === "L" ? "left heavy" : h.res === "R" ? "right heavy" : "balanced"}</b> · ${h.left} candidate${h.left === 1 ? "" : "s"} left</div>`).join("");
    }
    newGame();
  })();

  /* ================================================= RESERVOIR */
  (function reservoir() {
    let n = 12, t = 0, s = -1, msg = "", counts = null, runs = 0;
    const reset = () => { loop.stop(); syncAuto(); t = 0; s = -1; msg = "Press <b>Step</b> to receive the first item."; draw(); };
    P.slider("#rs-ctl", { label: "stream length n", min: 3, max: 30, value: n, onInput: (v) => { n = v; counts = null; runs = 0; reset(); } });
    function step() {
      if (t >= n) return false;
      t++;
      if (t === 1) { s = 0; msg = `x<sub>1</sub> arrives: keep it (s = x<sub>1</sub>).`; }
      else {
        const u = Math.random();
        if (u < 1 / t) { msg = `x<sub>${t}</sub> arrives: roll u = ${u.toFixed(3)} &lt; 1/${t} = ${(1 / t).toFixed(3)} → <b>replace</b>, s = x<sub>${t}</sub>.`; s = t - 1; }
        else msg = `x<sub>${t}</sub> arrives: roll u = ${u.toFixed(3)} ≥ 1/${t} = ${(1 / t).toFixed(3)} → keep s = x<sub>${s + 1}</sub>.`;
      }
      if (t === n) msg += ` Stream over: we return x<sub>${s + 1}</sub>.`;
      return t < n;
    }
    P.button("#rs-ctl", "Step", () => { if (t >= n) reset(); step(); draw(); });
    let acc = 0;
    const loop = P.loop((dt) => { acc += dt; let go = true; if (acc > 550) { acc = 0; go = step(); draw(); } if (!go) return false; });
    const auto = P.button("#rs-ctl", "▶ Auto", () => { if (loop.running) loop.stop(); else { if (t >= n) reset(); acc = 600; loop.start(); } syncAuto(); }, "ghost");
    function syncAuto() { if (auto) auto.textContent = loop.running ? "⏸ Pause" : "▶ Auto"; }
    loop.onstop = syncAuto;
    P.button("#rs-ctl", "Run 10,000 streams", () => {
      if (!counts) counts = new Array(n).fill(0);
      for (let r = 0; r < 10000; r++) { let sel = 0; for (let k = 2; k <= n; k++) if (Math.random() * k < 1) sel = k - 1; counts[sel]++; }
      runs += 10000; draw();
    });

    function draw() {
      const bw = 34, gap = 6, L = 92, W = L + n * (bw + gap) + 10, H = 150;
      const svg = svgBox("#rs-stream", W, H);
      // reservoir box
      S("rect", { x: 6, y: 22, width: 70, height: 44, rx: 8, style: `fill:${s >= 0 ? col("c3") : "var(--bg)"};opacity:${s >= 0 ? 0.9 : 1};stroke:${col("c3")};stroke-width:2` }, svg);
      txt(svg, 41, 16, "reservoir s", { size: 11 });
      txt(svg, 41, 50, s >= 0 ? `x${s + 1}` : "—", { size: 16, weight: 700, color: s >= 0 ? "var(--panel)" : "var(--muted)" });
      txt(svg, L, 16, "stream →", { anchor: "start", size: 11 });
      const barMax = 50;
      for (let i = 0; i < n; i++) {
        const x = L + i * (bw + gap), seen = i < t, now = i === t - 1, held = i === s;
        S("rect", { x, y: 26, width: bw, height: 36, rx: 5, style: `fill:${held ? col("c3") : seen ? "var(--accent-soft)" : "none"};stroke:${now ? col("c2") : seen ? col("c1") : "var(--line)"};stroke-width:${now ? 3 : 1.2};${seen ? "" : "stroke-dasharray:3 3"}` }, svg);
        txt(svg, x + bw / 2, 49, `x${i + 1}`, { size: 11, weight: 700, color: held ? "var(--panel)" : seen ? "var(--ink)" : "var(--muted)" });
        if (seen) {
          const h = barMax / t;
          S("rect", { x: x + 6, y: 72 + barMax - h, width: bw - 12, height: h, style: `fill:${col("c1")};opacity:.7` }, svg);
          txt(svg, x + bw / 2, 138, i === 0 && t > 0 ? `1/${t}` : "", { size: 10 });
        }
      }
      txt(svg, L - 6, 112, "P(held)", { anchor: "end", size: 10 });
      if (t > 1) txt(svg, L + t * (bw + gap) - gap / 2, 138, `each = 1/${t}`, { anchor: "end", size: 10, weight: 600, color: col("c1") });
      P.$("#rs-status").innerHTML = msg;

      const el = P.$("#rs-chart"); el.innerHTML = "";
      if (counts) {
        const fr = counts.map((c) => c / runs);
        const c = P.chart(el, { x: [0.3, n + 0.7], y: [0, Math.max(1.6 / n, ...fr) * 1.1], height: 200, xLabel: "index of the selected item", yLabel: "fraction", xFormat: (v) => (Number.isInteger(v) ? v : "") });
        c.bars(fr.map((y, i) => ({ x: i + 1, y })), { color: "c3", w: 0.75 });
        c.hline(1 / n, { color: "c4", label: "1/n" });
        const maxDev = Math.max(...fr.map((f) => Math.abs(f - 1 / n)));
        P.readout("#rs-read", [
          { label: "streams", value: runs.toLocaleString() },
          { label: "target $1/n$ =", value: P.fmt(1 / n, 4), color: "c4" },
          { label: "largest deviation", value: P.fmt(maxDev, 4) },
          { label: "≈ noise $\\sqrt{(1/n)/\\text{runs}}$ =", value: P.fmt(Math.sqrt(1 / n / runs), 4) },
        ]);
      } else P.$("#rs-read").innerHTML = "";
    }
    reset();
  })();

  /* ================================================= SECRETARY */
  (function secretary() {
    let n = 20, k = Math.round(20 / Math.E), sim = null, run = null;
    const Pk = (k) => (k === 0 ? 1 / n : (k / n) * (m.harmonic(n - 1) - m.harmonic(k - 1)));
    const slN = P.slider("#sc-ctl", { label: "candidates n", min: 3, max: 100, value: n, onInput: (v) => { n = v; setMax(slK, n - 1); slK.set(Math.round(n / Math.E), false); k = slK.value; sim = null; oneRun(); } });
    const slK = P.slider("#sc-ctl", { label: "skip first k", min: 0, max: n - 1, value: k, onInput: (v) => { k = v; sim = null; oneRun(); } });
    P.button("#sc-ctl", "Run one", oneRun);
    P.button("#sc-ctl", "Simulate 10,000", () => {
      let w = 0;
      const perm = Array.from({ length: n }, (_, i) => i);
      for (let r = 0; r < 10000; r++) { R.shuffle(perm); if (perm[strategy(perm)] === n - 1) w++; }
      sim = w / 10000; draw();
    }, "ghost");
    P.button("#sc-ctl", "k = best", () => { let b = 0; for (let j = 1; j < n; j++) if (Pk(j) > Pk(b)) b = j; slK.set(b); });

    function strategy(perm) {
      let bench = -1;
      for (let i = 0; i < k; i++) bench = Math.max(bench, perm[i]);
      for (let i = k; i < n; i++) if (perm[i] > bench) return i;
      return n - 1;
    }
    function oneRun() { const perm = R.shuffle(Array.from({ length: n }, (_, i) => i)); run = { perm, hired: strategy(perm) }; draw(); }

    function draw() {
      const el = P.$("#sc-chart"); el.innerHTML = "";
      const ks = P.range(0, n - 1), ys = ks.map(Pk);
      let best = 0; ys.forEach((y, i) => { if (y > ys[best]) best = i; });
      const c = P.chart(el, { x: [0, n - 1], y: [0, Math.max(0.55, ...ys) * 1.05], height: 230, xLabel: "threshold k (candidates skipped)", yLabel: "P(hire the best)", yFormat: (v) => Math.round(v * 100) + "%" });
      c.hline(1 / Math.E, { color: "c6", label: "1/e ≈ 36.8%" });
      c.vline(n / Math.E, { color: "c4", label: "n/e" });
      c.line(ks.map((x, i) => [x, ys[i]]), { color: "c1" });
      if (n <= 40) c.dots(ks.map((x, i) => [x, ys[i]]), { color: "c1", r: 2.5 });
      c.dots([[k, Pk(k)]], { color: "c2", r: 6, stroke: "var(--panel)" });
      if (sim !== null) c.dots([[k, sim]], { color: "c3", r: 5 });

      // single run bars
      const W = 640, H = 120, bw = (W - 20) / n;
      const svg = svgBox("#sc-run", W, H);
      S("rect", { x: 10, y: 4, width: k * bw, height: H - 22, style: `fill:${col("c6")};opacity:.15` }, svg);
      if (k > 0) txt(svg, 10 + (k * bw) / 2, H - 6, "look", { size: 10 });
      txt(svg, 10 + k * bw + (n - k) * bw / 2, H - 6, "leap", { size: 10 });
      if (run) {
        let bench = -1; for (let i = 0; i < k; i++) bench = Math.max(bench, run.perm[i]);
        run.perm.forEach((v, i) => {
          const h = ((v + 1) / n) * (H - 32), isBest = v === n - 1, hired = i === run.hired;
          S("rect", { x: 10 + i * bw + bw * 0.12, y: H - 18 - h, width: bw * 0.76, height: h, rx: 1.5,
            style: `fill:${hired ? col(isBest ? "c3" : "c2") : col(i < k ? "c6" : "c1")};opacity:${hired ? 1 : 0.55};stroke:${isBest ? col("c4") : "none"};stroke-width:2.5` }, svg);
        });
        if (k > 0) { const y = H - 18 - ((bench + 1) / n) * (H - 32); S("line", { x1: 10, x2: W - 10, y1: y, y2: y, style: `stroke:${col("c2")};stroke-dasharray:4 3;stroke-width:1.2` }, svg); }
        const v = run.perm[run.hired], ok = v === n - 1;
        P.$("#sc-status").innerHTML = `${k ? `Benchmark = best of the first ${k} (dashed line). ` : "k = 0: hire the first candidate. "}Hired candidate #${run.hired + 1}, who ranks <b>${n - v}</b> of ${n}. ` +
          (ok ? "<b>✓ That's the best!</b>" : run.perm.indexOf(n - 1) < k ? "✗ The best was in the look phase." : "✗ Someone beat the benchmark before the best arrived.");
      }
      P.readout("#sc-read", [
        { label: "$P(k)$ =", value: P.pct(Pk(k)), color: "c2" },
        { label: "simulated", value: sim === null ? "—" : P.pct(sim), color: "c3" },
        { label: "best k =", value: `${best} (n/e ≈ ${P.fmt(n / Math.E, 1)})`, color: "c4" },
        { label: "$P(\\text{best }k)$ =", value: P.pct(ys[best]) },
      ]);
    }
    oneRun();
  })();

  /* ================================================= MONTY HALL */
  (function monty() {
    let n = 3, variant = "all", g, tally;
    const resetTally = () => { tally = { stay: [0, 0], switch: [0, 0] }; };
    resetTally();
    P.slider("#mh-ctl", { label: "doors n", min: 3, max: 10, value: n, onInput: (v) => { n = v; resetTally(); newRound(); } });
    P.select("#mh-ctl", { label: "Monty opens", options: [{ value: "all", label: "all but one other door (n−2)" }, { value: "one", label: "only 1 door" }], value: variant, onChange: (v) => { variant = v; resetTally(); newRound(); } });
    P.button("#mh-btn", "New round", () => newRound(), "ghost");
    P.button("#mh-btn", "Auto-play 1,000 (stay)", () => auto("stay"));
    P.button("#mh-btn", "Auto-play 1,000 (switch)", () => auto("switch"));
    P.button("#mh-btn", "Reset tallies", () => { resetTally(); draw(); }, "ghost");

    const theory = () => ({ stay: 1 / n, switch: variant === "all" ? (n - 1) / n : (n - 1) / (n * (n - 2)) });
    function montyOpens(car, pick) {
      const others = P.range(0, n - 1).filter((d) => d !== pick);
      if (variant === "all") {
        const keep = car !== pick ? car : R.choice(others);
        return others.filter((d) => d !== keep);
      }
      return [R.choice(others.filter((d) => d !== car))];
    }
    function newRound() { g = { car: (Math.random() * n) | 0, phase: "pick", pick: -1, opened: [], final: -1 }; draw(); }
    function auto(strat) {
      for (let r = 0; r < 1000; r++) {
        const car = (Math.random() * n) | 0, pick = (Math.random() * n) | 0, opened = montyOpens(car, pick);
        let fin = pick;
        if (strat === "switch") fin = R.choice(P.range(0, n - 1).filter((d) => d !== pick && !opened.includes(d)));
        tally[strat][0]++; tally[strat][1] += fin === car;
      }
      draw();
    }
    function click(d) {
      if (g.phase === "pick") { g.pick = d; g.opened = montyOpens(g.car, d); g.phase = "decide"; }
      else if (g.phase === "decide") {
        if (g.opened.includes(d)) return;
        g.final = d; g.phase = "done";
        const s = d === g.pick ? "stay" : "switch";
        tally[s][0]++; tally[s][1] += d === g.car;
      } else { newRound(); return; }
      draw();
    }
    function draw() {
      const box = P.$("#mh-doors"); box.innerHTML = "";
      for (let d = 0; d < n; d++) {
        const open = g.opened.includes(d) || g.phase === "done";
        const b = P.el("button", { class: "door" }, box);
        if (d === g.pick) b.classList.add("picked");
        if (g.opened.includes(d)) b.classList.add("open");
        if (g.phase === "done" && d === g.car) b.classList.add("win");
        if (g.phase === "decide" && g.opened.includes(d)) b.disabled = true;
        P.el("span", { class: "num", text: "#" + (d + 1) }, b);
        P.el("span", { class: "ico", text: open ? (d === g.car ? "🚗" : "🐐") : "🚪" }, b);
        P.el("span", { class: "tag", text: d === g.final ? (d === g.pick ? "stayed" : "switched") : d === g.pick ? "your pick" : g.opened.includes(d) && g.phase !== "done" ? "Monty" : "" }, b);
        b.onclick = () => click(d);
      }
      const st = P.$("#mh-status"), th = theory();
      if (g.phase === "pick") st.innerHTML = "Pick a door.";
      else if (g.phase === "decide") st.innerHTML = `Monty opened ${g.opened.length} goat door${g.opened.length > 1 ? "s" : ""}. Click <b>your door</b> to stay (wins ${P.pct(th.stay)}), or <b>another closed door</b> to switch (wins ${P.pct(th.switch)}).`;
      else st.innerHTML = (g.final === g.car ? "🎉 <b>You win the car!</b>" : "🐐 Goat. ") + ` You ${g.final === g.pick ? "stayed" : "switched"}. Click any door for a new round.`;

      const el = P.$("#mh-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [-0.6, 1.6], y: [0, 1], height: 190, yLabel: "win rate", xTicks: [0, 1], xFormat: (v) => (v === 0 ? "stay" : "switch"), yFormat: (v) => Math.round(v * 100) + "%" });
      const emp = (s) => (tally[s][0] ? tally[s][1] / tally[s][0] : 0);
      c.bars([{ x: 0, y: emp("stay"), color: "c6" }, { x: 1, y: emp("switch"), color: "c3" }], { w: 0.5 });
      c.hline(th.stay, { color: "c6", x0: -0.35, x1: 0.35, dash: false, width: 2.5, label: "theory " + P.pct(th.stay) });
      c.hline(th.switch, { color: "c3", x0: 0.65, x1: 1.35, dash: false, width: 2.5, label: "theory " + P.pct(th.switch) });
      const f = (s) => (tally[s][0] ? `${tally[s][1]}/${tally[s][0]} = ${P.pct(emp(s))}` : "—");
      P.readout("#mh-read", [
        { label: "stay wins", value: f("stay"), color: "c6" },
        { label: "switch wins", value: f("switch"), color: "c3" },
        { label: "theory stay $1/n$ =", value: P.fmt(th.stay, 3) },
        { label: variant === "all" ? "theory switch $\\frac{n-1}{n}$ =" : "theory switch $\\frac{n-1}{n(n-2)}$ =", value: P.fmt(th.switch, 3) },
      ]);
    }
    newRound();
  })();

  /* ================================================= LONGEST RUN */
  (function longestRun() {
    const NS = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
    let n = 128, Ls = [], seq = null;
    P.slider("#lr-ctl", { label: "flips n", min: 0, max: NS.length - 1, value: 4, format: (i) => NS[i], onInput: (i) => { n = NS[i]; resample(); } });
    P.button("#lr-ctl", "Resample", resample);
    function longest(a) {
      let best = 0, bs = -1, run = 0;
      for (let i = 0; i < a.length; i++) { if (a[i]) { run++; if (run > best) { best = run; bs = i - run + 1; } } else run = 0; }
      return [best, bs];
    }
    function resample() {
      const trials = Math.min(5000, Math.floor(3e6 / n));
      Ls = new Array(trials);
      for (let t = 0; t < trials; t++) {
        let best = 0, run = 0;
        for (let i = 0; i < n; i++) { if (Math.random() < 0.5) { if (++run > best) best = run; } else run = 0; }
        Ls[t] = best;
      }
      seq = Array.from({ length: n }, () => (Math.random() < 0.5 ? 1 : 0));
      draw();
    }
    function draw() {
      const shown = Math.min(n, 1024), cols = Math.min(64, shown), rows = Math.ceil(shown / cols), cs = 10;
      const svg = svgBox("#lr-strip", cols * cs + 4, rows * cs + 4);
      const [L, start] = longest(seq.slice(0, shown));
      for (let i = 0; i < shown; i++) {
        const inRun = i >= start && i < start + L;
        S("rect", { x: 2 + (i % cols) * cs, y: 2 + Math.floor(i / cols) * cs, width: cs - 1.5, height: cs - 1.5, rx: 1.5,
          style: `fill:${inRun ? col("c2") : seq[i] ? col("c1") : "var(--line)"};opacity:${inRun ? 1 : seq[i] ? 0.6 : 0.8}` }, svg);
      }
      const el = P.$("#lr-chart"); el.innerHTML = "";
      const hi = Math.max(...Ls) + 1;
      const cnt = P.counts(Ls, 0, hi);
      const c = P.chart(el, { x: [-0.6, Math.max(14, hi) + 0.6], y: [0, Math.max(...cnt.map((o) => o.freq)) * 1.2], height: 220, xLabel: "longest run of heads Lₙ", yLabel: "fraction", xFormat: (v) => (Number.isInteger(v) ? v : "") });
      c.bars(cnt.map((o) => ({ x: o.x, y: o.freq })), { color: "c1", w: 0.75 });
      c.vline(Math.log2(n), { color: "c4", label: "log₂ n" });
      c.vline(P.mean(Ls), { color: "c3", label: "mean", y1: c.getDomain().y[1] * 0.82 });
      P.readout("#lr-read", [
        { label: "this sequence:", value: `L = ${L}${n > shown ? " (first 1024 shown)" : ""}`, color: "c2" },
        { label: "sequences", value: Ls.length },
        { label: "mean $L_n$", value: P.fmt(P.mean(Ls), 2), color: "c3" },
        { label: "$\\log_2 n$ =", value: P.fmt(Math.log2(n), 2), color: "c4" },
        { label: "$\\log_2 n-\\tfrac23$ =", value: P.fmt(Math.log2(n) - 2 / 3, 2) },
        { label: "sd", value: P.fmt(Math.sqrt(P.variance(Ls)), 2) },
      ]);
    }
    resample();
  })();

  /* ================================================= BALLS INTO BINS */
  (function balls() {
    let M = 40, loads, thrown = 0, avg = null;
    const reset = () => { loop.stop(); loads = new Array(M).fill(0); thrown = 0; draw(); };
    P.slider("#bb-ctl", { label: "m (balls = bins)", min: 5, max: 200, value: M, onInput: (v) => { M = v; avg = null; reset(); } });
    let acc = 0;
    const loop = P.loop((dt) => {
      acc += dt;
      const per = Math.max(8, 1800 / M);
      while (acc > per && thrown < M) { acc -= per; loads[(Math.random() * M) | 0]++; thrown++; }
      draw();
      if (thrown >= M) return false;
    });
    P.button("#bb-ctl", "▶ Drop balls", () => { if (thrown >= M) { loads.fill(0); thrown = 0; } acc = 0; loop.start(); });
    const throwAll = () => { loop.stop(); loads.fill(0); for (let i = 0; i < M; i++) loads[(Math.random() * M) | 0]++; thrown = M; draw(); };
    P.button("#bb-ctl", "Throw all", throwAll, "ghost");
    P.button("#bb-ctl", "Average 500 trials", () => {
      const s = [0, 0, 0], L = new Uint16Array(M);
      for (let t = 0; t < 500; t++) {
        L.fill(0); for (let i = 0; i < M; i++) L[(Math.random() * M) | 0]++;
        for (let i = 0; i < M; i++) s[Math.min(2, L[i])]++;
      }
      avg = s.map((x) => x / (500 * M)); draw();
    }, "ghost");

    function draw() {
      const W = 640, maxL = Math.max(4, ...loads), bw = (W - 10) / M, r = Math.min(bw * 0.42, 7), H = Math.max(70, maxL * 2 * r + 30);
      const svg = svgBox("#bb-bins", W, H);
      for (let i = 0; i < M; i++) {
        const x = 5 + i * bw, k = loads[i];
        const c = k === 0 ? "var(--line)" : k === 1 ? col("c1") : col("c2");
        S("rect", { x: x + bw * 0.06, y: H - 14, width: bw * 0.88, height: 4, style: `fill:${c}` }, svg);
        for (let j = 0; j < k; j++) S("circle", { cx: x + bw / 2, cy: H - 14 - r - j * 2 * r, r: r * 0.9, style: `fill:${c}` }, svg);
      }
      txt(svg, W - 6, 14, `${thrown}/${M} balls thrown · max load ${Math.max(...loads)}`, { anchor: "end", size: 11 });

      const fr = [0, 0, 0]; loads.forEach((k) => fr[Math.min(2, k)]++);
      const obs = fr.map((x) => x / M);
      const ex = [(1 - 1 / M) ** M, (1 - 1 / M) ** (M - 1)]; ex.push(1 - ex[0] - ex[1]);
      const lim = [1 / Math.E, 1 / Math.E, 1 - 2 / Math.E];
      const el = P.$("#bb-chart"); el.innerHTML = "";
      const names = ["empty", "exactly 1", "2 or more"];
      const c = P.chart(el, { x: [-0.6, 2.6], y: [0, 0.7], height: 210, xTicks: [0, 1, 2], xFormat: (v) => names[v] || "", yLabel: "fraction of bins", yFormat: (v) => Math.round(v * 100) + "%" });
      c.bars(obs.map((y, i) => ({ x: i, y, color: ["c6", "c1", "c2"][i] })), { w: avg ? 0.32 : 0.5, offset: avg ? -0.17 : 0 });
      if (avg) c.bars(avg.map((y, i) => ({ x: i, y })), { w: 0.32, offset: 0.17, color: "c5", opacity: 0.7 });
      lim.forEach((y, i) => { c.hline(y, { x0: i - 0.4, x1: i + 0.4, color: "c4", dash: false, width: 2.5 }); c.text(i, y + 0.035, P.pct(y), { size: 11, color: col("c4"), weight: 700 }); });
      P.legend(el, [{ color: "c1", label: "this throw" }, ...(avg ? [{ color: "c5", label: "average of 500 trials" }] : []), { color: "c4", label: "limits 1/e, 1/e, 1 − 2/e" }]);
      P.readout("#bb-read", [
        { label: "empty", value: P.pct(obs[0]), color: "c6" },
        { label: "one", value: P.pct(obs[1]), color: "c1" },
        { label: "≥2", value: P.pct(obs[2]), color: "c2" },
        { label: "exact for this m: $(1-\\frac1m)^m$ =", value: P.pct(ex[0]) },
        { label: "$(1-\\frac1m)^{m-1}$ =", value: P.pct(ex[1]) },
      ]);
    }
    reset(); throwAll();
  })();

  /* ================================================= MAX LOAD */
  (function maxLoad() {
    const ks = P.range(4, 16), TR = 8;
    let data = null;
    P.button("#ml-ctl", "Run again", run);
    function run() {
      data = ks.map((k) => {
        const M = 2 ** k, L = new Uint16Array(M); let s1 = 0, s2 = 0;
        for (let t = 0; t < TR; t++) {
          L.fill(0); let mx = 0;
          for (let i = 0; i < M; i++) { const b = (Math.random() * M) | 0; if (++L[b] > mx) mx = L[b]; }
          s1 += mx;
          L.fill(0); mx = 0;
          for (let i = 0; i < M; i++) { const a = (Math.random() * M) | 0, b = (Math.random() * M) | 0, j = L[a] <= L[b] ? a : b; if (++L[j] > mx) mx = L[j]; }
          s2 += mx;
        }
        return { k, one: s1 / TR, two: s2 / TR };
      });
      draw();
    }
    function draw() {
      const el = P.$("#ml-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [4, 16], y: [0, 9], height: 230, xLabel: "m (log scale)", yLabel: "max load", xFormat: (v) => "2^" + v });
      const f = (k) => { const lm = k * Math.LN2; return lm / Math.log(lm); };
      const xs = P.linspace(4, 16, 60);
      c.line(xs.map((k) => [k, f(k)]), { color: "c2", dash: true });
      c.line(xs.map((k) => [k, Math.log2(k * Math.LN2)]), { color: "c3", dash: true });
      c.line(data.map((d) => [d.k, d.one]), { color: "c1" }); c.dots(data.map((d) => [d.k, d.one]), { color: "c1" });
      c.line(data.map((d) => [d.k, d.two]), { color: "c5" }); c.dots(data.map((d) => [d.k, d.two]), { color: "c5" });
    }
    P.legend("#ml-leg", [
      { color: "c1", label: "1 random choice (simulated)" }, { color: "c2", label: "ln m / ln ln m", dash: true },
      { color: "c5", label: "best of 2 choices (simulated)" }, { color: "c3", label: "log₂ ln m", dash: true },
    ]);
    run();
  })();
})();

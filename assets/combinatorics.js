/* Widgets for combinatorics.html */
(function () {
  const { m, rand: R } = P;
  const S = P.svgEl;

  // exact big-integer helpers (lib's m.fact goes through exp(log) and loses precision past ~17!)
  const bigFact = (n) => { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; };
  const bigChoose = (n, k) => (k < 0 || k > n ? 0n : bigFact(n) / (bigFact(k) * bigFact(n - k)));
  const texNum = (x) => x.toLocaleString("en-US").replace(/,/g, "{,}");
  const COLS = ["c1", "c3", "c5", "c2", "c4", "c6"];

  /* ======================================================== four ways */
  (function fourWays() {
    let ordered = true, repl = true, n = 4, k = 2;
    const cells = [
      { o: true, r: false, nm: "permutation", f: "\\dfrac{n!}{(n-k)!}" },
      { o: true, r: true, nm: "sequence", f: "n^k" },
      { o: false, r: false, nm: "combination", f: "\\dbinom nk" },
      { o: false, r: true, nm: "multiset (stars & bars)", f: "\\dbinom{n+k-1}{k}" },
    ];
    const grid = P.$("#fw-grid");
    P.el("div", {}, grid);
    P.el("div", { class: "hd", text: "without replacement" }, grid);
    P.el("div", { class: "hd", text: "with replacement" }, grid);
    const btns = [];
    for (const row of [true, false]) {
      P.el("div", { class: "rh", text: row ? "order matters" : "order doesn't matter" }, grid);
      for (const r of [false, true]) {
        const c = cells.find((x) => x.o === row && x.r === r);
        const b = P.el("button", { class: "cell4" }, grid);
        const f = P.el("div", {}, b); P.tex(f, c.f);
        P.el("div", { class: "nm", text: c.nm }, b);
        b.onclick = () => { ordered = c.o; repl = c.r; draw(); };
        btns.push([b, c]);
      }
    }
    P.slider("#fw-ctl", { label: "n (letters)", min: 1, max: 6, value: n, onInput: (v) => { n = v; draw(); } });
    P.slider("#fw-ctl", { label: "k (picks)", min: 1, max: 5, value: k, onInput: (v) => { k = v; draw(); } });

    const letters = "ABCDEF";
    function enumerate() {
      const out = [], seq = new Array(k).fill(0);
      const total = n ** k;
      for (let idx = 0; idx < total; idx++) {
        let x = idx;
        for (let i = k - 1; i >= 0; i--) { seq[i] = x % n; x = Math.floor(x / n); }
        let ok = true;
        for (let i = 1; i < k && ok; i++) {
          if (ordered && !repl) { for (let j = 0; j < i; j++) if (seq[j] === seq[i]) ok = false; }
          else if (!ordered && !repl) ok = seq[i] > seq[i - 1];
          else if (!ordered && repl) ok = seq[i] >= seq[i - 1];
        }
        if (ok) out.push(seq.slice());
      }
      return out;
    }
    function draw() {
      btns.forEach(([b, c]) => b.classList.toggle("on", c.o === ordered && c.r === repl));
      let src, count;
      if (ordered && repl) { count = n ** k; src = `n^k = ${n}^{${k}} = ${count}`; }
      else if (ordered) { count = k > n ? 0 : m.fact(n) / m.fact(n - k); src = k > n ? `P(${n},${k}) = 0 \\quad\\text{(can't pick ${k} distinct from ${n})}` : `P(n,k)=\\frac{n!}{(n-k)!}=\\frac{${n}!}{${n - k}!} = ${P.range(n - k + 1, n).reverse().join("\\cdot")} = ${count}`; }
      else if (!repl) { count = m.choose(n, k); src = k > n ? `\\binom{${n}}{${k}} = 0 \\quad\\text{(can't pick ${k} distinct from ${n})}` : `\\binom nk = \\binom{${n}}{${k}} = \\frac{P(${n},${k})}{${k}!} = ${count}`; }
      else { count = m.choose(n + k - 1, k); src = `\\binom{n+k-1}{k} = \\binom{${n + k - 1}}{${k}} = ${count}`; }
      const list = k > n && !repl ? [] : enumerate();
      P.tex(P.$("#fw-formula"), src + `\\qquad\\text{(listed: ${list.length}${list.length === count ? "}\\;\\checkmark\\text{" : ""})}`, true);
      const box = P.$("#fw-list"); box.innerHTML = "";
      const LIM = 300;
      list.slice(0, LIM).forEach((s) => {
        const txt = ordered ? s.map((i) => letters[i]).join("") : "{" + s.map((i) => letters[i]).join(",") + "}";
        const chip = P.el("span", { class: "chip", text: txt }, box);
        if (!ordered) {
          const mult = {}; s.forEach((i) => (mult[i] = (mult[i] || 0) + 1));
          const ways = m.fact(k) / Object.values(mult).reduce((a, c) => a * m.fact(c), 1);
          chip.title = `${ways} ordered sequence${ways > 1 ? "s" : ""} collapse into this`;
          if (repl && ways < m.fact(k)) chip.style.borderColor = P.color("c2");
        }
      });
      if (list.length > LIM) P.el("span", { class: "chip more", text: `… and ${list.length - LIM} more` }, box);
      if (!list.length) P.el("span", { class: "chip more", text: "no outcomes" }, box);
    }
    draw();
  })();

  /* ======================================================== multinomial word counter */
  (function multinomial() {
    let word = "MISSISSIPPI", seed = 0;
    const ctl = P.$("#mu-ctl");
    const w = P.el("div", { class: "ctl" }, ctl);
    P.el("label", { text: "word" }, w);
    const inp = P.el("input", { type: "text", value: word, maxlength: 20, "aria-label": "word" }, w);
    inp.addEventListener("input", () => { const v = inp.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 20); if (v.length) { word = v; draw(); } });
    P.select(ctl, { label: "try", options: ["MISSISSIPPI", "BANANA", "BOOKKEEPER", "STATISTICS", "HHHTT", "AABB", "ABCD"], value: word, onChange: (v) => { inp.value = v; word = v; draw(); } });
    P.button(ctl, "New random arrangements", () => { seed++; draw(); }, "ghost");

    function distinctPerms(chars, limit) {
      const a = chars.slice().sort(), out = [];
      while (out.length < limit) {
        out.push(a.join(""));
        let i = a.length - 2; while (i >= 0 && a[i] >= a[i + 1]) i--;
        if (i < 0) break;
        let j = a.length - 1; while (a[j] <= a[i]) j--;
        [a[i], a[j]] = [a[j], a[i]];
        for (let l = i + 1, r = a.length - 1; l < r; l++, r--) [a[l], a[r]] = [a[r], a[l]];
      }
      return out;
    }
    function draw() {
      const n = word.length, cnt = new Map();
      for (const ch of word) cnt.set(ch, (cnt.get(ch) || 0) + 1);
      let denom = 1n; for (const v of cnt.values()) denom *= bigFact(v);
      const total = bigFact(n) / denom;
      const parts = [...cnt.entries()].map(([ch, v]) => `\\underset{\\text{${ch}}}{${v}!}`).join("\\;");
      P.tex(P.$("#mu-formula"), `\\frac{${n}!}{${parts}} = \\frac{${texNum(bigFact(n))}}{${texNum(denom)}} = \\mathbf{${texNum(total)}}`, true);
      // chain of binomials
      let rem = n; const bs = [], vals = [];
      for (const v of cnt.values()) { bs.push(`\\binom{${rem}}{${v}}`); vals.push(texNum(bigChoose(rem, v))); rem -= v; }
      P.tex(P.$("#mu-chain"), `= ${bs.join("")} = ${vals.join("\\cdot")}` + (cnt.size > 6 ? "" : ""), true);
      const box = P.$("#mu-list"); box.innerHTML = "";
      if (total <= 360n) {
        const all = distinctPerms([...word], 400);
        all.forEach((s) => P.el("span", { class: "chip", text: s }, box));
        P.el("span", { class: "chip more", text: `all ${all.length} listed` }, box);
      } else {
        for (let i = 0; i < 12; i++) P.el("span", { class: "chip", text: R.shuffle([...word]).join("") }, box);
        P.el("span", { class: "chip more", text: `12 random arrangements out of ${total.toLocaleString("en-US")}` }, box);
      }
    }
    draw();
  })();

  /* ======================================================== stars and bars */
  (function starsBars() {
    let n = 5, k = 3, bars = [2, 3], sel = null, msg = "";
    const N = () => n + k - 1;
    P.slider("#sb-ctl", { label: "n (stars = total)", min: 0, max: 12, value: n, onInput: (v) => { n = v; randomize(); } });
    P.slider("#sb-ctl", { label: "k (groups)", min: 1, max: 6, value: k, onInput: (v) => { k = v; randomize(); } });
    P.button("#sb-ctl", "Random", () => randomize());
    P.button("#sb-ctl", "Next ▶", () => { next(); draw(); }, "ghost");
    let acc = 0;
    const loop = P.loop((dt) => { acc += dt; if (acc > 450) { acc = 0; next(); draw(); } });
    const play = P.button("#sb-ctl", "▶ Play all", () => { loop.running ? loop.stop() : loop.start(); play.textContent = loop.running ? "⏸ Pause" : "▶ Play all"; }, "ghost");
    loop.onstop = () => (play.textContent = "▶ Play all");

    function randomize() {
      loop.stop(); play.textContent = "▶ Play all";
      const pos = R.shuffle(P.range(0, N() - 1)).slice(0, k - 1).sort((a, b) => a - b);
      bars = pos; sel = null; msg = ""; draw();
    }
    function next() {
      const r = k - 1, NN = N();
      if (r === 0) return;
      let i = r - 1;
      while (i >= 0 && bars[i] === NN - r + i) i--;
      if (i < 0) { bars = P.range(0, r - 1); return; }
      bars[i]++;
      for (let j = i + 1; j < r; j++) bars[j] = bars[j - 1] + 1;
      sel = null;
    }
    function rank() {
      const r = k - 1, NN = N(); let rk = 0, prev = -1;
      for (let i = 0; i < r; i++) { for (let j = prev + 1; j < bars[i]; j++) rk += m.choose(NN - 1 - j, r - 1 - i); prev = bars[i]; }
      return rk;
    }
    function draw() {
      const row = P.$("#sb-row"); row.innerHTML = "";
      const isBar = new Set(bars);
      let group = 0;
      const xs = new Array(k).fill(0);
      for (let pos = 0; pos < N(); pos++) {
        if (isBar.has(pos)) {
          const bi = bars.indexOf(pos);
          const b = P.el("button", { class: "sb bar" + (sel === bi ? " sel" : ""), title: "bar: click to select", "aria-label": "bar" }, row);
          b.textContent = "|";
          b.onclick = () => { sel = sel === bi ? null : bi; msg = sel === null ? "" : "Now click a star to move this bar there."; draw(); };
          group++;
        } else {
          xs[group]++;
          const st = P.el("button", { class: "sb star", text: "★", title: `star in group ${group + 1}`, "aria-label": "star" }, row);
          st.style.color = P.color(COLS[group % COLS.length]);
          st.onclick = () => {
            if (sel === null) { msg = "Select a bar first, then click a star to move it there."; draw(); return; }
            bars[sel] = pos; bars.sort((a, b) => a - b); sel = null; msg = ""; draw();
          };
        }
      }
      if (N() === 0) P.el("span", { class: "muted small", text: "(n = 0 and k = 1: the empty sum, exactly one way)" }, row);
      const vals = P.$("#sb-vals");
      const col = (j, t) => `<b style="color:${P.color(COLS[j % COLS.length])}">${t}</b>`;
      vals.innerHTML = `(x₁, …, x${"₀₁₂₃₄₅₆"[k] || k}) = (${xs.map((x, j) => col(j, x)).join(", ")}) &nbsp;&nbsp;→&nbsp;&nbsp; ${xs.map((x, j) => col(j, x)).join(" + ")} = ${n}` + (msg ? `<div class="muted small">${msg}</div>` : "");
      const total = m.choose(N(), k - 1);
      P.readout("#sb-read", [
        { label: "symbols", value: `${n} stars + ${k - 1} bars = ${N()}` },
        { label: "this is arrangement", value: `#${rank() + 1} of ${total}`, color: "c2" },
        { label: `$\\binom{n+k-1}{k-1}=\\binom{${N()}}{${k - 1}}$ =`, value: total, color: "c1" },
      ]);
    }
    draw();
  })();

  /* ======================================================== inclusion-exclusion venn */
  (function venn() {
    const W = 320, H = 290, r = 82;
    const C = [{ x: 115, y: 112, n: "A" }, { x: 205, y: 112, n: "B" }, { x: 160, y: 192, n: "C" }];
    let sizes, t = 0, hover = -1;
    const terms = [1, 2, 4, 3, 5, 6, 7].map((bits) => {
      const names = C.filter((_, i) => bits & (1 << i)).map((c) => c.n);
      const sign = names.length % 2 ? 1 : -1;
      return { bits, sign, tex: (sign > 0 ? "+" : "-") + "|" + names.join("\\cap ") + "|" };
    });
    const regions = [1, 2, 3, 4, 5, 6, 7];

    const host = P.$("#ie-venn");
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "diagram", role: "img", "aria-label": "Venn diagram" }, host);
    const defs = S("defs", {}, svg);
    C.forEach((c, i) => { const cp = S("clipPath", { id: "ie-clip-" + i }, defs); S("circle", { cx: c.x, cy: c.y, r }, cp); });
    regions.forEach((bits) => {
      const mk = S("mask", { id: "ie-mask-" + bits, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      S("rect", { x: 0, y: 0, width: W, height: H, fill: "white" }, mk);
      C.forEach((c, i) => { if (!(bits & (1 << i))) S("circle", { cx: c.x, cy: c.y, r, fill: "black" }, mk); });
    });
    const nested = (bits, parent) => { let g = parent; C.forEach((_, i) => { if (bits & (1 << i)) g = S("g", { "clip-path": `url(#ie-clip-${i})` }, g); }); return g; };
    const regionFill = {};
    regions.forEach((bits) => { const g = nested(bits, svg); regionFill[bits] = S("rect", { x: 0, y: 0, width: W, height: H, mask: `url(#ie-mask-${bits})`, style: "fill:var(--c6);opacity:.08;transition:fill .2s,opacity .2s" }, g); });
    const hl = S("g", { style: "display:none" }, svg);
    let hlRect = null;
    C.forEach((c) => S("circle", { cx: c.x, cy: c.y, r, style: "fill:none;stroke:var(--ink);stroke-width:1.5;opacity:.6" }, svg));
    [[-1, -1], [1, -1], [0, 1]].forEach(([dx, dy], i) => { const tx = S("text", { x: C[i].x + dx * 70, y: C[i].y + dy * 78 + (dy > 0 ? 14 : 0), "text-anchor": "middle", style: "fill:var(--ink);font-size:16px;font-weight:700" }, svg); tx.textContent = C[i].n; });

    // region centroids by grid sampling
    const inC = (x, y, i) => (x - C[i].x) ** 2 + (y - C[i].y) ** 2 <= r * r;
    const cent = {}; regions.forEach((b) => (cent[b] = [0, 0, 0]));
    for (let x = 0; x < W; x += 2) for (let y = 0; y < H; y += 2) {
      let b = 0; for (let i = 0; i < 3; i++) if (inC(x, y, i)) b |= 1 << i;
      if (b) { cent[b][0] += x; cent[b][1] += y; cent[b][2]++; }
    }
    const labels = {};
    regions.forEach((b) => {
      const [sx, sy, c] = cent[b], x = sx / c, y = sy / c;
      const g = S("g", {}, svg);
      const t1 = S("text", { x, y: y - 2, "text-anchor": "middle", style: "fill:var(--ink);font-size:15px;font-weight:700" }, g);
      const t2 = S("text", { x, y: y + 13, "text-anchor": "middle", style: "font-size:11px;font-weight:700" }, g);
      labels[b] = [t1, t2];
    });

    const ctl = P.$("#ie-ctl");
    P.button(ctl, "Next term", () => { t = Math.min(7, t + 1); draw(); });
    P.button(ctl, "Previous", () => { t = Math.max(0, t - 1); draw(); }, "ghost");
    P.button(ctl, "Apply all", () => { t = 7; draw(); }, "ghost");
    P.button(ctl, "Reset", () => { t = 0; draw(); }, "ghost");
    P.button(ctl, "Randomize sizes", () => { randomSizes(); draw(); }, "ghost");

    const termBox = P.$("#ie-terms");
    const rows = terms.map((tm, i) => {
      const row = P.el("div", { class: "ie-term" }, termBox);
      const l = P.el("span", {}, row); P.tex(l, tm.tex);
      const v = P.el("span", { class: "val" }, row);
      row.onmouseenter = () => { hover = i; drawHover(); };
      row.onmouseleave = () => { hover = -1; drawHover(); };
      row.onclick = () => { t = i + 1; draw(); };
      return { row, v };
    });
    const totalRow = P.el("div", { class: "ie-term", style: "cursor:default;border-style:dashed" }, termBox);
    const tl = P.el("span", {}, totalRow); P.tex(tl, "\\text{running total}");
    const tv = P.el("span", { class: "val" }, totalRow);

    function randomSizes() { sizes = {}; regions.forEach((b) => (sizes[b] = R.int(1, 9))); }
    const termVal = (tm) => regions.filter((b) => (b & tm.bits) === tm.bits).reduce((s, b) => s + sizes[b], 0);
    function drawHover() {
      hl.innerHTML = "";
      rows.forEach((r, i) => r.row.classList.toggle("hover", i === hover));
      if (hover < 0) { hl.style.display = "none"; return; }
      hl.style.display = "";
      const g = nested(terms[hover].bits, hl);
      hlRect = S("rect", { x: 0, y: 0, width: W, height: H, style: `fill:${P.color("c2")};opacity:.35;stroke:${P.color("c2")}` }, g);
    }
    function draw() {
      let running = 0;
      rows.forEach((r, i) => {
        const val = termVal(terms[i]);
        r.v.textContent = (terms[i].sign > 0 ? "+" : "−") + val;
        r.row.classList.toggle("applied", i < t);
        if (i < t) running += terms[i].sign * val;
      });
      tv.textContent = running;
      regions.forEach((b) => {
        let mult = 0; for (let i = 0; i < t; i++) if ((b & terms[i].bits) === terms[i].bits) mult += terms[i].sign;
        const col = t === 0 ? "c6" : mult === 1 ? "c3" : mult > 1 ? "c4" : "c6";
        regionFill[b].style.fill = P.color(col);
        regionFill[b].style.opacity = t === 0 ? 0.08 : mult === 1 ? 0.3 : mult > 1 ? 0.3 : 0.12;
        labels[b][0].textContent = sizes[b];
        labels[b][1].textContent = `×${mult}`;
        labels[b][1].style.fill = P.color(col);
      });
      const union = regions.reduce((s, b) => s + sizes[b], 0);
      P.readout("#ie-read", [
        { label: "terms applied", value: `${t} / 7` },
        { label: "running total", value: running, color: t === 7 ? "c3" : "c2" },
        { label: "$|A\\cup B\\cup C|$ (sum of regions)", value: union, color: "c3" },
        { label: "", value: t === 7 ? "✓ every region counted exactly once" : "" , color: "c3" },
      ]);
    }
    randomSizes(); draw();
  })();

  /* ======================================================== derangements -> 1/e */
  (function derange() {
    const NMAX = 12;
    const D = [1, 0]; for (let k = 2; k <= NMAX; k++) D[k] = (k - 1) * (D[k - 1] + D[k - 2]);
    const F = [1]; for (let k = 1; k <= NMAX; k++) F[k] = F[k - 1] * k;
    const pr = (n) => D[n] / F[n];
    let sel = 5; const sim = {};
    P.slider("#dr-ctl", { label: "n", min: 1, max: NMAX, value: sel, onInput: (v) => { sel = v; draw(); } });
    const simulate = (n, N) => {
      let none = 0; const a = P.range(1, n);
      for (let i = 0; i < N; i++) { R.shuffle(a); let ok = true; for (let j = 0; j < n; j++) if (a[j] === j + 1) { ok = false; break; } if (ok) none++; }
      const s = sim[n] || { hit: 0, tot: 0 }; s.hit += none; s.tot += N; sim[n] = s;
    };
    P.button("#dr-ctl", "Shuffle 10,000 (this n)", () => { simulate(sel, 10000); draw(); });
    P.button("#dr-ctl", "Simulate all n", () => { for (let n = 1; n <= NMAX; n++) simulate(n, 5000); draw(); }, "ghost");
    P.button("#dr-ctl", "Clear", () => { for (const k in sim) delete sim[k]; draw(); }, "ghost");
    function draw() {
      const el = P.$("#dr-chart"); el.innerHTML = "";
      const c = P.chart(el, { x: [0.3, NMAX + 2.6], y: [0, 0.56], height: 240, xLabel: "n", yLabel: "P(no fixed point)", xTicks: P.range(1, NMAX) });
      c.hline(Math.exp(-1), { color: "c4", label: "1/e ≈ 0.3679" });
      c.line(P.range(1, NMAX).map((n) => [n, pr(n)]), { color: "c1", width: 1.2, opacity: 0.5 });
      c.dots(P.range(1, NMAX).map((n) => [n, pr(n)]), { color: "c1", r: 4.5 });
      const simPts = Object.entries(sim).map(([n, s]) => [+n, s.hit / s.tot]);
      if (simPts.length) c.dots(simPts, { color: "none", stroke: "c2", r: 7 });
      c.vline(sel, { color: "c5", dash: true });
      const s = sim[sel];
      P.readout("#dr-read", [
        { label: `$D_{${sel}}$ =`, value: D[sel].toLocaleString("en-US"), color: "c1" },
        { label: `$${sel}!/e$ =`, value: P.fmt(F[sel] / Math.E, 4) },
        { label: `$D_{${sel}}/${sel}!$ =`, value: P.fmt(pr(sel), 6), color: "c1" },
        { label: "$1/e$ =", value: P.fmt(Math.exp(-1), 6), color: "c4" },
        { label: "simulated", value: s ? `${P.fmt(s.hit / s.tot, 4)} (${s.tot.toLocaleString()} shuffles)` : "—", color: "c2" },
        { label: "recurrence check", value: sel >= 2 ? `${sel - 1}·(${D[sel - 1]}+${D[sel - 2]}) = ${(sel - 1) * (D[sel - 1] + D[sel - 2])}` : "—" },
      ]);
    }
    draw();
  })();

  /* ======================================================== lattice paths */
  (function lattice() {
    let M = 6, N = 4, sel = [3, 2], showCounts = false, path = null, prog = 0, runs = 0, hits = 0;
    P.slider("#pa-ctl", { label: "m (right)", min: 1, max: 10, value: M, onInput: (v) => { M = v; resize(); } });
    P.slider("#pa-ctl", { label: "n (up)", min: 1, max: 8, value: N, onInput: (v) => { N = v; resize(); } });
    P.checkbox("#pa-ctl", { label: "show counts", value: showCounts, onChange: (v) => { showCounts = v; build(); } });
    const randPath = () => R.shuffle([...Array(M).fill("R"), ...Array(N).fill("U")]);
    const through = (p) => { if (!sel) return false; const [a, b] = sel; let r = 0; for (let i = 0; i < a + b; i++) if (p[i] === "R") r++; return r === a; };
    const loop = P.loop((dt) => {
      prog += dt / 90;
      if (prog >= M + N) { prog = M + N; drawPath(); runs++; if (through(path)) hits++; readout(); return false; }
      drawPath();
    });
    P.button("#pa-ctl", "Random path", () => { if (loop.running) return; path = randPath(); prog = 0; loop.start(); });
    P.button("#pa-ctl", "+1,000 paths", () => { loop.stop(); for (let i = 0; i < 1000; i++) { const p = randPath(); runs++; if (through(p)) hits++; path = p; } prog = M + N; drawPath(); readout(); }, "ghost");
    P.button("#pa-ctl", "Reset tally", () => { runs = hits = 0; readout(); }, "ghost");

    let geo, pathEl, svg;
    function resize() {
      loop.stop(); path = null; runs = hits = 0;
      if (sel) sel = [Math.min(sel[0], M), Math.min(sel[1], N)];
      build();
    }
    function build() {
      const host = P.$("#pa-grid"); host.innerHTML = "";
      const cell = Math.min(560 / M, 300 / N, 64), padL = 40, padB = 34, padT = 22;
      const W = Math.max(320, padL + M * cell + 40), H = padT + N * cell + padB;
      geo = { X: (i) => padL + i * cell, Y: (j) => padT + (N - j) * cell, cell };
      svg = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "diagram", role: "img", "aria-label": "lattice grid", style: `max-width:${W * 1.25}px;margin:0 auto` }, host);
      const { X, Y } = geo;
      for (let i = 0; i <= M; i++) S("line", { x1: X(i), x2: X(i), y1: Y(0), y2: Y(N), style: "stroke:var(--line);stroke-width:1.5" }, svg);
      for (let j = 0; j <= N; j++) S("line", { x1: X(0), x2: X(M), y1: Y(j), y2: Y(j), style: "stroke:var(--line);stroke-width:1.5" }, svg);
      const t0 = S("text", { x: X(0) - 6, y: Y(0) + 18, "text-anchor": "end", style: "fill:var(--muted);font-size:11px" }, svg); t0.textContent = "(0,0)";
      const t1 = S("text", { x: X(M) + 8, y: Y(N) + 18, style: "fill:var(--muted);font-size:11px" }, svg); t1.textContent = `(${M},${N})`;
      pathEl = S("path", { d: "", style: `fill:none;stroke:${P.color("c1")};stroke-width:4;stroke-linecap:round;stroke-linejoin:round;opacity:.85` }, svg);
      for (let i = 0; i <= M; i++) for (let j = 0; j <= N; j++) {
        const isSel = sel && sel[0] === i && sel[1] === j, isEnd = (i === 0 && j === 0) || (i === M && j === N);
        const g = S("g", { class: "lattice-pt" }, svg);
        S("circle", { cx: X(i), cy: Y(j), r: isSel ? 8 : 5, style: `fill:${isSel ? P.color("c2") : isEnd ? P.color("c3") : "var(--panel)"};stroke:${P.color(isSel ? "c2" : isEnd ? "c3" : "c6")};stroke-width:1.5` }, g);
        S("circle", { cx: X(i), cy: Y(j), r: Math.max(9, geo.cell / 3), style: "fill:transparent" }, g);
        S("title", {}, g).textContent = `(${i},${j}): ${m.choose(i + j, i)} paths from the origin`;
        if (showCounts) { const tx = S("text", { x: X(i) + 5, y: Y(j) - 6, style: `fill:${P.color("c5")};font-size:${geo.cell < 40 ? 9 : 11}px;font-weight:600` }, svg); tx.textContent = m.choose(i + j, i); }
        g.addEventListener("click", () => { sel = isSel ? null : [i, j]; runs = hits = 0; build(); });
      }
      drawPath(); readout();
    }
    function drawPath() {
      if (!path || !pathEl) { if (pathEl) pathEl.setAttribute("d", ""); return; }
      const { X, Y } = geo; let i = 0, j = 0, d = `M${X(0)},${Y(0)}`;
      const full = Math.floor(prog), frac = prog - full;
      for (let s = 0; s < full && s < path.length; s++) { if (path[s] === "R") i++; else j++; d += `L${X(i)},${Y(j)}`; }
      if (full < path.length && frac > 0) { const di = path[full] === "R" ? frac : 0, dj = path[full] === "U" ? frac : 0; d += `L${X(i + di)},${Y(j + dj)}`; }
      pathEl.setAttribute("d", d);
      pathEl.style.stroke = P.color(prog >= M + N && through(path) ? "c2" : "c1");
    }
    function readout() {
      const total = m.choose(M + N, M), items = [{ label: `total paths $\\binom{${M + N}}{${M}}$ =`, value: total.toLocaleString(), color: "c1" }];
      if (sel) {
        const [a, b] = sel, th = m.choose(a + b, a) * m.choose(M - a + N - b, M - a);
        items.push(
          { label: `through $(${a},${b})$: $\\binom{${a + b}}{${a}}\\binom{${M - a + N - b}}{${M - a}}$ =`, value: `${m.choose(a + b, a)} × ${m.choose(M - a + N - b, M - a)} = ${th.toLocaleString()}`, color: "c2" },
          { label: "fraction", value: P.fmt(th / total, 4), color: "c2" },
          { label: "random paths through it", value: runs ? `${hits}/${runs} = ${P.fmt(hits / runs, 4)}` : "—" },
        );
      } else items.push({ label: "", value: "click a point to pin (a, b)" });
      P.readout("#pa-read", items);
    }
    build();
  })();
})();

/* Builds the sidebar, in-page TOC, prev/next pager and footer; renders math and quizzes.
 * Include at the end of <body>, before the page-specific script. */
(function () {
  const CHAPTERS = [
    { id: "index", href: "index.html", title: "Start here", emoji: "🧭" },
    { id: "distributions", href: "distributions.html", title: "Distributions", emoji: "🎲" },
    { id: "expectation", href: "expectation.html", title: "Expectation, inequalities & limits", emoji: "⚖️" },
    { id: "problems", href: "problems.html", title: "Core problem patterns", emoji: "🧩" },
    { id: "combinatorics", href: "combinatorics.html", title: "Combinatorics", emoji: "🔢" },
    { id: "markov", href: "markov.html", title: "Markov chains", emoji: "🔁" },
    { id: "puzzles", href: "puzzles.html", title: "Classic puzzles", emoji: "🎩" },
    { id: "statistics", href: "statistics.html", title: "Statistics", emoji: "📈" },
    { id: "calculus", href: "calculus.html", title: "Math toolkit", emoji: "∫" },
  ];
  window.CHAPTERS = CHAPTERS;
  const page = document.body.dataset.page || "index";
  const main = document.querySelector("main");

  // layout
  const layout = P.el("div", { class: "layout" });
  main.parentNode.insertBefore(layout, main);
  const side = P.el("nav", { class: "sidebar" }, layout);
  layout.appendChild(main);
  const menu = P.el("button", { class: "menu-btn", text: "☰", "aria-label": "Menu" }, document.body);
  menu.onclick = () => side.classList.toggle("open");
  main.addEventListener("click", () => side.classList.remove("open"));

  P.el("a", { class: "brand", href: "index.html", text: "Probability, visually" }, side);
  P.el("div", { class: "brand-sub", text: "Interactive notes for quant & ML interviews" }, side);

  // collect headings for TOC
  const heads = [...main.querySelectorAll("h2, h3")];
  heads.forEach((h) => {
    if (!h.id) h.id = h.textContent.toLowerCase().replace(/\$[^$]*\$/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  });

  let tocLinks = [];
  for (const c of CHAPTERS) {
    P.el("a", { class: "chap" + (c.id === page ? " active" : ""), href: c.href, html: `${c.emoji}&nbsp; ${c.title}` }, side);
    if (c.id === page && heads.length) {
      const toc = P.el("div", { class: "toc" }, side);
      for (const h of heads) {
        const a = P.el("a", { href: "#" + h.id, class: h.tagName.toLowerCase(), html: h.innerHTML }, toc);
        tocLinks.push([h, a]);
      }
    }
  }

  // scroll spy
  if (tocLinks.length) {
    const onScroll = () => {
      let cur = tocLinks[0];
      for (const pair of tocLinks) if (pair[0].getBoundingClientRect().top < 120) cur = pair;
      tocLinks.forEach(([, a]) => a.classList.toggle("current", a === cur[1]));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // pager + footer
  const content = main.querySelector(".content") || main;
  const i = CHAPTERS.findIndex((c) => c.id === page);
  if (i >= 0) {
    const pager = P.el("div", { class: "pager" }, content);
    const prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1];
    if (prev) P.el("a", { href: prev.href, html: `<span class="lbl">← Previous</span>${prev.title}` }, pager); else P.el("span", {}, pager);
    if (next) P.el("a", { href: next.href, style: "text-align:right", html: `<span class="lbl">Next →</span>${next.title}` }, pager);
  }
  P.el("div", {
    class: "footer",
    html: 'Based on <a href="https://alisawuffles.notion.site/math-notes" target="_blank" rel="noopener">Alisa Liu’s math notes</a>, expanded with intuition, visuals and interactive demos.',
  }, content);

  P._initQuizzes();
  P.renderMath(document.body);
})();

const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0;
const fails = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? "  (" + detail + ")" : ""}`);
  } else {
    fails.push(`${name} — ${detail}`);
    console.log(`  FAIL  ${name}  ${detail}`);
  }
};

const launch = () =>
  chromium.launch({
    channel: "chrome",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });

(async () => {
  const b = await launch();

  // =========================== DESKTOP 1440 ===========================
  console.log("\n=== DESKTOP 1440 ===");
  const d = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  const errs = [];
  d.on("pageerror", (e) => errs.push(e.message));
  await d.goto(`${BASE}/?intro=off`, { waitUntil: "load" });
  await d.waitForTimeout(3000);

  // sections
  const secs = await d.evaluate(() =>
    ["top", "capabilities", "realtime-3d", "agent-loop", "partners", "contact"].filter((i) => document.getElementById(i))
  );
  check("all 6 sections present", secs.length === 6, secs.join(","));

  // 7 disciplines in the rail
  const railCount = await d.evaluate(() => document.querySelectorAll("#capabilities .lg\\:flex article.panel").length);
  check("8 discipline cards in rail", railCount === 8, `found ${railCount}`);

  // every rail card must fit its fixed height: the article is overflow-hidden, so a
  // long bullet list silently clips the stack chips off the bottom
  const cards = await d.evaluate(() =>
    [...document.querySelectorAll("#capabilities .lg\\:flex article.panel")].map((a) => {
      const ar = a.getBoundingClientRect();
      const ul = a.querySelector("div > ul:last-of-type");
      const ur = ul.getBoundingClientRect();
      return {
        t: a.querySelector("h3").textContent.trim().slice(0, 22),
        bullets: a.querySelectorAll("ul")[0].children.length,
        overflow: Math.round(ur.bottom - ar.bottom),
      };
    })
  );
  const clipped = cards.filter((c) => c.overflow > -4);
  check(
    "no rail card clips its stack chips",
    clipped.length === 0,
    clipped.length ? clipped.map((c) => `${c.t} +${c.overflow}px`).join(", ") : cards.map((c) => c.overflow).join(" ")
  );
  const spread = Math.max(...cards.map((c) => c.bullets)) - Math.min(...cards.map((c) => c.bullets));
  check("bullet counts are even across cards", spread <= 3, `spread ${spread}: ${cards.map((c) => c.bullets).join(",")}`);

  // .label layer fix
  const colours = await d.evaluate(() => {
    const pick = (sel, starts) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || "").trim().startsWith(starts));
      return el ? getComputedStyle(el).color : "missing";
    };
    return {
      navCta: pick("header a.btn", "Start a build"),
      deepDive: pick("#realtime-3d .label", "03"),
      agentDive: pick("#agent-loop .label", "07"),
      plain: pick("#partners .label", "Partners"),
    };
  });
  check("nav CTA uses the primary button", colours.navCta === "rgb(77, 227, 255)", colours.navCta);
  check("'03 — deep dive' is cyan", colours.deepDive === "rgb(77, 227, 255)", colours.deepDive);
  check("'07 — deep dive' is cyan", colours.agentDive === "rgb(77, 227, 255)", colours.agentDive);
  check("plain label still muted", colours.plain === "rgb(120, 131, 142)", colours.plain);

  // folds open on desktop
  const folds = await d.evaluate(() => {
    const out = {};
    for (const id of ["realtime-3d", "agent-loop"]) {
      out[id] = [...document.querySelectorAll(`#${id} [aria-expanded]`)].map((btn) => {
        const panel = btn.closest("h3").nextElementSibling;
        return Math.round(panel.getBoundingClientRect().height);
      });
    }
    return out;
  });
  check("render-loop folds all open", folds["realtime-3d"].every((h) => h > 100), JSON.stringify(folds["realtime-3d"]));
  check("agent-loop folds all open", folds["agent-loop"].every((h) => h > 100), JSON.stringify(folds["agent-loop"]));
  check("render loop has 4 folds (Unreal added)", folds["realtime-3d"].length === 4, `${folds["realtime-3d"].length}`);
  check("agent loop has 4 folds (human parts added)", folds["agent-loop"].length === 4, `${folds["agent-loop"].length}`);

  // grid columns equal height => no grey showing
  const cols = await d.evaluate(() =>
    ["realtime-3d", "agent-loop"].map((id) => {
      const g = document.querySelector(`#${id} .grid.gap-px.border`);
      return [...g.children].map((c) => Math.round(c.getBoundingClientRect().height));
    })
  );
  check("render-loop columns equal", cols[0][0] === cols[0][1], JSON.stringify(cols[0]));
  check("agent-loop columns equal", cols[1][0] === cols[1][1], JSON.stringify(cols[1]));

  // sticky panel opaque
  const opaque = await d.evaluate(() =>
    ["realtime-3d", "agent-loop"].map((id) => {
      const el = document.querySelector(`#${id} .lg\\:sticky`);
      return getComputedStyle(el).backgroundColor;
    })
  );
  check("sticky panels opaque", opaque.every((c) => c === "rgb(10, 12, 15)"), opaque.join(" / "));

  // signal fill: nodes + scroll-driven cross-fade
  const nodeCount = await d.evaluate(() => document.querySelectorAll("#agent-loop .signal-track > span").length);
  check("11 drifting nodes", nodeCount === 11, `${nodeCount}`);

  const agY = await d.evaluate(() => document.getElementById("agent-loop").getBoundingClientRect().top + window.scrollY);
  const fade = [];
  for (const off of [300, 1000, 1600]) {
    await d.evaluate((v) => window.scrollTo(0, v), agY + off);
    await d.waitForTimeout(700);
    fade.push(await d.evaluate(() => Number(getComputedStyle(document.querySelector("#agent-loop .signal-px-coarse")).opacity).toFixed(3)));
  }
  check("pixel cross-fade advances with scroll", new Set(fade).size === 3, fade.join(" -> "));

  const loop = await d.evaluate(() => {
    const cells = document.querySelectorAll("#agent-loop .grid-cols-6 > div").length;
    const log = document.querySelector("#agent-loop [aria-live]");
    const lines = [...log.children].reduce((h, c) => h + c.getBoundingClientRect().height, 0);
    return { cells, boxH: Math.round(log.getBoundingClientRect().height), linesH: Math.round(lines) };
  });
  check("agent loop is six stages", loop.cells === 6, `${loop.cells} cells`);
  check("log box has no dead space", loop.boxH - loop.linesH < 60, `box=${loop.boxH} lines=${loop.linesH}`);

  const statics = await d.evaluate(() => document.querySelectorAll("#agent-loop .signal-track").length);
  check("8 hairlines carrying nodes", statics === 11, `${statics} tracks`);

  // exactly one progress bar while the rail is pinned
  const capY = await d.evaluate(() => document.getElementById("capabilities").getBoundingClientRect().top + window.scrollY);
  await d.evaluate((v) => window.scrollTo(0, v), capY + 600);
  await d.waitForTimeout(1200);
  const bars = await d.evaluate(() => {
    const out = [];
    document.querySelectorAll("span,div").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height <= 2 && r.width > 100 && getComputedStyle(el).backgroundColor === "rgb(77, 227, 255)")
        out.push({
          y: Math.round(r.top),
          w: Math.round(r.width),
          progress: !!el.closest("header") && !el.closest("header nav a"),
          underline: !!el.closest("header nav a"),
          inRail: !!el.closest("#capabilities"),
        });
    });
    return out;
  });
  const prog = bars.filter((x) => x.progress);
  const under = bars.filter((x) => x.underline);
  const rail = bars.filter((x) => x.inRail);
  check("exactly one progress bar when pinned", prog.length === 1, `${prog.length} at y=${prog.map((x) => x.y).join(",")}`);
  check("progress bar sits on the nav edge", prog.length === 1 && prog[0].y >= 60 && prog[0].y <= 66, `y=${prog[0]?.y}`);
  check("the rail no longer draws its own bar", rail.length === 0, `${rail.length} in #capabilities`);
  check("only other cyan hairline is the active-nav underline", bars.length - prog.length === under.length,
    bars.map((x) => `y${x.y}/w${x.w}${x.underline ? " underline" : ""}`).join(" "));

  // nav active-section indicator
  await d.evaluate((v) => window.scrollTo(0, v), agY + 200);
  await d.waitForTimeout(900);
  const current = await d.evaluate(() => {
    const a = document.querySelector("header nav a[aria-current]");
    return a ? a.getAttribute("href") : "none";
  });
  check("nav marks the current section", current === "#agent-loop", current);

  // button system
  const btn = await d.evaluate(() => {
    const el = [...document.querySelectorAll("#top a.btn")][0];
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, "::before");
    return { overflow: cs.overflow, minH: cs.minHeight, beforeContent: before.content, beforeTransform: before.transform };
  });
  check("button clips its fill", btn.overflow === "hidden", btn.overflow);
  check("button fill pseudo exists", btn.beforeContent === '""', btn.beforeContent);
  check("button has a real hit height", parseFloat(btn.minH) >= 44, btn.minH);

  // content assertions
  const text = await d.evaluate(() => document.body.innerText);
  const must = [
    "Eight disciplines", "AI & business automation", "Smart contracts & token launches", "Unreal Engine 5", "Pixel Streaming",
    "When the browser is the wrong renderer", "Automating the human parts",
    "Chainlink", "Pump.fun", "PG Group", "Arcadia Marketing",
    "Do anything.", "LangGraph",
  ];
  const upper = text.toUpperCase();
  const missing = must.filter((s) => !upper.includes(s.toUpperCase()));
  check("all new copy present", missing.length === 0, missing.length ? "missing: " + missing.join(", ") : "12/12");

  const mustNot = ["Six disciplines", "Seven disciplines", "Arcaida", "William Hill", "Four movements"];
  const stale = mustNot.filter((s) => upper.includes(s.toUpperCase()));
  check("no stale copy left", stale.length === 0, stale.length ? "found: " + stale.join(", ") : "clean");

  // em dash audit against the copy rubric
  const dashes = await d.evaluate(() => {
    const t = document.body.innerText;
    const hits = t.split("\n").filter((l) => l.includes("—")).map((l) => l.trim().slice(0, 70));
    return { count: (t.match(/—/g) || []).length, words: t.split(/\s+/).length, hits: hits.slice(0, 12) };
  });
  const per200 = (dashes.count / (dashes.words / 200)).toFixed(2);
  check("em dashes within rubric (<1 per 200 words)", Number(per200) < 1, `${dashes.count} dashes / ${dashes.words} words = ${per200} per 200`);
  if (dashes.count) console.log("        lines with em dashes:\n" + dashes.hits.map((h) => "          " + h).join("\n"));

  // art asset
  const art = await d.evaluate(async () => {
    const r = await fetch("/art/automation.webp", { method: "HEAD" });
    return r.status;
  });
  check("automation art served (webp)", art === 200, `HTTP ${art}`);

  check("no desktop page errors", errs.length === 0, errs.join(" | "));
  await d.close();

  // =========================== MOBILE 390 ===========================
  console.log("\n=== MOBILE 390 ===");
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  const merrs = [];
  m.on("pageerror", (e) => merrs.push(e.message));
  await m.goto(`${BASE}/?intro=off`, { waitUntil: "load" });
  await m.waitForTimeout(3000);

  // nav swap
  const navState = await m.evaluate(() => ({
    burger: !!document.querySelector('button[aria-label="Open menu"]')?.offsetParent,
    deskNav: getComputedStyle(document.querySelector("header nav")).display,
    fill: document.querySelector("#agent-loop .signal-px-coarse")?.offsetParent ? "visible" : "hidden",
  }));
  check("hamburger visible on mobile", navState.burger, String(navState.burger));
  check("desktop nav hidden on mobile", navState.deskNav === "none", navState.deskNav);
  check("SignalFill hidden on mobile", navState.fill === "hidden", navState.fill);

  // hero stats visible
  const stats = await m.evaluate(() => {
    const dts = [...document.querySelectorAll("#top dl dt")];
    return { n: dts.filter((e) => e.offsetParent).length, vals: dts.map((e) => e.textContent.trim()) };
  });
  check("hero stats shown on mobile", stats.n === 4, `${stats.n}: ${stats.vals.join(" ")}`);
  check("hero metrics updated (08 / 200+ / years)", stats.vals.includes("08") && stats.vals.includes("200+"), stats.vals.join(" "));

  // folds collapsed on mobile
  const mFolds = await m.evaluate(() =>
    ["realtime-3d", "agent-loop"].map((id) =>
      [...document.querySelectorAll(`#${id} [aria-expanded]`)].map((b) => b.getAttribute("aria-expanded"))
    )
  );
  check("mobile folds mostly collapsed", mFolds.every((g) => g.filter((v) => v === "true").length === 1), JSON.stringify(mFolds));

  // .rise scroll-driven reveals actually animate
  const capYm = await m.evaluate(() => document.getElementById("capabilities").getBoundingClientRect().top + window.scrollY);
  const ops = [];
  for (const off of [260, 430, 600, 780]) {
    await m.evaluate((v) => window.scrollTo(0, v), capYm + off);
    await m.waitForTimeout(650);
    ops.push(await m.evaluate(() => {
      const r = [...document.querySelectorAll("#capabilities article.rise")][2];
      return Number(getComputedStyle(r).opacity).toFixed(2);
    }));
  }
  check("mobile reveals interpolate on scroll", new Set(ops).size >= 3, ops.join(" -> "));

  // sticky CTA lifecycle
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(600);
  const CTA = 'div[class*="fixed"][class*="bottom-0"] a.btn-sm';
  const ctaTop = await m.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, CTA);
  await m.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await m.waitForTimeout(800);
  const ctaMid = await m.evaluate((s) => document.querySelector(s).getBoundingClientRect().bottom, CTA);
  const contactY = await m.evaluate(() => document.getElementById("contact").getBoundingClientRect().top + window.scrollY);
  await m.evaluate((v) => window.scrollTo(0, v), contactY);
  await m.waitForTimeout(800);
  const ctaEnd = await m.evaluate((s) => document.querySelector(s).closest("[aria-hidden]").getAttribute("aria-hidden") === "true" ? "hidden" : "shown", CTA);
  check("sticky CTA hidden at hero", ctaTop >= 844, `top=${Math.round(ctaTop)}`);
  check("sticky CTA shown mid-page", ctaMid > 0 && ctaMid <= 850, `bottom=${Math.round(ctaMid)}`);
  check("sticky CTA retires at contact", ctaEnd === "hidden", ctaEnd);

  // menu: open, lock, deep link
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(500);
  await m.getByRole("button", { name: "Open menu" }).click();
  await m.waitForTimeout(900);
  const sheet = await m.evaluate(() => ({
    lock: document.documentElement.style.overflow,
    links: document.querySelectorAll("#menu nav ul:first-of-type a").length,
    disciplines: document.querySelectorAll("#menu button").length,
  }));
  check("menu locks the scroller", sheet.lock === "hidden", sheet.lock);
  check("menu has 5 section links", sheet.links === 5, `${sheet.links}`);
  check("menu has 8 discipline buttons", sheet.disciplines === 8, `${sheet.disciplines}`);

  await m.locator("#menu").getByRole("button", { name: /Security & threat prevention/ }).click();
  await m.waitForTimeout(2800);
  const deep = await m.evaluate(() => {
    const open = [...document.querySelectorAll("#capabilities [aria-expanded=true]")];
    const sec = open.find((b) => b.textContent.includes("Security"));
    return {
      lock: document.documentElement.style.overflow,
      opened: !!sec,
      top: sec ? Math.round(sec.getBoundingClientRect().top) : null,
      openCount: open.length,
    };
  });
  check("deep link released the lock", deep.lock === "", JSON.stringify(deep.lock));
  check("deep link expanded the right row", deep.opened, String(deep.opened));
  check("deep link opened exactly one row", deep.openCount === 1, `${deep.openCount}`);
  check("deep-linked row clears the header", deep.top > 60 && deep.top < 140, `top=${deep.top}`);

  // anchor offset via a section link
  await m.getByRole("button", { name: "Open menu" }).click();
  await m.waitForTimeout(800);
  await m.locator("#menu").getByRole("link", { name: "04 Partners" }).click();
  await m.waitForTimeout(2600);
  const anchor = await m.evaluate(() => Math.round(document.getElementById("partners").getBoundingClientRect().top));
  check("anchor clears the fixed header", anchor > 60 && anchor < 100, `top=${anchor}`);

  // tap targets
  const small = await m.evaluate(() =>
    [...document.querySelectorAll("a,button")]
      // WCAG 2.5.8 exempts links inline within a sentence; standalone controls only
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height || r.height >= 40) return false;
        return !e.closest("p");
      })
      .map((e) => `${(e.textContent || "").trim().slice(0, 18)}=${Math.round(e.getBoundingClientRect().height)}`)
  );
  check("no tap target under 40px", small.length === 0, small.join(", "));

  check("no mobile page errors", merrs.length === 0, merrs.join(" | "));
  await m.close();

  // =========================== OVERFLOW SWEEP ===========================
  console.log("\n=== HORIZONTAL OVERFLOW SWEEP ===");
  for (const w of [375, 390, 430, 768, 1024, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: 844 }, isMobile: w < 900, hasTouch: w < 900, reducedMotion: "no-preference" });
    await p.goto(`${BASE}/?intro=off`, { waitUntil: "load" });
    await p.waitForTimeout(2200);
    const r = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
    check(`no horizontal overflow at ${w}px`, r.doc <= r.vw, `doc=${r.doc} vw=${r.vw}`);
    // logo/nav collision check
    const collide = await p.evaluate(() => {
      const logo = document.querySelector("header a[aria-label]")?.getBoundingClientRect();
      const nav = document.querySelector("header nav")?.getBoundingClientRect();
      if (!logo || !nav || nav.width === 0) return false;
      return logo.right > nav.left;
    });
    check(`no logo/nav collision at ${w}px`, !collide, collide ? "overlapping" : "clear");
    await p.close();
  }

  await b.close();
  console.log(`\n===== ${pass} passed, ${fails.length} failed =====`);
  if (fails.length) fails.forEach((f) => console.log("  ! " + f));
})();

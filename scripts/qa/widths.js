const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3000";
const WIDTHS = [320, 360, 390, 430, 500, 560, 600, 620, 640, 660, 700, 768, 820, 860, 900, 960, 1024, 1180, 1440];

(async () => {
  const b = await chromium.launch({ channel:"chrome", args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
  const problems = [];
  for (const w of WIDTHS) {
    const p = await b.newPage({ viewport:{width:w,height:900}, isMobile:w<900, hasTouch:w<900, reducedMotion:"no-preference" });
    await p.goto(`${BASE}/?intro=off`, { waitUntil:"load" });
    await p.waitForTimeout(1800);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(1400);

    const r = await p.evaluate(() => {
      const out = { overlaps: [], clipped: [], footer: null };
      const f = document.querySelector("footer");
      if (f) {
        const kids = [...f.querySelectorAll("footer > div > *")].map(el => {
          const b = el.getBoundingClientRect();
          return { t: (el.textContent||"").trim().replace(/\s+/g," ").slice(0,26), l: Math.round(b.left), r: Math.round(b.right), top: Math.round(b.top), bot: Math.round(b.bottom), w: Math.round(b.width) };
        });
        out.footer = kids;
        for (let i=0;i<kids.length;i++) for (let j=i+1;j<kids.length;j++) {
          const a=kids[i], c=kids[j];
          const xo = Math.min(a.r,c.r) - Math.max(a.l,c.l);
          const yo = Math.min(a.bot,c.bot) - Math.max(a.top,c.top);
          if (xo > 1 && yo > 1) out.overlaps.push(`${a.t} ×  ${c.t} (${xo}px)`);
        }
      }
      // any element whose text is wider than its box
      document.querySelectorAll("footer *, #contact *").forEach(el => {
        if (el.children.length) return;
        if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0)
          out.clipped.push(`${(el.textContent||"").trim().slice(0,26)} (${el.scrollWidth}>${el.clientWidth})`);
      });
      return out;
    });
    if (r.overlaps.length || r.clipped.length) {
      problems.push({ w, ...r });
      console.log(`\n${w}px:`);
      r.overlaps.forEach(o => console.log("   OVERLAP  " + o));
      r.clipped.forEach(c => console.log("   CLIPPED  " + c));
      if (r.footer) r.footer.forEach(k => console.log(`     [${k.l}→${k.r}] y${k.top}-${k.bot}  "${k.t}"`));
    } else {
      console.log(`${w}px: clean`);
    }
    await p.close();
  }
  await b.close();
  console.log(`\n===== ${problems.length} widths with problems =====`);
})();

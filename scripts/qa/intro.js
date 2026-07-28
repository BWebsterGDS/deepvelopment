const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3000";
const PLATE = ".fixed.inset-0.z-\\[100\\]";
const PLATE_CANVAS = `${PLATE} canvas`;
let pass = 0; const fails = [];
const ck = (n, ok, d = "") => { if (ok) { pass++; console.log(`  PASS  ${n}  ${d}`); } else { fails.push(n); console.log(`  FAIL  ${n}  ${d}`); } };

// The intro lives ~5s, so checks must happen inside that window; earlier versions raced
// it. Canvas lookups are scoped to the plate because PixelImage canvases are lazy now and
// sit at the 300x150 default until their image arrives.
const waitSized = (p) => p.waitForFunction((sel) => {
  const c = document.querySelector(sel); return !!c && c.width > 300;
}, PLATE_CANVAS, { timeout: 20000 });

const read = (p) => p.evaluate((sel) => {
  const c = document.querySelector(sel); if (!c) return null;
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return { bufW: c.width, bufH: c.height, expW: Math.round(r.width*dpr), expH: Math.round(r.height*dpr),
           bufAspect: +(c.width/c.height).toFixed(3), cssAspect: +(r.width/r.height).toFixed(3) };
}, PLATE_CANVAS);

(async () => {
  const b = await chromium.launch({ channel:"chrome", args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });

  console.log("\n-- cold load at each size --");
  for (const [w,h] of [[1440,900],[900,600],[700,900],[420,760],[360,780]]) {
    const p = await b.newPage({ viewport:{width:w,height:h}, reducedMotion:"no-preference" });
    await p.goto(BASE, { waitUntil:"commit" });
    await p.waitForSelector(PLATE, { timeout:20000 });
    await waitSized(p);
    const r = await read(p);
    ck(`cold ${w}x${h} undistorted`, r && Math.abs(r.bufAspect-r.cssAspect)<0.02, r?`buffer ${r.bufAspect} vs css ${r.cssAspect}`:"no canvas");
    ck(`cold ${w}x${h} buffer matches viewport`, r && Math.abs(r.bufW-r.expW)<=2 && Math.abs(r.bufH-r.expH)<=2, r?`${r.bufW}x${r.bufH} vs ${r.expW}x${r.expH}`:"");
    await p.close();
  }

  console.log("\n-- resize while the intro is up --");
  const p = await b.newPage({ viewport:{width:1440,height:900}, reducedMotion:"no-preference" });
  await p.goto(BASE, { waitUntil:"commit" });
  await p.waitForSelector(PLATE, { timeout:20000 });
  await waitSized(p);
  for (const [w,h] of [[760,880],[1180,560]]) {
    await p.setViewportSize({ width:w, height:h });
    await p.waitForTimeout(260);
    const r = await read(p);
    if (!r) { ck(`resize to ${w}x${h}`, false, "plate gone before check"); continue; }
    ck(`resize ${w}x${h} follows viewport`, Math.abs(r.bufW-r.expW)<=2 && Math.abs(r.bufH-r.expH)<=2, `${r.bufW}x${r.bufH} vs ${r.expW}x${r.expH}`);
    ck(`resize ${w}x${h} undistorted`, Math.abs(r.bufAspect-r.cssAspect)<0.02, `buffer ${r.bufAspect} vs css ${r.cssAspect}`);
  }
  await p.close();

  const q = await b.newPage({ viewport:{width:420,height:760}, reducedMotion:"no-preference" });
  await q.goto(BASE, { waitUntil:"commit" });
  await q.waitForSelector(PLATE, { timeout:20000 });
  await q.waitForFunction((sel)=>!document.querySelector(sel), PLATE, { timeout:20000 });
  ck("intro completes and clears at 420x760", true, "");
  await q.close();

  await b.close();
  console.log(`\n===== ${pass} passed, ${fails.length} failed =====`);
})();

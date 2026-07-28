# READ FIRST

You have a copy of the Deepvelopment site. Two production deployments exist —
[deepvelopment-pixel.vercel.app](https://deepvelopment-pixel.vercel.app) (the chosen
intro) and [deepvelopment-mask.vercel.app](https://deepvelopment-mask.vercel.app) — and
**nothing you push to this repo touches either of them**. Deploys are manual, from a
linked machine, through the Vercel CLI. Clone it, break it, experiment freely.

This file is the contract. It exists because most of what is fragile in this codebase
is invisible: the site looks simple and is full of load-bearing decisions. Every rule
below was paid for with a real bug, and the receipts are in
[`docs/GOTCHAS.md`](docs/GOTCHAS.md) — 36 of them, symptom → cause → fix. Read that
file the moment something behaves strangely, and add to it when a diagnosis costs you
more than twenty minutes.

```bash
npm install
npm run dev        # http://localhost:3000
npm run qa         # full assertion suite against your dev server (needs Chrome)
```

QA hatch: `http://localhost:3000/?intro=off` skips the loading animation.

---

## 1. The sixty-second mental model

- **`components/Intro.tsx`** plays the pixel-dissolve loading animation, holds the page
  scroll-locked, and on finish writes to **`lib/reveal.ts`** — a tiny module-level
  store, not React context. `reveal.intro` (0→1) drives the hero un-pixelating,
  `reveal.heroOut` (0→1, written by `SmoothScroll` from scroll position) re-pixelates
  it as you leave. CSS custom properties `--intro-p` and `--hero-out` mirror them for
  non-canvas elements.
- **`components/SmoothScroll.tsx`** owns Lenis + ScrollTrigger, the anchor-click
  handling, and the scroll-lock implementations.
- **`app/page.tsx`** is the section order. **`lib/content.ts`** is every word of copy.
  **`app/start/`** is the enquiry form with a server action that writes to a private
  Vercel Blob store.
- The intro variant is chosen **at build time** via `NEXT_PUBLIC_INTRO` (`pixel` is
  the default, `mask` builds the other site). `?intro=pixel|mask|off` overrides it at
  runtime for QA only.
- `components/SiteChrome.tsx` gates the intro and the nav to `/` only. The `/start`
  route must never mount them — see rule 4.

---

## 2. Hard rules — break these and the site breaks

These are absolute. Each one maps to an entry in `docs/GOTCHAS.md` if you want the
full story.

1. **Custom CSS classes live inside `@layer components`.** An unlayered class beats
   every Tailwind utility regardless of specificity, silently. `label text-acc`
   rendered grey for a full day because of this.

2. **1024px (`lg:`) is the only layout-switch breakpoint.** The rail↔accordion swap,
   the nav, the folds, the GSAP `matchMedia` — all of them. A second breakpoint
   creates a viewport band that gets neither layout or a nav that collides with the
   logo. If you add a responsive behaviour, it switches at `lg:` or not at all.

3. **Scroll-lock semantics.** `scrollLock.start()` releases the lock *and snaps to
   the top* — it is the intro's exit and nothing else may call it.
   `scrollLock.resume()` releases in place — menus, sheets, everything else. And only
   the home route may ever engage the lock: `SmoothScroll` guards this, keep it
   guarded, or `/start` loads permanently unscrollable.

4. **Scroll-driven CSS animations** (`animation-timeline: view()` — the mobile
   `.rise` reveals, the SignalFill cross-fade):
   - No `overflow: hidden` ancestor between the element and the document scroller,
     or the timeline resolves against a box that never scrolls and freezes.
   - `animation-duration: auto` set explicitly as a longhand. The `animation`
     shorthand resets it to `0s`, which pins the element at one keyframe — and it
     freezes on the *end* state, so it looks fine and is not.

5. **All easing and damping is per-second, never per-frame.**
   `x += (target - x) * (1 - Math.pow(k, dt))`. A bare per-frame constant runs twice
   as fast on a 120Hz display.

6. **Canvas backing stores follow the viewport.** Every canvas (intro, hero,
   PixelImage) resizes its buffer on `resize` *and* `visualViewport` resize, or CSS
   stretches a stale bitmap. Assert on the buffer-to-CSS aspect ratio, not on how a
   screenshot looks.

7. **Ratio-based layout switches need hysteresis.** The intro's scroll lock removes
   the scrollbar; releasing it puts ~15px back. A hard `w/h < 0.95` test flipped the
   hero layout the moment the intro ended. Enter portrait below 0.95, leave above
   1.02.

8. **Images ship as WebP from `public/art/` (1376×768), lazily.** Source PNGs live in
   `art-src/` (kept out of deploys). `PixelImage` fetches only near the viewport.
   The cold mobile payload is ~0.1MB and was once 13MB — check the network tab, not
   the page, and keep it under 3MB forever.

9. **`gap-px` grids with a container background:** every cell must fill its track,
   and sticky panels must carry their own opaque background. Otherwise the container
   colour shows through as a grey slab, or content renders through the panel.

10. **Rail cards have a height budget.** `lg:h-[76vh]`, `overflow-hidden`: roughly 7
    bullets per discipline, and the stack chips must clear the card bottom. Longer
    copy silently amputates the chips. `npm run qa` measures this exactly.

11. **Unique `id`s across responsive variants.** The rail and the accordion render
    the same data — only the desktop article carries `id={s.id}`.

12. **Reduced motion is a real path, not a fallback.** `prefers-reduced-motion` skips
    the intro entirely (no lock left behind), stills render sharp, marquees stop, the
    3D shows a static frame. Test it deliberately; headless Chrome defaults *to* it,
    which is also why QA passes `reducedMotion: "no-preference"` explicitly.

13. **Secrets never enter the repo.** `.env.local` holds Vercel tokens and is
    gitignored — leave it that way. The enquiry Blob store is **private**
    (`access: "private"` in `app/start/actions.ts`); the payload is people's names
    and emails, so never flip it public. No keys in code, ever — this repo is public.

---

## 3. The 3D rules (read before touching any canvas)

Three scenes exist, deliberately different:

| Scene | File | Stack | Driven by |
|---|---|---|---|
| Hero | `components/HeroCanvas.tsx` | raw three.js + custom mosaic post-pass | `reveal.intro` / `reveal.heroOut` |
| Render-loop deep dive | `components/GLDeepDive.tsx` | R3F | pointer drag + scroll progress |
| Enquiry backdrop | `components/StartCanvas.tsx` | R3F | pointer parallax only |

Rules, in rough order of how expensive they are to relearn:

- **Gate every render loop.** Nothing draws off-screen: IntersectionObserver flips
  `frameloop` / pauses the rAF. A hidden tab gets no rAF at all — which is also why
  the site *looks* frozen in screenshot tools; it isn't.
- **Cap device pixel ratio.** Hero: 1.4 on <768px, 1.75 above. Deep dive: `[1, 1.5]`.
  A phone at native 3× through a full-screen post-pass thermal-throttles in minutes.
- **No allocation inside `useFrame` or the rAF loop.** No `new Vector3`, no object
  literals, nothing — the GC will schedule your jank. Reuse refs.
- **Dispose what you create.** Geometries, render targets, PMREM environments — every
  `useMemo`'d geometry has a dispose cleanup. Copy that pattern.
- **Cap `dt` at 1/30** before integrating anything, so a dropped frame cannot jolt
  the simulation.
- **Accumulate user-driven rotation; never lerp toward a computed target while the
  user can also drag.** The two fight, the lerp wins at ~99.9%/second, and the drag
  visibly snaps back. The knot's drag-with-inertia in `GLDeepDive.tsx` is the
  reference implementation (velocity decays `Math.pow(0.08, dt)`, scroll *adds* on
  top rather than replacing).
- **Fixed-height, `overflow-hidden` canvas boxes.** A canvas box that the layout can
  resize while `frameloop="never"` holds a stale frame gets CSS-stretched. Nothing
  may grow out of its box.
- **`touch-action: pan-y`** on any draggable canvas, so vertical swipes still scroll
  the page on mobile.
- **Environments are local** (`RoomEnvironment` through PMREM). No remote HDRIs, no
  CDN fetches.
- **HeroCanvas is welded to the home route.** It reads `reveal.*`, which only the
  intro writes — mounted anywhere else it renders permanently pixelated. That is why
  `StartCanvas` exists. New page wanting 3D? Copy `StartCanvas`, not `HeroCanvas`.
- **The site advertises its own budgets** — 60fps on mid-range hardware, <150 draw
  calls, honest live counters. Whatever you add has to live inside the claim. If your
  scene needs more, the copy changes with it or the scene slims down.
- **THREE.Clock trap:** `getElapsedTime()` consumes the delta internally. Never call
  `getDelta()` in the same frame; derive `dt = t - lastT` yourself.

---

## 4. Design system and copy

- **Type**: three voices only. `Chakra Petch` (`.display`) for headings, `Sora` for
  body, `JetBrains Mono` (`.label`, counters, code) for the machine voice. No new
  fonts.
- **Palette**: near-black `#08090b`/`#0c0e12`, ink `#f4f6f8`, muted `#78838e`, one
  accent `#4de3ff`, hairlines via `--line`. The accent is scarce on purpose — if
  everything glows, nothing does.
- **Buttons**: `.btn` + `.btn-primary` / `.btn-ghost` / `.btn-sm` in `globals.css`.
  Never hand-roll a button.
- **Copy voice** (enforced, not aspirational): no em dashes; no "not X, it's Y"; no
  chains of staccato fragments; no forced groups of three; plain verbs over "serves
  as / represents"; British English (modelling, centre, defence); concrete numbers
  over adjectives. Two deliberate slogan exceptions exist ("Do anything…" and the
  hero's closing triad) — do not add more. Marquee entries are Title Case except
  canonical spellings (`glTF`, `pgvector`).
- **All copy lives in `lib/content.ts`.** Copy growth is a layout change: after any
  copy edit, run the width sweep (rule 10 and `npm run qa:widths`).

---

## 5. Verify before you call anything done

The suite lives in `scripts/qa/` and runs against any URL (defaults to
`http://localhost:3000`, needs Google Chrome installed):

```bash
npm run qa                 # ~65 assertions: layout, colours, nav, folds, a11y basics
npm run qa:widths          # horizontal overflow + clipped text, 320→1440px
npm run qa:intro           # intro canvas sizing across cold loads and live resizes
BASE=https://deepvelopment-pixel.vercel.app npm run qa   # same, against production
```

The philosophy, learned the hard way:

- **Measure, never screenshot.** Animation state is proven by sampling values at
  several scroll offsets — a scroll-driven animation frozen at its end state looks
  identical to a working one.
- A failing assertion is a *claim*, not proof — roughly half of all red results in
  this project's history were bugs in the test (stale selector, race against the
  intro's 5s lifetime, matching a hidden element). Confirm what a failure actually
  measured before "fixing" the site.
- Headless Chrome reports `prefers-reduced-motion: reduce` by default and hidden
  tabs freeze rAF/WebGL. Both will convince you the site is broken when it is not.

---

## 6. Deploys, secrets, housekeeping

- **This repo does not deploy.** Production is two Vercel projects
  (`deepvelopment-pixel`, `deepvelopment-mask`, team `gds-group`) deployed by CLI;
  the mask project builds with `NEXT_PUBLIC_INTRO=mask`. Want a live preview of your
  branch? `vercel deploy` on your own Vercel account, or just run it locally.
- **Enquiries** from `/start` land in a private Blob store
  (`deepvelopment-enquiries`) as JSON under `enquiries/YYYY-MM-DD/`. Without a
  `BLOB_READ_WRITE_TOKEN` env var locally, the form falls back to a prefilled
  `mailto:` — that is intended behaviour, not a bug.
- **Placeholders that still need real decisions**: `hello@deepvelopment.com`,
  partner names set as type rather than logos, no email notification on new
  enquiries.
- Update `docs/GOTCHAS.md` when you earn a new entry, and keep this file honest when
  a rule genuinely changes — a rules file that drifts from reality is worse than
  none.

# Deepvelopment

Company site. Next 16 (App Router, Turbopack) · React 19 · Tailwind 4 · GSAP + ScrollTrigger · Lenis · three.js + R3F.

```bash
npm run dev     # http://localhost:3000
npm run build
```

## Art direction

Near-black `#08090b`, ink `#f4f6f8`, electric cyan `#4de3ff`, hairlines at 7.5% white, chrome gradient for display type. Tokens live in `app/globals.css` under `@theme`.

Type is a three-voice system:

| Role | Face | Used for |
| --- | --- | --- |
| Display | Chakra Petch 600 | Headlines, service titles, partner names, stat numerals — squared terminals, angular joints. `.display` / `.techno` / `font-display` |
| Body | Sora | Paragraphs and bullets; geometric but readable at 13–16px |
| Machine | JetBrains Mono | Every label, counter, chip, table figure and the loading HUD. `.label` |

The intro wordmark and the SVG mask both use the display face; the canvas resolves `--font-dv-display` at draw time and redraws on `document.fonts.ready`, because canvas 2D cannot parse `var()` in a font shorthand.

## The two intros — two deployments

One treatment per site, decided at build time by `NEXT_PUBLIC_INTRO` (`pixel` | `mask`). No runtime toggle.

| Site | Behaviour |
| --- | --- |
| [deepvelopment-pixel.vercel.app](https://deepvelopment-pixel.vercel.app) | Wordmark resolves from 44px mosaic blocks to sharp, then dissolves. |
| [deepvelopment-mask.vercel.app](https://deepvelopment-mask.vercel.app) | Letterforms are holes cut in a black plate; the plate scales through them. |

`?intro=pixel|mask|off` still works locally for QA. Both Vercel projects need **Framework Preset = Next.js** — projects created through the API default to no preset, which serves `public/` as a static site and 404s every route.

The intro writes `reveal.intro` (`lib/reveal.ts`) and `--intro-p` on `<html>`. The hero shader reads the first to un-pixelate in sync; the hero copy reads the second to scale through.

While it plays, `scrollLock` (`lib/reveal.ts`) stops Lenis and pins `overflow: hidden`, and `history.scrollRestoration` is forced to `manual` — so however you arrived, the intro always hands you the top of the hero.

## Logo

`components/Logo.tsx` — a solid D whose counter is itself a D, with a cyan core: the same letterform at three depths. Filled paths with an evenodd hole, so it works on any background and holds up at 16px. `app/icon.svg` is the same mark as the favicon.

## The pixelation

One idea, two implementations:

- `components/HeroCanvas.tsx` — the hero scene renders to a `WebGLRenderTarget`, then resolves through a mosaic pass. `uPixel` is driven by the intro (47 → 1) and by scroll (`reveal.heroOut`, 1 → 55), so the effect bookends the section.
- `components/PixelImage.tsx` — 2D canvas equivalent for stills. Block size follows distance from viewport centre on whichever axis the frame moves along, so it also works inside the horizontally-pinned service rail.

## Structure

```
app/page.tsx             section order
app/globals.css          theme, type layer, button system, mobile scroll-driven motion
components/Nav           header, read-progress hairline, mobile sheet with discipline index
components/SmoothScroll  lenis + ScrollTrigger wiring, writes --hero-out
components/ServiceRail   pinned horizontal rail >= 1024px, tap-to-expand accordion below
components/GLDeepDive    live R3F canvas with shaded/wireframe/vertices/normals views
components/AgentLoop     the AI deep dive: seven-stage run trace, budgets, LangGraph code
components/Fold          reference block: folds below 1024px, always open above
components/SignalFill    dot grid and drifting nodes, fills the sticky column run-off
lib/content.ts           all copy: services, agent loop, partners, metrics, process
public/art/              generated section stills
```

Reduced motion is honoured throughout: no Lenis, no intro, no marquee, one static WebGL frame.

## Mobile

Mobile is designed, not shrunk. The pinned rail becomes a tap-to-expand accordion, the
reference blocks in both deep dives fold, the menu is a full-screen sheet whose
discipline index expands the matching row and scrolls to it, and section motion comes
from native `animation-timeline: view()` rather than any of the desktop GSAP timelines.
1024px is the single breakpoint for every layout switch.

## Gotchas

[`docs/GOTCHAS.md`](docs/GOTCHAS.md) is the running list of every bug that cost real time
here, with cause and fix, plus a pre-ship checklist distilled from them. Read it before
starting anything similar. Add to it when something takes more than twenty minutes to
diagnose.

## The enquiry form

`/start` is the destination for every CTA on the site. It has its own R3F backdrop
(`StartCanvas`, not `HeroCanvas`, which reads intro state that does not exist off the
home page), three grouped sections, and a server action at `app/start/actions.ts`.

**Enquiries are stored, not emailed.** Each submission is written as JSON to a Vercel
Blob store (`deepvelopment-enquiries`, `store_ywiVRg6puMFJejnS`, private, iad1) under
`enquiries/YYYY-MM-DD/`. Both projects hold `BLOB_READ_WRITE_TOKEN`, so either site
writes to the same store.

Read them in the Vercel dashboard under Storage, or from the CLI:

```
vercel env pull --environment=production .env.prod   # gets BLOB_READ_WRITE_TOKEN
vercel blob list --rw-token "$TOKEN"
vercel blob get "<pathname>" --access private --rw-token "$TOKEN"
```

The store is **private**: fetching a blob URL anonymously returns 403, verified. Never
switch these writes to `access: "public"` — the payload is somebody's name, email and
business problem.

Storage is the durable record and email is only a notification, so the action writes
first and treats a successful write as success even if mail later fails. Email is still
off; set `RESEND_API_KEY` and `ENQUIRY_FROM` to add notifications on top:

```
RESEND_API_KEY=...          # or swap the fetch in actions.ts for another provider
ENQUIRY_FROM=build@yourdomain   # must be a verified sender
ENQUIRY_TO=hello@deepvelopment.com   # optional, this is the default
```

There is no notification of any kind right now, so **the store needs checking manually**.
That is the main weakness of this setup.

Spam handling is a honeypot field plus a three-second minimum time-on-page. There is no
rate limit, which needs a shared store; add one before this gets any real traffic.

`SiteChrome` gates the intro and the section nav to `/` only. Do not move them back into
the layout: `SmoothScroll` locks scrolling until the intro releases it, so on any route
without an intro the page would never become scrollable.

## Before it goes live

- `hello@deepvelopment.com` in `components/Contact.tsx` and `components/Nav.tsx` is a placeholder.
- `allowedDevOrigins` in `next.config.ts` is a dev-only convenience for LAN preview.
- Partner names are set as type, not logos. Swap in real marks when you have permission to use them.
- The run trace in `AgentLoop` is illustrative and labelled as such on the page. Replace the figures if a real case study becomes shareable.

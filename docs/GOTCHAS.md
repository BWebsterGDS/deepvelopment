# Gotchas

Every bug that cost real time on this build, with the cause and the fix. Most of them
are traps rather than mistakes: they will happen again on the next project unless the
shape of them is familiar. Format is symptom, cause, fix.

New entries go at the bottom of the relevant section. If something took more than
twenty minutes to diagnose, it belongs here.

---

## 1. CSS cascade and layers

### `label text-acc` rendered grey everywhere

**Symptom.** Every cyan accent label on the site was muted grey. The header CTA that
should have been white was grey too. `normal-case` on the accordion kicker did nothing,
so it stayed uppercase.

**Cause.** `.label`, `.display` and friends were written in `globals.css` after
`@import "tailwindcss"` but outside any layer. Unlayered rules beat every rule in a
named layer, whatever the specificity and whatever the source order, so an unlayered
`.label { color: #78838e }` won against `text-acc` in `@layer utilities`. There is no
warning for this. It looks like the utility "just isn't applying".

**Fix.** Wrap the component classes in `@layer components`. Utilities then sit in a
later layer and win, which is what every call site already assumed.

**Lesson.** In Tailwind v4, any custom class that sets a property a utility might also
set must live in a layer. Test one instance with `getComputedStyle` rather than trusting
the screenshot, because a muted cyan and a grey are hard to tell apart on a dark
background at low opacity.

### Utility on an element whose own class sets the same property

Same root cause, different shape. `.btn` sets `padding-inline`, so `px-*` on the element
silently loses if `.btn` is unlayered. Check the computed value before assuming the
markup is wrong.

---

## 2. Sticky and grid

### Pale grey block below a sticky column

**Symptom.** Scrolling through either deep dive, a light grey panel appeared in the left
column below the sticky content.

**Cause.** The grid used `gap-px` with `bg-[var(--line)]` on the container to draw the
hairlines between cells, which is a neat trick but means the container background is
visible wherever a cell does not cover it. `lg:items-start` stopped the left item
stretching to the row height, so everything below it was bare container background.

**Fix.** Drop `items-start`, let the grid item stretch, and put a sticky block inside it.
Anything left over is then inside your own element and yours to fill.

**Lesson.** `gap-px` plus a container background means every grid cell must fill its
area. `items-start` and `align-self` are then a hole in the design, not a layout choice.

### Content showing through the sticky panel

**Symptom.** After the fix above, the decorative dot grid rendered through the trace log
and the stage cells.

**Cause.** The background moved to the outer stretched wrapper, so the inner sticky block
had no background of its own and was transparent over its sibling.

**Fix.** Give the sticky block its own background. It has to be opaque, because things
scroll underneath it by design.

### Absolutely positioned children after adding a wrapper

Adding a wrapper moves the nearest positioned ancestor. The counters overlaid on the
render canvas were positioned against the old sticky element. `position: sticky` counts
as positioned, so they kept working here, but check any `absolute` descendant after you
restructure a column.

---

## 3. Transforms and animation

### `translateY(1100%)` moved an element 77px

**Symptom.** Decorative nodes meant to travel the height of a panel barely moved.

**Cause.** Percentage values in `transform: translate` resolve against the element's own
size, not the parent's. The element was 7px tall, so 1100% is 77px.

**Fix.** Put the moving element inside a full-height track and translate the track by its
own height. The track's 100% is the distance you actually want.

**Lesson.** `translate` percentages are self-relative. `top` and `left` percentages are
parent-relative. Reaching for `top` to fix this works but animates layout, so prefer the
track.

### Animation ran where nobody could see it

**Symptom.** The nodes moved, confirmed by measuring their positions, but were not
visible on screen.

**Cause.** The animated box was as tall as the whole column run-off, and most of that
height sat behind the opaque sticky panel. Each node spent about two thirds of its cycle
hidden.

**Fix.** Anchor the sweep to the bottom of the box, sized to the band that is actually
on screen.

**Lesson.** When an animation is invisible, measure whether it is running before assuming
it is broken. `getBoundingClientRect().top` across a few samples separated by a wait
distinguishes "not animating" from "animating out of view" immediately.

### A scroll-driven animation sat frozen mid-cycle

**Symptom.** The dot grid meant to resolve as the panel scrolled held exactly the same
three opacities at every scroll position. Measured: `0.06 / 0.65 / 0.80` at four
positions 1700px apart, which are precisely the 50% keyframe values.

**Cause.** `overflow: hidden` makes an element a scroll container, and
`animation-timeline: view()` resolves against the nearest one. The animated layers were
inside the clipped box, so their timeline was a container that never scrolls and progress
was pinned.

**Fix.** Two boxes. The scroll-driven layers go on an unclipped root, and only what needs
clipping goes in an `overflow-hidden` child.

**Lesson.** This is the same class of bug as `overflow` breaking `position: sticky`, and
it is worth checking together. Any `overflow` value other than `visible` or `clip` on an
ancestor changes what a scroll-driven animation is measured against. A constant value
across several scroll positions is the signature, and it reads as "the animation is not
running" when in fact it is running against the wrong timeline.

### `animation: name linear both` froze every scroll-driven reveal

**Symptom.** The mobile reveals appeared to work, because elements were visible and in
place. They were not animating at all. Measuring opacity across scroll positions returned
the same value every time.

**Cause.** The `animation` shorthand resets omitted longhands, so
`animation: rise linear both` left `animation-duration: 0s`. On a progress timeline a
duration of `0s` pins the animation at a single keyframe. The end state happened to be
"fully visible", so nothing looked wrong.

**Fix.** Set `animation-duration: auto` explicitly, which on a progress timeline means
"span the range", and set `animation-name` as a longhand rather than through the
shorthand.

**Lesson.** A scroll-driven animation that is stuck at its end state is invisible as a
bug, because the end state is usually the state you wanted anyway. Verify these by
measuring the property at three or four scroll offsets. Never trust the screenshot, and
never trust that it looks fine.

### Per-frame damping constants run at different speeds on different displays

**Symptom.** The hero parallax felt inconsistent between machines.

**Cause.** `x += (target - x) * 0.045` applies once per frame, so it converges twice as
fast at 120Hz as at 60Hz. It is a rate disguised as a constant.

**Fix.** `x += (target - x) * (1 - Math.pow(k, dt))`, which is the same curve expressed
in seconds. Every easing in this project now uses that form.

### `getElapsedTime()` consumes the delta that `getDelta()` was going to return

**Symptom.** A `dt` used for damping came back as roughly zero, which would have frozen
the parallax completely.

**Cause.** `THREE.Clock.getElapsedTime()` internally calls `getDelta()` and advances
`oldTime`. Calling both in the same frame leaves the second one with nothing.

**Fix.** Derive dt from elapsed: `const dt = t - lastT; lastT = t;`. Caught by review
rather than by testing, because it is invisible until you look for movement.

### A scan pulse that seemed never to fire

**Symptom.** The grid pulse on the landing page looked like it almost never appeared.

**Cause.** `fract(uTime * 0.045)` is a period of `1 / 0.045`, which is 22.2 seconds, and
identical every cycle. Fine as a texture, useless as an event.

**Fix.** Drive the radius from JS, schedule the next one on a random interval, and expose
it as a uniform. Two things to get right: **anchor the schedule to the moment the element
is actually visible** — the canvas clock starts behind the intro plate, so the first pulse
was burning off where nobody could see it — and give the shader an idle value (negative
radius) so nothing renders between pulses.

### A GSAP timeline collapsed to a single instant

**Symptom.** Both intro treatments played as one flash rather than a sequence.

**Cause.** Timeline positions referenced a label that was never added. An undefined
label resolves to position 0, so every tween started together. No error is raised.

**Fix.** `tl.addLabel("reveal")` explicitly, and never rely on a label being created as a
side effect.

### The intro looked like it fired and vanished

**Symptom.** The wordmark appeared for a fraction of a second and the page loaded.

**Cause.** The dissolve started at `reveal+0.85` while the blocks were still resolving
until `reveal+1.25`, so the wordmark was fading before it ever landed sharp.

**Fix.** Resolve the blocks faster, hold on the sharp state, then dissolve. The hold is
the whole point of the animation and it did not exist.

**Lesson.** Overlapping tweens on the same visual property are a timing bug even when
each tween is individually correct. Print the child start and end times to check, which
is far quicker than trying to catch it on screen.

### An invisible overlay kept swallowing clicks

The intro plate faded to `opacity: 0` but stayed in the hit-testing tree for the rest of
the timeline. Set `pointer-events: none` at the moment the fade completes, not at the end
of the timeline.

---

## 4. Canvas and WebGL

### The hero canvas rendered but was not visible

**Symptom.** `canvas.toDataURL()` proved pixels were being drawn, and the screen was
black.

**Cause.** The host element used `-z-10`, which paints below the `body` background.

**Fix.** `z-0`, with the scrims above it.

**Lesson.** Read back from the canvas to separate "not rendering" from "rendering
somewhere you cannot see". They look identical and have nothing in common.

### The model grew and shrank out of its box on scroll

**Symptom.** The R3F canvas appeared to scale as the page scrolled, breaking out of its
frame.

**Cause.** The canvas box was stretched by the grid, so it resized as the sticky column
moved. With `frameloop="never"` the last rendered frame was held and CSS scaled that
stale bitmap to the new size.

**Fix.** Fixed-height box with `overflow-hidden`, rotation-only motion, and a generous
IntersectionObserver margin so the loop is running before the box is on screen.

**Lesson.** `frameloop="never"` plus a resizing container is always wrong. Either the box
is a fixed size or the loop keeps running.

### The intro stretched at any size other than the one it loaded at

**Symptom.** Loading the page, then resizing the window, skewed the wordmark and turned
the mosaic blocks oblong. Measured: buffer `1440x900` while the CSS box was `380x760`,
so the browser was scaling a fixed bitmap to a completely different aspect ratio.

**Cause.** A canvas has two sizes, the backing store (`canvas.width/height`) and the CSS
box. Only the CSS box follows a resize. `buildSource()` set the backing store once at
mount and nothing ever updated it. The mask variant had the same bug through an SVG
`viewBox` that was captured into state once and never refreshed.

**Fix.** A resize handler that rebuilds the source and redraws, coalesced into one frame
because a drag-resize fires continuously. `visualViewport` is included alongside
`window`, so a mobile address bar collapsing counts as a resize too.

**Lesson.** Any canvas that fills a responsive box needs its backing store resized
explicitly. Assert on the ratio of backing store to CSS box, not on appearance: at a
glance a stretched canvas just looks like a slightly-off design.

**Measuring this one:** a canvas reports `300x150`, the spec default, until something
sizes it. On a cold load that persisted for seconds, which looks alarming but is not a
bug here, because the timeline that draws to the canvas starts in the same effect that
sizes it. Nothing is drawn during the gap. Check *when* work starts before treating an
unsized canvas as a fault.

### The 3D subject jumped to a smaller size the moment the intro finished

**Symptom.** On a smaller window the hero object loaded at full size, then shrank and slid
across the screen a few seconds in.

**Cause.** Nothing to do with loading. The intro locks the page with `overflow: hidden`,
which removes the scrollbar and makes the canvas host about 15px wider. Releasing the lock
hands the scrollbar back. That was enough to cross a hard `w / h < 0.95` portrait test, so
the layout flipped and scale snapped from 1 to 0.78.

**Fix.** Hysteresis on the threshold (fall below 0.95 to enter portrait, climb past 1.02 to
leave) plus easing between the two layouts, with the first sizing pass landing directly on
target so nothing animates in from the wrong place.

**Lesson.** Any layout decision keyed on viewport ratio needs hysteresis if a scrollbar can
appear or disappear underneath it. Scroll locks, modals and intros all do exactly that.

### 13 MB of images on a phone, because every still loaded up front

**Symptom.** A cold mobile load pulled 13.19 MB, effectively all of it images. Nothing
looked wrong locally, because everything was cached.

**Cause.** Two compounding mistakes. The section stills were shipped as PNG, which is the
wrong format for photographic renders, and `PixelImage` set `img.src` inside its effect
for every instance, so all nine downloaded whether or not you ever scrolled to them.

**Fix.** WebP at quality 82 took the set from 13.09 MB to 0.79 MB, a 94% cut with no
visible loss on these dark, smooth renders. Then the canvas source moved inside the
IntersectionObserver, so an image is fetched only when its frame is within 35% of the
viewport. Initial mobile payload is now 0.10 MB.

**Lesson.** Measure the payload from the network, not from the page. Also keep the
originals: they were moved to `art-src/`, which is outside `public/` and therefore
outside the deploy, so the lossy conversion is repeatable rather than destructive.

**Careful when verifying:** `PixelImage` renders both a canvas and a fallback `<img>`, and
hides the img once the canvas paints. Asserting on `img.complete` therefore reports
failure for every frame that is working correctly. Assert on what the user sees: read
pixels from the canvas for frames currently in the viewport.

### Chromatic split turned into rainbow confetti

The mosaic resolve pass offset the colour channels without snapping the sample position
to the cell grid, so each channel sampled a different cell. Snap first, then offset by
exactly one cell.

### Canvas 2D drew text at 10px

`ctx.font` cannot parse `var(--font-dv-display)`. It fails silently and falls back to a
default. Resolve the custom property through `getComputedStyle` first, and redraw on
`document.fonts.ready` because the first paint will use a fallback face.

### A phone renders this at 3x through a full-screen pass

Cap the device pixel ratio on small viewports. 1.4 was the point where the mosaic still
read clean and the GPU stopped throttling. Two live WebGL contexts on one page also need
gating, so both are driven by an IntersectionObserver.

---

## 5. Mobile

### The desktop nav collided with the logo

**Symptom.** At 768px the nav links overlapped the wordmark.

**Cause.** The nav switched to its desktop layout at `md` (768px) with no room for it.

**Fix.** Switch at `lg` (1024px), the same breakpoint the accordion and the pinned rail
use.

**Lesson.** Pick one breakpoint for the layout change and use it everywhere. A GSAP
`matchMedia` at 900px against an accordion at 1024px left a band of viewports with
neither layout, which is the same bug in a different place.

### Scroll-into-view overshot by the height of the panel that closed

**Symptom.** Tapping an accordion row scrolled to a point 840px past it.

**Cause.** Opening one row closes another. If the closing row is above the target, the
page shrinks by that panel's height *after* the scroll target was computed, so the target
ends up that much higher than where the scroller was sent.

**Fix.** Measure the outgoing panel's height before the state update, and subtract it
from the offset when the closing row is above the target. Waiting for the transition to
end also works but adds a visible pause.

**Lesson.** Any programmatic scroll during a layout animation needs the final geometry,
not the current geometry.

### Releasing the scroll lock threw the user back to the top

`scrollLock.start()` existed for the intro and deliberately snapped to the top. Reusing
it to close the mobile menu sent the reader back to the hero. Added a separate `resume()`
that releases the lock in place, and kept `start()` for the one caller that wants the
reset.

### A menu link did nothing

The sheet closes on click and the document-level anchor handler runs immediately after.
Lenis was still stopped at that moment, so `scrollTo` was a no-op. Release the scroller
synchronously in the click handler, before the state update.

### Anchor jumps landed under the fixed header

Every section arrived with its own label tucked behind the 64px header. Lenis does not
read `scroll-margin-top`, so the offset goes in the `scrollTo` call. `#top` is the
exception and wants the true top.

### A responsive sentence lost its subject

Hiding a clause with `hidden sm:inline` left the mobile copy reading "Meaning it is
harder. It also needs a person..." with no antecedent. If you split prose by breakpoint,
read each variant on its own. Write two complete versions rather than one with a hole in
it.

### A flex row silently ate its own content when the copy grew

**Symptom.** The footer year rendered as a clipped `© 20` between 660px and 820px.

**Cause.** Nothing in the footer changed. Adding "smart contracts" to the discipline line
made the middle item wide enough to compress its siblings, because no item declared
`shrink-0`. Flex will happily shrink text below its own width.

**Fix.** `shrink-0` on the things that must never compress (logo, year), `min-w-0` on the
one that may, and a breakpoint that only shows the long line once it fits.

**Lesson.** Reaching for `truncate` first just moves the damage: it stopped the year
clipping and started clipping the tagline instead, at a different breakpoint. Decide which
element is allowed to lose, and let the rest hold their size. Content growth is a layout
change even when no layout code was touched, so re-run the width sweep after copy edits.

### Missing `shrink-0` and unbreakable words at 320px

Two small ones worth checking together on any narrow sweep. A flex child with no
`shrink-0` loses characters rather than wrapping, which is how a numbered index rendered
`08` as `0`. And a long single word such as "implementation" is wider than a 320px column,
so it overflows unless the container allows `break-words`.

### Tap targets

Audit with a script rather than by eye. The logo link was 27px, the email link 30px, the
menu rows 39px. `-my-2 py-2` grows a hit area without moving anything.

### Other mobile fixes worth remembering

- A section header positioned `absolute` for the desktop rail sat over the card art on mobile. Put it in flow below the breakpoint.
- Six full-height cards stacked to roughly 7000px of scrolling on a phone. Collapsed rows put all of them on one screen.
- Two layouts rendering the same data both carried `id={s.id}`, so the document had duplicate ids and anchors resolved to the hidden one.
- Long labels never fit two across at 390px. Let them become full-width rows instead of pretending to be chips.

---

## 6. Vercel

- **`/` returned 404 while `/art/*.png` served fine.** Projects created through the API have `framework: null`, so the build output is served as a static site and the Next router never runs. `PATCH /v9/projects/:id` with `{"framework":"nextjs"}` then redeploy.
- **Both URLs returned 302.** Deployment Protection (SSO) is on by default on this team. `{"ssoProtection": null}` makes a project public, which is a decision to confirm with the owner first.
- **An env var was set to an empty string.** `printf 'pixel' | vercel env add …` stores nothing useful. Use `--value pixel --no-sensitive -y` and confirm with `vercel env pull`.
- **Deploying two projects from one directory.** `.vercel/project.json` holds the link, so `vercel link --yes --project <name>` between deploys is what switches target. Link back afterwards or the next deploy goes to the wrong project.

---

### Shipping Next's default favicon and a doubled title

Two easy ones to miss because nothing looks broken locally.

- `app/favicon.ico` from `create-next-app` is the Vercel triangle, and it takes precedence over a nicer `icon.svg` in plenty of contexts. Check the file date: if it predates your logo, it is still theirs.
- A `title.template` of `"%s — Brand"` applies to every child route, so a page title that already ends in the brand renders it twice. Child titles should be the bare page name.
- File-based `opengraph-image` needs `metadataBase`, or the URL it emits is relative and every scraper ignores it.

## 7. Verification and tooling

This is the section that saved the most time overall.

- **The Chrome extension tab is always hidden on this machine.** Hidden tabs get no `requestAnimationFrame` and no WebGL compositing, so every animation looks frozen and every canvas looks black. Nothing is wrong with the page. Use Playwright from Node instead.
- **Headless Chrome reports `prefers-reduced-motion: reduce` by default.** Every intro was being skipped during QA. Pass `reducedMotion: "no-preference"` on the context or you are testing the accessibility path by accident.
- **`page.clock` does not control GSAP**, which reads `performance.now()`. To verify timing, run GSAP in Node inside the project and print each child's start and end times. Far faster and exact.
- **Screenshots under swiftshader take seconds**, so timed captures during an animation are unreliable, and per-frame `getImageData` polling is far too slow to catch a transition. Measure state, do not photograph it.
- **Playwright strict mode** fails when a selector matches both the menu and the page body. Scope with `page.locator("#menu").getByRole(...)`.
- **Overflow audit beats eyeballing.** Walk every element, compare `getBoundingClientRect().right` against `clientWidth`, and skip `position: fixed`. Ignore known-good offenders like marquee tracks inside `overflow-hidden`.
- **Next dev blocks cross-origin requests from a LAN IP**, so a phone on the same network gets no hydration at all with only a console note. Add the IP to `allowedDevOrigins` in `next.config.ts`. Dev convenience only.
- **`next lint --dir` was removed in Next 16.** Use `eslint` directly.
- **Prettier's default print width is 80**, which is narrower than this repo's roughly 88. Running it without `--print-width` reformats whole files and buries the real change.
- **Higgsfield `job_status` takes `jobId`**, not `job_id`.

---

## 8. Auditing your own fixes

Running an assertion suite against production found five failures. Three were bugs in
the audit, not the site, and that ratio is normal. Worth knowing before you trust a red
result.

- **A stale assertion.** The nav CTA check still expected the white `.label` button from before it became `.btn-primary`. The site was right and the test was out of date.
- **`innerText` reflects `text-transform`.** Fold titles styled with `.label` come back uppercase, so a case-sensitive `includes()` reported copy as missing when it was on the page. Compare case-insensitively.
- **A selector that matched a hidden element.** `a.btn-sm` matched the `display: none` desktop CTA as well as the mobile bar, and a hidden element returns a zero rect, so the position assertions passed and failed for reasons unrelated to the thing being tested. Scope selectors to the container you mean.
- **An over-broad match.** "Exactly one cyan hairline in the header" also caught the active-nav underline, which is a deliberate feature. Assert on the element you mean, not on everything that looks like it.
- **A genuinely stale deploy.** One failure disappeared on re-run because the audit started seconds after the alias flipped and hit a cached asset. Give a deploy time before believing a failure, and re-run once before investigating.

The lesson: a failing assertion is a claim that something is wrong, not proof. Confirm
what the failure is actually measuring before changing code, or you will "fix" working
behaviour to satisfy a broken test.

### More ways a browser test lies to you

Added after two false results in one session, both of which looked like product bugs.

- **`locator.boundingBox()` does not scroll the element into view.** Driving `page.mouse` at coordinates from an off-screen element clicks empty space, and the feature under test looks broken. Call `scrollIntoViewIfNeeded()` first, or use `locator.hover()`.
- **Matching on `textContent` equality catches ancestors.** A wrapper whose only text is the string you are looking for matches too, and `find` returns the outermost one. The reported styles then belong to the wrong element. Select on a class or a role instead.

### A flaky suite is worse than no suite

The intro-resize checks failed intermittently, 9/2 then 10/1 then 15/0, which is the
worst possible signal: it looks like a real bug that only sometimes reproduces. Two
causes, both in the test.

- **It raced the thing it was testing.** The intro exists for about five seconds. A sequence of resizes with waits and screenshots outlived it, and the checks then ran against a page with no intro on it. Assert inside the lifetime of what you are measuring, or make the case a fresh load.
- **A selector went stale when unrelated code changed.** Making `PixelImage` lazy left those canvases at the 300x150 spec default until their image arrives, so a bare `querySelector("canvas")` started matching one of them instead of the intro's. Reported aspect 2.0, which looked exactly like the distortion bug that had just been fixed. Scope selectors to the component you mean.

Chase intermittent failures to a root cause before shipping around them. Both of these
would have quietly eroded trust in every other number the suite produced.

## 9. Copy

The site was written with the standard AI tells throughout: an em dash in nearly every
bullet, forced groups of three, "not X, it's Y" parallelism, and chains of short
fragments. The rubric now used is the humanizer expert in `ericosiu/ai-marketing-skills`
(`content-ops/experts/humanizer.md` and `content-eval/references/voice-rules.md`).

The rules that catch the most:

- No em dashes. A comma, a full stop, or "because" almost always reads better.
- No chains of short punchy fragments.
- No forcing ideas into threes.
- No "not X, it's Y".
- Plain verbs. "is", "has", "does", not "serves as", "represents", "stands as".
- Vary sentence length, state an opinion, use real numbers.

Apply it to the whole page at once. Rewriting one new section leaves the voice visibly
inconsistent with everything around it.

---

## Pre-ship checklist

Distilled from the above. Each line exists because it was missed once.

- [ ] Every custom CSS class that sets a property a utility might set is inside a layer
- [ ] Computed styles checked on the accents, not judged from a screenshot
- [ ] One breakpoint used for each layout switch, top to bottom
- [ ] Every grid cell fills its area if the container background draws the gaps
- [ ] Sticky blocks are opaque and their containing block stretches
- [ ] No duplicate `id` across responsive variants of the same content
- [ ] Anchor scrolls clear the fixed header, `#top` excepted
- [ ] Programmatic scrolls account for layout that is still animating
- [ ] Tap targets audited with a script at 375px and 390px
- [ ] Each breakpoint variant of split prose reads as a complete sentence
- [ ] Horizontal overflow audited at 375, 390, 430 and 768
- [ ] Animation verified by measuring position over time, not by screenshot
- [ ] Scroll-driven animations sampled at three or more offsets to prove progress advances
- [ ] No `overflow: hidden` ancestor between a `view()` timeline and the document scroller
- [ ] `prefers-reduced-motion` path checked deliberately, and checked off by default in QA
- [ ] Live canvases gated by IntersectionObserver, device pixel ratio capped on phones
- [ ] Production URL verified after deploy, including that images return 200
- [ ] Network payload measured on a cold mobile load, not judged from a warm cache
- [ ] Images in a modern format, and fetched only when near the viewport
- [ ] Width sweep re-run after copy edits, since longer text is a layout change
- [ ] Ratio-based layout switches have hysteresis, so a scrollbar cannot flip them
- [ ] Damping and easing expressed per second, never per frame
- [ ] favicon, `opengraph-image` and `metadataBase` are yours, not the starter's
- [ ] Child route titles are bare page names when a title template is set

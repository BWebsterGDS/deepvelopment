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

### A fixed-height card clips its own content, silently

**Symptom.** The AI card's stack chips were missing entirely. The card just looked like
it ended there, so nothing read as broken.

**Cause.** Rail articles are `lg:h-[76vh]` with `overflow-hidden`. Ten long bullets
pushed the chips past the bottom edge. There is no warning of any kind, and the same
thing happened twice more as content grew.

**Fix.** Condense the bullets, and add an audit assertion that every card's chips sit
inside the card's rect. That assertion immediately caught Real-time 3D overflowing by
14px after the Unreal bullets went in, and later caught the new crypto card 30px over
before anyone saw it.

**Lesson.** Fixed height plus `overflow-hidden` turns content growth into silent
clipping. Any such container needs a bounds assertion in QA, because the failure mode is
invisible by construction.

### A component that sets its own positioning defeats caller classes

`PixelImage` owns `position: relative`, so passing `absolute` classes to an instance
collapsed the metrics band it was supposed to overlay. Check what a component claims for
itself before styling it from outside.

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

### Black letters on a black plate

**Symptom.** The mask deployment appeared to load nothing at all: black screen for the
entire intro.

**Cause.** The mask intro cuts letter-shaped holes in a black plate, and the holes
revealed the hero underneath, which at that moment is a near-black, heavily pixelated
frame. Structurally correct, visually nothing.

**Fix.** A lit surface (chrome radial plus cyan sweep) under the plate, so the wordmark
reads as glowing type from frame one, cross-fading out mid scale-through so the holes
open onto the hero. This is also what motivated the watchdog: a stalled intro must never
strand a visitor on a black screen with scroll locked.

**Lesson.** Any reveal-through-holes effect is invisible when the reveal target matches
the plate colour. Check the revealed layer's state at the moment of reveal, not at rest.

### A tap skipped the intro instead of hurrying it

**Symptom.** Tapping the loading screen jumped straight to the page. The brief was the
whole animation, just faster.

**Cause.** The tap handler called `tl.progress(0.98)`, a hard jump that discards every
remaining beat.

**Fix.** Rescale the remainder with `timeScale` so everything still plays. Any tap
before ~2.95s lands the remaining timeline at exactly 1.90s (tap at 0.2s → ×2.45, at
1.6s → ×1.71); later taps finish naturally, and a second tap is guarded so speed-ups
cannot compound.

**Verifying it:** wall-clock timing under software rendering could not measure this — a
"failing" double-tap run had simply tapped 0.7s later. The proof was running the GSAP
arithmetic in Node and printing the numbers.

### The second route was permanently scroll-locked

**Symptom.** Loading `/start` directly gave a page that could never scroll, with the
home page's intro and section nav rendered over the form.

**Cause.** `SmoothScroll` stops the scroller and only releases it when the intro
finishes. The intro only exists on the home route, so nothing ever unlocked a subroute.

**Fix.** Gate the intro, the section nav and the scroll lock through `SiteChrome`, which
only mounts them on `/`. CTAs use `next/link` so a client-side return does not replay
the intro.

**Lesson.** Anything global that participates in the intro handshake must be re-audited
the moment a second route exists.

### An idle sway erased a placed tilt

**Symptom.** Horizontal spin kept its inertia after a drag, but a vertical tilt sprang
back home the moment you released.

**Cause.** The idle-sway lerp pulled tilt toward `sin(spin)` at `0.9` per-second
strength, about 60%/sec, which overwrote the user's placement within a second.

**Fix.** `0.12` (~7%/sec). A placed tilt now stays put and only drifts back into the
idle sway over many seconds.

**Lesson.** This is the two-systems-fighting bug in miniature, and it recurs every time
an idle animation and user input share an axis. The idle term must be near-silent
relative to input.

### Stacked opacities multiply into invisibility

The SignalFill dots were `rgba(255,255,255,0.05)` inside a layer whose own opacity
dipped to `0.13`, about 0.6% contrast on `#0a0c0f`. Check the product of stacked
opacities, not each one in isolation.

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

### One-step canvas downscale made the wordmark vanish from its own mosaic

**Symptom.** The intro's 44px mosaic showed a scatter of ~15 lucky bright cells instead
of the word. The sharp render from the same source was perfect.

**Cause.** `drawImage` shrinking 1280px straight down to a 29-cell canvas *samples* the
source with a small filter kernel; it does not average it. Thin glyph strokes fall
between sample points, so most cells land on background and go dark.

**Fix.** Downscale through a pyramid — halve repeatedly until within 2× of the target,
then draw the final step. Each halving is a proper 2×2 average, so every stroke
contributes to its cell. Two reused ping-pong canvases, no per-frame allocation.

**Lesson.** Any big single-step canvas downscale quietly loses thin features. If a
mosaic, thumbnail or minimap looks "sparser" than its source, suspect sampling first.

### The intro film became procedural, and why

The generated video (two takes, 90 credits) could never open on the actual loading
frame: the placeholder is composed against the live viewport by the canvas, while a
film is one fixed aspect ratio — on every screen shape the swap read as a cut to
obviously-AI footage. The choreography (shimmer, glitch tears, cascade) moved into the
canvas renderer itself, so the first frame is the placeholder by construction, at every
window size, with zero network cost. Keep this in mind before reaching for generated
video where the start or end state must match something the page renders live.

A debugging hook earned its keep here: `?introDebug=1` exposes the GSAP timeline as
`window.__introTl` so QA can `pause()` it at exact moments — a paused timeline cannot
race a slow screenshot, where timed captures under software rendering always lose. The
non-obvious part: the hook must also disarm the watchdog with `clearTimeout`, or the
9.5s failsafe `finish()`es the deliberately paused timeline mid-capture and the QA
session tears itself down.

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

### The drag snapped back because two systems owned the rotation

**Symptom.** Dragging the deep-dive model, it spun back to where it started the moment
you let go.

**Cause.** OrbitControls orbited the *camera* while `useFrame` simultaneously lerped the
*group* toward a scroll-derived rotation at roughly 99.9%/sec. Proven numerically: 98.9%
of a 1.5 rad drag was erased within one second of release.

**Fix.** Remove OrbitControls entirely. Pointer drag accumulates spin and tilt directly,
with inertia: velocity decays by `Math.pow(0.08, step)` per second, idle drift takes
over below `IDLE_SPIN 0.16`, and `touch-action: pan-y` keeps vertical swipes scrolling
the page. Measured coast after a flick: 4.86 → 1.32 → 0.37 → 0.13 rad/s, settling into
the idle drift.

**Lesson.** User input and an automated animation can share an object only if one of
them is authoritative. A lerp toward a computed target will always erase a drag.

### The model stuck to the cursor after release

**Symptom.** After some drags the knot kept following the cursor with the button up,
until a second click freed it.

**Cause.** Pointer capture is best-effort. The browser can silently drop it mid-drag
(scrolling, leaving the element, focus changes), and then an *element-level* `pointerup`
never arrives, so the drag never ends.

**Fix.** `pointerdown` on the element; `pointermove`, `pointerup` and `pointercancel`
on `window`; `lostpointercapture` on the element and `blur` on `window` both call a
`forceEnd()` that zeroes velocity and clears the drag, guarded by an early return when
no drag is live. `setPointerCapture` itself goes in a try/catch.

**The ordering nuance that preserves fling:** on a normal release `pointerup` fires
*before* `lostpointercapture`, so the regular handler (which keeps the flick velocity)
runs first and marks the drag over; `forceEnd` then no-ops. `forceEnd` only wins, and
kills velocity, when capture is genuinely torn away with no release event.

### Two darkening systems compounded into a murky blob

The `/start` backdrop object vanished into fog: density 0.055 at camera distance 7.4,
under a 0.86 scrim. Each looked reasonable alone. Same class as the multiplied
opacities entry — audit darkening effects as a product, not one at a time.

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
- iOS gates `deviceorientation` behind a user-gesture permission prompt. The site deliberately ships Android tilt plus iOS pointer-drag instead of prompting.

### Every footer discipline chip landed on the same card

**Symptom.** All eight contact chips scrolled to the same place. After the first fix,
always to the *last* card instead.

**Four stacked causes, each masking the next:**

1. Every chip in the `.map` was hardcoded `href="#capabilities"`.
2. Fixing the href cannot work on desktop anyway: the rail is horizontally pinned, so a
   card's position is a transform, and a plain anchor has nothing to target. Card index
   has to map to a scroll offset.
3. Measuring the section's rect to find the rail start returns the pin's *end* (the pin
   spacer) once you are past it, and the footer is past it, so every chip resolved to
   the last card. Use the ScrollTrigger's own `st.start`.
4. It *still* failed identically: `SmoothScroll`'s document-level anchor handler saw the
   residual `href` and scrolled there right after the chip's own handler ran, winning.
   Chips now `stopPropagation()` and carry `data-dv-service`, which the global handler
   explicitly skips.

**Lesson.** A document-level anchor handler is a second scroller that silently overrides
any custom scroll. Give bespoke handlers an opt-out attribute the global one respects.
And when a fix changes nothing, suspect a later handler re-doing the old behaviour
rather than the fix being wrong.

### The scroll cue came back at mid widths

The hero's scroll cue had been hidden below `sm` (640px) instead of below `lg` (1024px),
so the 640–1024px band, exactly where every "it looks wrong on my window" report comes
from, still showed it. The single-breakpoint rule erodes one utility class at a time;
when a mid-width report arrives, grep for stray `sm:`/`md:` layout switches before
debugging anything else.

---

## 6. Vercel

- **`/` returned 404 while `/art/*.png` served fine.** Projects created through the API have `framework: null`, so the build output is served as a static site and the Next router never runs. `PATCH /v9/projects/:id` with `{"framework":"nextjs"}` then redeploy.
- **Both URLs returned 302.** Deployment Protection (SSO) is on by default on this team. `{"ssoProtection": null}` makes a project public, which is a decision to confirm with the owner first.
- **An env var was set to an empty string.** `printf 'pixel' | vercel env add …` stores nothing useful. Use `--value pixel --no-sensitive -y` and confirm with `vercel env pull`.
- **Deploying two projects from one directory.** `.vercel/project.json` holds the link, so `vercel link --yes --project <name>` between deploys is what switches target. Link back afterwards or the next deploy goes to the wrong project.
- **"The fix made no difference" can mean the deploy went to Preview.** `vercel deploy` without `--prod` leaves the public URL serving the old code, and every re-test faithfully reproduces the bug you already fixed. Check which deployment the alias points at before re-opening the code. (Learned on an adjacent build, twice in one session.)
- **In-memory storage on Vercel is impossible, not just fragile.** Functions are stateless; a module-level array is gone by the next request. There is no quick-fix version of this, the data needs a store.
- **Vercel Blob is `access: "public"` by default.** Anyone with the URL can read it. The enquiry payloads are real names and emails, so the store is created with `access: "private"`, verified by an anonymous fetch returning 403. Also: `vercel blob store add` wants a TTY for its link prompt; `--yes` at creation is what actually connects the store and injects `BLOB_READ_WRITE_TOKEN`. The action writes to the store *first* and treats that as success, so a mail failure can never lose the record.
- **`robots.txt` and `sitemap.xml` were 404.** Next scaffolds neither. `app/robots.ts` and `app/sitemap.ts`, found only because the wider audit checked.

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
- **`gl.readPixels` on the R3F canvas returns zeros.** The drawing buffer is not preserved (`preserveDrawingBuffer: false` is the default), so reading outside the frame gives nothing even mid-animation. Prove motion models in Node instead of reading GL pixels. In the same pass, a bare `querySelector("canvas")` matched a `PixelImage` 2D canvas, not the WebGL one — scope the selector.
- **React 19 hoists a `<link rel="preload">` written in JSX into `<head>`**, so the fetch starts with the HTML rather than after hydration. That is the mechanism for any hero asset that must beat hydration. (Used for the intro film, retired with it; the fact survives in the commit history.)
- **A NUL byte got written into a source file, and the confirming grep lied.** Three Edits failed on text visibly in the file because an earlier write produced `.replace(/\0/g, "")` with a literal NUL inside the regex. The check `grep $'\0'` then matched all 106 lines: zsh collapses `$'\0'` to an empty pattern. Scan for NUL at the byte level (python), never through the shell.
- **zsh aborts a whole compound command on an empty glob.** `no matches found: shots/fm-phone-*.png` killed every step chained after it. `setopt null_glob`, `find`, or guard the glob.
- **Heredoc string edits fail on invisible whitespace.** `assert old in s` before a python patch aborted repeatedly because JSX indentation differed from what was quoted. Safe, but each miss is a round trip: re-read the exact bytes first.
- **Phone-DPR frozen-frame captures never complete under swiftshader.** Screenshot runs at `deviceScaleFactor: 2` hit a ten-minute timeout; even trimmed to phone size at 1× they never produced a file. Below roughly desktop size, stop screenshotting and assert geometry (backing-store vs CSS-box aspect to three decimals), which is the stronger check anyway.

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

### The signature of a programmatic-scroll race

One FAIL in a 65-assertion run: "pixel cross-fade advances with scroll
0.610 -> 0.610 -> 0.610", which looks exactly like the frozen `view()` timeline bug
returning. Two re-runs passed with the expected `0.610 -> 0.229 -> 0.218`. A
scroll-sampled value frozen at its *first* reading is what a race between the test's
programmatic scroll and Lenis looks like — distinct from the stale-deploy case above,
and another reason to re-run once before touching code.

### The audit was stricter than the spec

WCAG 2.5.8 exempts inline links from the 24px target rule. Without the exemption the
tap-target audit fails every correct prose link, in both suites. Read the spec's
exceptions before encoding the headline number. The card-bounds metric had its own bug
too, counting chips as bullets and reporting 15–21 per card. An audit is code and gets
the same review as code.

### A video intro must lose the race gracefully

The generated intro video replaces the canvas resolve only when the browser can
actually play it. Three things made that safe rather than hopeful:

- **Decision at a fixed point, with a bounded grace.** The mp4 gets until the end of the counter, plus 900ms if it is nearly ready (`readyState >= 2`), and the mosaic simply holds during the grace, which reads identically to the designed hold. A dead connection reaches the canvas path in at most 350ms extra.
- **The canvas path never left the code.** Slow network, data-saver, decode error before or during playback, autoplay refusal — every failure lands on the same canvas animation or the shared exit. Nobody waits on a file.
- **Wall-clock video assertions lie in software rendering.** Swiftshader decodes 1080p slower than realtime, so "the video should finish in ~5s" fails in CI while being fine on any real device. Assert on state transitions (adopted → plate gone), not on durations, and keep a generous watchdog (12s here) as the floor.

Also: `fract(uTime)`-style start/end frames are the whole trick. Video models garble
invented text, so the wordmark was rendered exactly (same fonts as the site) and pinned
as the generation's first and last frames — the model only animates the journey.

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

## 10. From adjacent builds

Traps hit on neighbouring projects in the same period. Different repos, same classes of
bug — recorded here because they will transfer straight into this one.

### Scroll engines

- **`scroll-behavior: smooth` in global CSS silently breaks per-frame `window.scrollTo`.** Every call becomes a cancelled smooth animation, so a scroll-driven engine reads as completely dead. Set `auto`, or pass `behavior: "instant"` per call. Check this first on any Lenis or scrub build that "does nothing".
- **IntersectionObserver misses reveals on instant scroll jumps** — exactly what iOS momentum and anchor jumps produce — leaving content permanently clipped at its hidden state. A sweep on the scroll tick cannot silently fail; IO alone can.

### Generated video (Seedance / Higgsfield)

- **`start_image` is weak conditioning, not a frame lock.** Passing the same frame as both `start_image` and `end_image` came back visibly different (SSIM 0.462 against the seed), killing a clip-to-loop handoff. The free fix: harvest the loop from the clip's *own* static tail — handoff 0.955, seam 0.974 against a 0.985 adjacent-frame baseline. Film grain means 0.985, not 1.0, is "seamless".
- **A `end_image = start_image` loop still pops at the seam** (0.949: steam and flame mismatch). A 0.6s tail-into-head crossfade reaches the baseline.
- **Models hallucinate real brands.** One restrained hero shot generated a genuine Laurent-Perrier label. Every generated clip needs a brand-mark audit before it ships.
- **Vague depletion prompts skip to the end state.** "Hands lift several skewers away" emptied the board by a third of the clip, caught only by a dense 1fps full-frame audit — sampled review hid it. Prompt with explicit counts and hard negatives.
- **Grain dominates bitrate; CRF barely helps and AV1 encoded *larger* than H.264** on this content. Light `hqdn3d` denoise plus a resolution step cut 8.2MB to 3.5MB at SSIM 0.943.
- **Autoplay is a minefield:** sources attached from JS never re-arm the `autoplay` attribute; set `muted` as a property and retry `play()` on `loadeddata`. A second `<video>` needs user activation even muted, and a devtools evaluation *counts* as activation, producing a false manual pass. A hidden tab never fetches media at all (`readyState` stays 0), and macOS occlusion can mark a visible-looking window hidden — guard retry loops on `document.hidden`.

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
- [ ] Fixed-height `overflow-hidden` containers have a bounds assertion in QA
- [ ] No stray `sm:`/`md:` layout switches — grep for them, 1024px is the only breakpoint
- [ ] Custom scroll handlers carry an opt-out the global anchor handler respects
- [ ] User-draggable objects end their drag on `window`-level events, not element-level
- [ ] Every route checked against the intro/scroll-lock handshake, not just `/`

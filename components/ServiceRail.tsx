"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { services } from "@/lib/content";
import { scrollToEl, scrollToY } from "@/lib/reveal";
import PixelImage from "./PixelImage";

/**
 * Two shapes, one dataset:
 *   ≥1024px — a pinned horizontal rail, one panel per discipline.
 *   <1024px — an accordion. Six full cards stacked out to ~7000px of scrolling on a
 *             phone, which is unusable; collapsed rows put all six on one screen.
 */
export default function ServiceRail() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const stRef = useRef<ScrollTrigger | null>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState<string>(services[0].id);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const track = trackRef.current;
    const section = sectionRef.current;
    if (!track || !section) return;

    const mm = gsap.matchMedia();

    // must match the lg: breakpoint the accordion switches on, or one viewport band
    // gets neither layout
    mm.add("(min-width: 1024px)", () => {
      const distance = () => track.scrollWidth - window.innerWidth;

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => setProgress(self.progress),
        },
      });
      stRef.current = tween.scrollTrigger ?? null;

      return () => {
        stRef.current = null;
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { x: 0 });
      };
    });

    return () => mm.revert();
  }, []);

  const current = Math.min(services.length, Math.floor(progress * services.length) + 1);
  const openNo = services.find((s) => s.id === open)?.no ?? "--";

  /** open one, close the rest, and bring the row up under the header — otherwise
   *  expanding row 05 leaves its detail off the bottom of the screen. */
  const openRow = (id: string, prev: string) => {
    const el = rowRefs.current[id];
    const closing = prev && prev !== id ? panelRefs.current[prev] : null;
    const prevRow = prev ? rowRefs.current[prev] : null;

    // measured before the state change, while the outgoing panel still has its height.
    // If it sits above this row it is about to collapse and pull this row upward, so
    // scrolling to the row's live position would overshoot by exactly that much.
    const shift =
      closing && prevRow && el && prevRow.offsetTop < el.offsetTop
        ? closing.offsetHeight
        : 0;

    setOpen(id);
    if (el) requestAnimationFrame(() => scrollToEl.go(el, -88 - shift));
  };

  const toggle = (id: string) => (open === id ? setOpen("") : openRow(id, open));

  // the mobile menu lists the six disciplines; tapping one should land you on it
  // already expanded rather than at the top of the section
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!services.some((s) => s.id === id)) return;

      // Desktop shows the rail, where a card's position on screen comes from the pinned
      // horizontal transform rather than from layout, so there is nothing an anchor
      // could target. The trigger maps scroll distance 1:1 onto horizontal travel, so a
      // card sitting `offsetLeft` into the track is reached that far past the pin start.
      //
      // Take the start from the ScrollTrigger, never by measuring the section: while the
      // section is pinned its rect is relative to the viewport, and once the pin has been
      // passed it reports the end of the pin spacer. Measuring it from the contact
      // section at the foot of the page sent every chip to the last card.
      const track = trackRef.current;
      const card = cardRefs.current[id];
      const st = stRef.current;
      if (window.matchMedia("(min-width: 1024px)").matches && track && card && st) {
        const distance = Math.max(0, st.end - st.start);
        const into = Math.min(
          distance,
          Math.max(0, card.offsetLeft - track.offsetLeft - 24)
        );
        scrollToY.go(st.start + into);
        return;
      }

      openRow(id, open);
    };
    window.addEventListener("dv:open-service", onOpen);
    return () => window.removeEventListener("dv:open-service", onOpen);
    // rebound whenever `open` changes: the handler needs the current row to work out
    // how far the collapsing panel above will pull the target up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    // overflow-hidden only from lg up, where it clips the horizontal rail. Below that it
    // would make this section a scroll container, and the `view()` timelines on the
    // accordion rows inside it would never advance.
    <section
      id="capabilities"
      ref={sectionRef}
      className="relative lg:overflow-hidden"
    >
      {/* header: in flow on mobile, overlaid on the pinned rail from lg up */}
      <div className="shell rise-head pt-20 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:z-20 lg:pt-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="label">What we build</p>
            <h2 className="display mt-3 text-[clamp(1.6rem,3.6vw,3.2rem)]">
              Eight disciplines, one team.
            </h2>
          </div>
          {/* desktop counts rail progress; mobile counts the row you have open */}
          <p className="label shrink-0">
            <span className="lg:hidden">{openNo}</span>
            <span className="hidden lg:inline">{String(current).padStart(2, "0")}</span>
            {" / "}
            {String(services.length).padStart(2, "0")}
          </p>
        </div>
        <p className="label mt-4 text-acc lg:hidden">Tap a discipline for the detail</p>
        {/* no progress bar here on purpose: the nav's hairline is the only one on the
            page, so the pinned sideways scroll does not show two racing bars */}
      </div>

      {/* ---------- mobile / tablet: accordion ---------- */}
      <div className="shell mt-8 flex flex-col gap-px bg-[var(--line)] pb-16 lg:hidden">
        {services.map((s) => {
          const isOpen = open === s.id;
          return (
            <article
              key={s.id}
              ref={(el) => {
                rowRefs.current[s.id] = el;
              }}
              className={`rise relative bg-[#0c0e12] transition-colors duration-500 ${
                isOpen ? "bg-[#0e1116]" : ""
              }`}
            >
              {/* active marker: a cyan edge that grows down the row it belongs to */}
              <span
                aria-hidden
                className={`absolute left-0 top-0 z-10 w-[2px] bg-acc transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
                  isOpen ? "h-full opacity-100" : "h-0 opacity-0"
                }`}
              />
              <h3>
                <button
                  onClick={() => toggle(s.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 p-4 text-left transition-colors active:bg-[#151a21] sm:p-5"
                >
                  {/* thumbnail: plain <img>, not PixelImage — six extra 2D canvases and
                      rAF loops for 56px tiles is not a trade worth making on a phone */}
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-[var(--line)] sm:h-16 sm:w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.art}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover transition-all duration-700 ${
                        isOpen ? "scale-105 opacity-100 saturate-100" : "opacity-45 saturate-0"
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="label text-[0.6rem] text-acc">{s.no}</span>
                    <span className="display mt-1 block break-words text-[1.24rem] sm:text-[1.35rem]">
                      {s.title}
                    </span>
                    <span
                      className={`label mt-1.5 block normal-case tracking-[0.08em] text-[0.6rem] ${
                        isOpen ? "text-mute" : "text-acc/70"
                      }`}
                    >
                      {isOpen ? s.kicker : "Tap for detail"}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={`grid h-8 w-8 shrink-0 place-items-center border text-base leading-none transition-all duration-500 ${
                      isOpen
                        ? "rotate-45 border-acc bg-acc/10 text-acc"
                        : "border-[var(--line-strong)] text-mute"
                    }`}
                  >
                    +
                  </span>
                </button>
              </h3>

              {/* 0fr → 1fr animates height without measuring anything */}
              <div
                ref={(el) => {
                  panelRefs.current[s.id] = el;
                }}
                className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <PixelImage
                    src={s.art}
                    alt=""
                    maxBlock={22}
                    className="h-44 w-full border-y border-[var(--line)]"
                  />
                  <div className="p-5">
                    <p className="text-[0.92rem] leading-relaxed text-mute">{s.blurb}</p>
                    <ul className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-5">
                      {s.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex gap-3 text-[0.86rem] leading-relaxed text-ink/72"
                        >
                          <span className="mt-2 h-1 w-1 shrink-0 rotate-45 bg-acc" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {s.stack.map((t) => (
                        <li
                          key={t}
                          className="label border border-[var(--line)] px-2 py-1 text-[0.58rem] text-mute"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ---------- desktop: pinned horizontal rail ---------- */}
      <div
        ref={trackRef}
        className="hidden px-[var(--shell)] lg:flex lg:h-[100svh] lg:w-max lg:flex-row lg:items-center lg:gap-8 lg:pt-36"
      >
        {services.map((s) => (
          <article
            key={s.id}
            id={s.id}
            ref={(el) => {
              cardRefs.current[s.id] = el;
            }}
            className="panel group relative flex w-full flex-none flex-col overflow-hidden lg:h-[76vh] lg:w-[min(78vw,920px)] lg:flex-row"
          >
            <PixelImage
              src={s.art}
              alt=""
              maxBlock={26}
              className="h-56 w-full shrink-0 lg:h-full lg:w-[38%]"
            />

            <div className="flex flex-1 flex-col justify-between gap-7 p-7 lg:p-8">
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="label text-acc">{s.no}</span>
                  <span className="label">{s.kicker}</span>
                </div>
                <h3 className="display mt-4 text-[clamp(1.6rem,2.6vw,2.5rem)]">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-lg text-[0.92rem] leading-relaxed text-mute">
                  {s.blurb}
                </p>

                <ul className="mt-6 space-y-2 border-t border-[var(--line)] pt-5">
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 text-[0.82rem] leading-relaxed text-ink/72"
                    >
                      <span className="mt-2 h-1 w-1 shrink-0 rotate-45 bg-acc" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {s.stack.map((t) => (
                  <li
                    key={t}
                    className="label border border-[var(--line)] px-2 py-1 text-[0.58rem] text-mute"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}

        <div className="hidden w-[34vw] flex-none items-center lg:flex">
          <div>
            <p className="label">Next</p>
            <a
              href="#realtime-3d"
              className="display mt-4 block text-[clamp(1.6rem,3vw,2.8rem)] text-mute transition-colors hover:text-acc"
            >
              Inside the render loop →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

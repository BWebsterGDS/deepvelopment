"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { reveal, readIntroVariant, scrollLock, type IntroVariant } from "@/lib/reveal";
import { LogoMark } from "./Logo";

const WORD = "DEEPVELOPMENT";

/**
 * Two intro treatments, same timeline contract:
 *   "pixel" — the wordmark resolves from 44px mosaic blocks to sharp, then dissolves.
 *   "mask"  — the letterforms are holes in a black plate; the plate scales through them.
 * Which one ships is a build-time decision (NEXT_PUBLIC_INTRO) — one treatment per
 * deployment, no runtime switch. Both write `reveal.intro` (0 → 1) which the hero shader
 * reads to un-pixelate in sync, and `--intro-p` on <html> for the scale-through.
 */
export default function Intro() {
  const [variant, setVariant] = useState<IntroVariant>("pixel");
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);

  // the mask variant renders in SVG user units, so it needs the real viewport in
  // state (a ref would not re-render the <svg>)
  const [vp, setVp] = useState({ w: 1440, h: 900 });

  const plateRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const svgGroupRef = useRef<SVGGElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const dims = useRef({ w: 1440, h: 900, dpr: 1 });

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    dims.current = { ...dims.current, w, h };
    setVp({ w, h });
    setVariant(readIntroVariant());
    setMounted(true);
    if (reveal.introPlayed) {
      reveal.intro = 1;
      document.documentElement.style.setProperty("--intro-p", "1");
      setHidden(true);
      return;
    }
    // land on the hero, not wherever the browser restored to, and hold there
    // until the intro is done
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    scrollLock.stop();
  }, []);

  // ---- the timeline ----
  useEffect(() => {
    if (!mounted || hidden) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const plate = plateRef.current;
    if (!plate) return;

    const finish = () => {
      reveal.intro = 1;
      reveal.introPlayed = true;
      reveal.heroOut = 0;
      document.documentElement.style.setProperty("--intro-p", "1");
      document.documentElement.style.setProperty("--hero-out", "0");
      // release the lock only once we are provably at the top of the hero
      window.scrollTo(0, 0);
      scrollLock.start();
      window.scrollTo(0, 0);
      setHidden(true);
    };

    if (reduce || variant === "off") {
      finish();
      return;
    }

    const state = { count: 0, block: 44, alpha: 1, p: 0 };

    // ---- pixel variant: build a source canvas of the wordmark once ----
    let src: HTMLCanvasElement | null = null;
    let tmp: HTMLCanvasElement | null = null;

    const buildSource = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dims.current = { w, h, dpr };

      const c = canvasRef.current;
      if (c) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }

      src = document.createElement("canvas");
      src.width = w;
      src.height = h;
      const s = src.getContext("2d")!;
      s.clearRect(0, 0, w, h);

      // canvas 2D cannot parse var() in a font shorthand — resolve it first
      const family =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-dv-display")
          .trim() || "system-ui";

      const size = Math.min(w * 0.115, h * 0.2);
      s.font = `600 ${size}px ${family}, system-ui, sans-serif`;
      // wide machine-set caps; ignored by engines without letterSpacing support
      if ("letterSpacing" in s) s.letterSpacing = `${size * 0.05}px`;
      s.textAlign = "center";
      s.textBaseline = "middle";

      // measure and squeeze to a fixed optical width
      const target = Math.min(w * 0.84, 1500);
      const natural = s.measureText(WORD).width || target;
      s.save();
      s.translate(w / 2, h / 2);
      s.scale(target / natural, 1);
      const g = s.createLinearGradient(-target / 2, -size / 2, target / 2, size / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.42, "#8f9ea9");
      g.addColorStop(0.58, "#eef4f8");
      g.addColorStop(1, "#ffffff");
      s.fillStyle = g;
      s.fillText(WORD, 0, 0);
      s.restore();

      // a thin cyan rule + kicker under the wordmark, so the mosaic has two scales in it
      s.fillStyle = "#4de3ff";
      s.fillRect(w / 2 - target / 2, h / 2 + size * 0.72, target, 2);
      const mono =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-dv-mono")
          .trim() || "monospace";
      s.font = `400 ${Math.max(11, size * 0.1)}px ${mono}, monospace`;
      s.fillStyle = "rgba(244,246,248,0.55)";
      s.fillText("FULL-STACK ENGINEERING", w / 2, h / 2 + size * 0.95);

      tmp = document.createElement("canvas");
    };

    const drawPixel = () => {
      const c = canvasRef.current;
      if (!c || !src || !tmp) return;
      const ctx = c.getContext("2d")!;
      const block = Math.max(1, state.block);
      const bw = Math.max(1, Math.round(src.width / block));
      const bh = Math.max(1, Math.round(src.height / block));
      tmp.width = bw;
      tmp.height = bh;
      const t = tmp.getContext("2d")!;
      t.clearRect(0, 0, bw, bh);
      t.drawImage(src, 0, 0, bw, bh);

      ctx.clearRect(0, 0, c.width, c.height);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = state.alpha;
      ctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
    };

    const writeHud = () => {
      if (counterRef.current)
        counterRef.current.textContent = String(Math.round(state.count)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${state.count / 100})`;
    };

    const syncReveal = () => {
      reveal.intro = state.p;
      document.documentElement.style.setProperty("--intro-p", state.p.toFixed(4));
    };

    if (variant === "pixel") {
      buildSource();
      // webfont may land after first paint; redraw with real metrics when it does
      document.fonts?.ready.then(() => {
        if (variant !== "pixel") return;
        buildSource();
        drawPixel();
      });
    }

    /**
     * Pixel variant, when the network cooperates: a generated video plays the
     * assembly — blocks swarming into the wordmark — instead of the canvas
     * resolve. The canvas path is the guaranteed fallback: the video gets until
     * the end of the counter to become playable, and any failure at any point
     * falls back or exits cleanly, so nobody ever waits on an mp4.
     * `?intro=pixel` forces the canvas path; `?intro=video` waits for the file
     * (QA only). Data-saver connections never fetch it at all.
     */
    const q = new URLSearchParams(window.location.search).get("intro");
    const saveData =
      (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const tryVideo = variant === "pixel" && q !== "pixel" && !saveData;
    let videoFailed = false;
    let videoStarted = false;
    let settled = false; // exactly one path runs: video exit, canvas resolve, or bail

    const HURRY_TO = 1.9;
    let hurried = false;
    let video: HTMLVideoElement | null = null;

    // watchdog: a stalled tween must never leave someone on a black locked screen.
    // Reassigned with more headroom if the video path is adopted.
    let bail = window.setTimeout(finish, 9500);

    const tl = gsap.timeline();
    tlRef.current = tl;
    let activeTl: gsap.core.Timeline = tl;

    // shared: the loader count
    tl.to(state, {
      count: 100,
      duration: variant === "pixel" ? 1.6 : 1.45,
      ease: "power1.inOut",
      onUpdate: writeHud,
    });

    // explicit label: an *undefined* label string resolves to position 0, which
    // would run the reveal on top of the loader instead of after it
    tl.addLabel("reveal");

    /** shared tail: hero un-pixelates while the plate fades out over it */
    const runExit = () => {
      if (settled) return;
      settled = true;
      const ex = gsap.timeline({ onComplete: finish });
      activeTl = ex;
      ex.to(state, { p: 1, duration: 1.4, ease: "power2.out", onUpdate: syncReveal }, 0)
        .to(plate, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 0.15)
        .set(plate, { pointerEvents: "none" }, 0.15);
      if (hurried) ex.timeScale(1.5);
    };

    const runCanvasResolve = () => {
      if (settled) return;
      settled = true;
      drawPixel();
      // resolve → HOLD sharp → dissolve. Without the hold the wordmark was still
      // sharpening when the fade started, so it was never actually seen resolved.
      const c = gsap.timeline({ onComplete: finish });
      activeTl = c;
      c.to(state, { block: 1, duration: 1.05, ease: "expo.out", onUpdate: drawPixel }, 0)
        .to(hudRef.current, { opacity: 0, duration: 0.45, ease: "power2.in" }, 1.35)
        // 0.8s of nothing in between: the wordmark just sits there, sharp
        .to(state, { alpha: 0, duration: 0.7, ease: "power2.in", onUpdate: drawPixel }, 1.85)
        .to(state, { p: 1, duration: 1.5, ease: "power2.out", onUpdate: syncReveal }, 1.75)
        .to(plate, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, 1.95)
        // the hero un-pixelate outlives the plate fade; stop the invisible plate
        // swallowing clicks in between
        .set(plate, { pointerEvents: "none" }, 1.95);
      if (hurried) c.timeScale(Math.max(1, c.duration() / HURRY_TO));
    };

    const runVideo = (v: HTMLVideoElement) => {
      if (settled) return;
      window.clearTimeout(bail);
      bail = window.setTimeout(finish, 12000);
      v.playbackRate = hurried ? 2.6 : 1;
      v.play()
        .then(() => {
          videoStarted = true;
          // crossfade mosaic canvas → video; both show the same blocky wordmark,
          // so the swap reads as the animation continuing rather than a cut
          gsap.to(v, { opacity: 1, duration: 0.3, ease: "power1.out" });
          if (canvasRef.current)
            gsap.to(canvasRef.current, { opacity: 0, duration: 0.35, ease: "power1.in" });
          gsap.to(hudRef.current, {
            opacity: 0,
            duration: 0.45,
            delay: 0.15,
            ease: "power2.in",
          });
        })
        .catch(() => {
          videoFailed = true;
          runCanvasResolve();
        });
    };

    const decide = () => {
      const v = video;
      if (!tryVideo || !v || videoFailed) {
        runCanvasResolve();
        return;
      }
      if (v.readyState >= 3) {
        runVideo(v);
        return;
      }
      // nearly there: hold the mosaic a beat rather than abandoning the film. The
      // hold is invisible — the blocky wordmark just sits, same as the designed hold —
      // and strictly bounded so a dead connection still gets the canvas promptly.
      // ?intro=video waits long for QA.
      const grace = q === "video" ? 6000 : v.readyState >= 2 ? 900 : 350;
      const until = window.setTimeout(() => runCanvasResolve(), grace);
      v.addEventListener(
        "canplaythrough",
        () => {
          window.clearTimeout(until);
          runVideo(v); // both paths guard on `settled`, so a late event is harmless
        },
        { once: true }
      );
    };

    if (variant === "pixel") {
      drawPixel();
      if (tryVideo && videoRef.current) {
        video = videoRef.current;
        video.preload = "auto";
        video.load();
        video.addEventListener("ended", runExit);
        video.addEventListener("error", () => {
          videoFailed = true;
          // a decode error mid-play strands the last good frame; exit rather than hang
          if (videoStarted) runExit();
        });
      }
      tl.call(decide, undefined, "reveal");
    } else {
      tl.eventCallback("onComplete", finish);
      tl.to(
        hudRef.current,
        { opacity: 0, duration: 0.4, ease: "power2.in" },
        "reveal+=0.1"
      );
      // the letterform holes need something lit behind them, otherwise they open onto
      // a hero that is still black and the whole intro reads as a blank screen
      tl.to(
        svgGroupRef.current,
        {
          scale: 34,
          svgOrigin: `${dims.current.w / 2} ${dims.current.h / 2}`,
          duration: 1.9,
          ease: "expo.inOut",
        },
        "reveal"
      )
        .to(
          backRef.current,
          { opacity: 0, duration: 0.95, ease: "power2.inOut" },
          "reveal+=0.45"
        )
        .to(
          state,
          { p: 1, duration: 1.5, ease: "power2.out", onUpdate: syncReveal },
          "reveal+=0.5"
        )
        .to(plate, { opacity: 0, duration: 0.55, ease: "power2.in" }, "reveal+=1.35");
    }

    /**
     * Keep the intro matched to the viewport. The canvas backing store was sized once at
     * mount, so opening the page at one size and then resizing left CSS stretching a
     * fixed-resolution bitmap: the wordmark skewed and the mosaic blocks went oblong.
     * The mask variant had the same problem through a stale viewBox.
     *
     * visualViewport is included so a mobile address bar collapsing counts as a resize.
     * Coalesced into a frame because a drag-resize fires this continuously, and
     * buildSource redraws the whole wordmark each time.
     */
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (w === dims.current.w && h === dims.current.h) return;
        dims.current = { ...dims.current, w, h };
        setVp({ w, h });

        if (variant === "pixel") {
          buildSource();
          drawPixel();
        } else if (svgGroupRef.current) {
          // re-centre the growing letterform on the new viewport, or it opens off-axis
          gsap.set(svgGroupRef.current, { svgOrigin: `${w / 2} ${h / 2}` });
        }
      });
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    /**
     * A tap hurries the intro, it does not skip it. Jumping to the end threw away the
     * whole reveal, so impatience was punished with a black frame and then the page.
     * Each phase compresses in its own way — the counter snaps to done, a GSAP phase
     * rescales its remainder to land in HURRY_TO seconds, and the video speeds up —
     * so every beat still plays, just faster.
     */
    const hurry = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape" && e.key !== " ") return;
      if (hurried) return;
      hurried = true;
      if (video && videoStarted && !settled) {
        video.playbackRate = 2.6;
        return;
      }
      const t = activeTl;
      const remaining = t.duration() - t.time();
      // the counter phase hurries hard so the real content arrives sooner; content
      // phases keep the HURRY_TO landing that reads as "responding", not "breaking"
      const target = t === tl ? 0.4 : HURRY_TO;
      // already inside the window: let it land on its own rather than stutter
      if (remaining <= target) return;
      gsap.to(t, {
        timeScale: remaining / target,
        duration: 0.28,
        ease: "power2.out",
        overwrite: true,
      });
    };

    window.addEventListener("keydown", hurry);
    plate.addEventListener("click", hurry);

    return () => {
      window.clearTimeout(bail);
      window.removeEventListener("keydown", hurry);
      plate.removeEventListener("click", hurry);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      if (video) {
        video.pause();
        video.removeEventListener("ended", runExit);
      }
      for (const t of new Set([tl, activeTl])) {
        gsap.killTweensOf(t);
        t.kill();
      }
    };
  }, [mounted, hidden, variant]);

  return (
    <>
      {!hidden && (
        <div
          ref={plateRef}
          aria-hidden
          className="fixed inset-0 z-[100] cursor-pointer bg-[#08090b]"
        >
          {mounted && variant === "pixel" && (
            <>
              {/* the generated assembly video, adopted only if it is playable by the
                  end of the counter — the canvas below is the guaranteed fallback.
                  Its frames share the plate's #08090b, so `contain` letterboxing on
                  portrait screens is invisible. */}
              <video
                ref={videoRef}
                src="/intro.mp4"
                muted
                playsInline
                preload="none"
                className="absolute inset-0 h-full w-full object-contain opacity-0"
              />
              <canvas ref={canvasRef} className="h-full w-full" />
            </>
          )}

          {mounted && variant === "mask" && (
            <>
              {/* lit surface the letterform holes open onto; fades out as the plate
                  scales, so the type glows first and the hero arrives second */}
              <div
                ref={backRef}
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(104deg, rgba(77,227,255,0.42) 0%, rgba(77,227,255,0) 58%), " +
                    "radial-gradient(115% 85% at 50% 44%, #f6fbff 0%, #b9c9d6 26%, #6c7f8e 48%, #223039 74%, #0b0e12 100%)",
                }}
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${vp.w} ${vp.h}`}
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <mask id="dv-cut" maskUnits="userSpaceOnUse">
                    <rect
                      x={-vp.w * 20}
                      y={-vp.h * 20}
                      width={vp.w * 41}
                      height={vp.h * 41}
                      fill="#fff"
                    />
                    <g ref={svgGroupRef}>
                      <text
                        x={vp.w / 2}
                        y={vp.h / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        textLength={Math.min(vp.w * 0.84, 1500)}
                        lengthAdjust="spacingAndGlyphs"
                        fontSize={Math.min(vp.w * 0.115, vp.h * 0.2)}
                        fontWeight={600}
                        letterSpacing="0.02em"
                        fill="#000"
                        style={{ fontFamily: "var(--font-dv-display), system-ui" }}
                      >
                        {WORD}
                      </text>
                    </g>
                  </mask>
                </defs>
                <rect width={vp.w} height={vp.h} fill="#08090b" mask="url(#dv-cut)" />
              </svg>
            </>
          )}

          <div
            ref={hudRef}
            className="pointer-events-none absolute inset-x-0 bottom-0 shell pb-8"
          >
            <div className="flex items-end justify-between gap-6">
              <span className="flex items-center gap-4">
                <LogoMark className="h-5 w-5" />
                <span className="label text-ink">
                  <span ref={counterRef}>000</span>
                  <span className="text-mute"> / 100</span>
                </span>
              </span>
              <span className="label hidden sm:block">
                compiling shaders · warming ledger · edge online
              </span>
            </div>
            <span className="mt-4 block h-px w-full bg-[var(--line-strong)]">
              <span
                ref={barRef}
                className="block h-px w-full origin-left scale-x-0 bg-acc"
              />
            </span>
          </div>
        </div>
      )}
    </>
  );
}

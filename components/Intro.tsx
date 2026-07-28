"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { reveal, readIntroVariant, scrollLock, type IntroVariant } from "@/lib/reveal";
import { LogoMark } from "./Logo";

const WORD = "DEEPVELOPMENT";

/**
 * Two intro treatments, same timeline contract:
 *   "pixel" — the wordmark lives as a coarse mosaic while the counter runs, the blocks
 *             shimmering like something computing; it settles, glitches once, then
 *             cascades from 44px blocks to sharp type and dissolves into the hero.
 *   "mask"  — the letterforms are holes in a black plate; the plate scales through them.
 *
 * The pixel choreography is procedural on a canvas, not a video, on purpose. A film is
 * a fixed aspect ratio, but the loading placeholder is composed against the live
 * viewport — so a video always opened with a visible cut, and generated footage added
 * texture the flat mosaic never had. Drawing every phase with the same renderer makes
 * the first frame of the animation *identical* to the placeholder at any window size.
 *
 * Which treatment ships is a build-time decision (NEXT_PUBLIC_INTRO). Both write
 * `reveal.intro` (0 → 1), which the hero shader reads to un-pixelate in sync, and
 * `--intro-p` on <html> for the copy scale-through.
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

    const bailEarly = window.setTimeout(finish, 9500);

    /**
     * fx is everything the draw function reads:
     *   block   — mosaic cell size in px (44 = the placeholder, 1 = sharp)
     *   shimmer — fraction of cells whose brightness breathes each frame
     *   glitch  — 0..1 slice-tear + ghost-split amount
     *   alpha   — wordmark opacity for the final dissolve
     *   p       — hero reveal progress, mirrored into reveal.intro
     */
    const fx = { count: 0, block: 44, shimmer: 0.28, glitch: 0, alpha: 1, p: 0 };

    // ---- pixel variant: build a source canvas of the wordmark once ----
    let src: HTMLCanvasElement | null = null;
    let tmp: HTMLCanvasElement | null = null;
    let tmp2: HTMLCanvasElement | null = null;
    let pyrA: HTMLCanvasElement | null = null;
    let pyrB: HTMLCanvasElement | null = null;

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
      tmp2 = document.createElement("canvas");
      pyrA = document.createElement("canvas");
      pyrB = document.createElement("canvas");
    };

    const drawPixel = () => {
      const c = canvasRef.current;
      if (!c || !src || !tmp || !tmp2) return;
      const ctx = c.getContext("2d")!;
      const block = Math.max(1, fx.block);
      const bw = Math.max(1, Math.round(src.width / block));
      const bh = Math.max(1, Math.round(src.height / block));
      tmp.width = bw;
      tmp.height = bh;
      const t = tmp.getContext("2d")!;
      t.clearRect(0, 0, bw, bh);

      /**
       * Downscale through a pyramid of halvings rather than in one jump. A single
       * drawImage to a 29-cell-wide canvas *samples* the source, so thin glyph
       * strokes fall between sample points and most of the word simply vanishes —
       * the mosaic showed a scatter of lucky cells instead of the wordmark. Halving
       * repeatedly approximates a box filter: every stroke contributes to its cell.
       */
      let from: HTMLCanvasElement = src;
      let fw = src.width;
      let fh = src.height;
      let ping = true;
      while (fw / 2 >= bw * 2 && fh / 2 >= 2) {
        const dst = ping ? pyrA! : pyrB!;
        const hw = Math.max(1, Math.round(fw / 2));
        const hh = Math.max(1, Math.round(fh / 2));
        dst.width = hw;
        dst.height = hh;
        const dctx = dst.getContext("2d")!;
        dctx.clearRect(0, 0, hw, hh);
        dctx.drawImage(from, 0, 0, fw, fh, 0, 0, hw, hh);
        from = dst;
        fw = hw;
        fh = hh;
        ping = !ping;
      }
      t.drawImage(from, 0, 0, fw, fh, 0, 0, bw, bh);

      // living pixels: a sprinkle of cells breathe in brightness while the mosaic is
      // coarse — it reads as the wordmark being computed rather than just sitting there
      if (fx.shimmer > 0.01 && block > 6) {
        const img = t.getImageData(0, 0, bw, bh);
        const d = img.data;
        const cells = Math.floor(bw * bh * 0.06 * fx.shimmer);
        for (let i = 0; i < cells; i++) {
          const idx = (Math.random() * bw * bh) | 0;
          const o = idx * 4;
          if (d[o + 3] === 0) continue; // leave the empty background alone
          const f = 0.45 + Math.random() * 1.1;
          d[o] = Math.min(255, d[o] * f);
          d[o + 1] = Math.min(255, d[o + 1] * f);
          d[o + 2] = Math.min(255, d[o + 2] * f);
        }
        t.putImageData(img, 0, 0);
      }

      // glitch: block-aligned horizontal slice tears, done on the small canvas so the
      // displacement is always a whole number of cells — it stays inside the pixel
      // language instead of looking like a video effect
      if (fx.glitch > 0.01) {
        tmp2.width = bw;
        tmp2.height = bh;
        const t2 = tmp2.getContext("2d")!;
        t2.clearRect(0, 0, bw, bh);
        t2.drawImage(tmp, 0, 0);
        const tears = 2 + ((fx.glitch * 4) | 0);
        for (let i = 0; i < tears; i++) {
          const y = (Math.random() * bh) | 0;
          const rows = 1 + ((Math.random() * 2) | 0);
          const dx = Math.round((Math.random() - 0.5) * fx.glitch * bw * 0.14);
          t.clearRect(0, y, bw, rows);
          t.drawImage(tmp2, 0, y, bw, rows, dx, y, bw, rows);
        }
      }

      ctx.clearRect(0, 0, c.width, c.height);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = fx.alpha;
      ctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, c.width, c.height);

      // ghost split during the glitch: the same mosaic drawn faint and offset by one
      // cell either side, which reads as a signal splitting rather than blurring
      if (fx.glitch > 0.01) {
        const shift = Math.max(2, (c.width / bw) | 0);
        ctx.globalAlpha = fx.alpha * 0.28 * fx.glitch;
        ctx.drawImage(tmp, 0, 0, bw, bh, shift, 0, c.width, c.height);
        ctx.drawImage(tmp, 0, 0, bw, bh, -shift, 0, c.width, c.height);
      }
      ctx.globalAlpha = 1;
    };

    const writeHud = () => {
      if (counterRef.current)
        counterRef.current.textContent = String(Math.round(fx.count)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${fx.count / 100})`;
    };

    const syncReveal = () => {
      reveal.intro = fx.p;
      document.documentElement.style.setProperty("--intro-p", fx.p.toFixed(4));
    };

    if (variant === "pixel") {
      buildSource();
      drawPixel();
      // webfont may land after first paint; redraw with real metrics when it does
      document.fonts?.ready.then(() => {
        if (variant !== "pixel") return;
        buildSource();
        drawPixel();
      });
    }

    const tl = gsap.timeline({ onComplete: finish });
    tlRef.current = tl;
    // QA hook: ?introDebug=1 exposes the timeline so tests can freeze exact phases.
    // Screenshot tools race a live timeline and always lose; a paused one cannot move.
    if (new URLSearchParams(window.location.search).get("introDebug") === "1") {
      (window as unknown as { __introTl?: gsap.core.Timeline }).__introTl = tl;
      window.clearTimeout(bailEarly);
    }

    // shared: the loader count
    tl.to(fx, {
      count: 100,
      duration: variant === "pixel" ? 1.6 : 1.45,
      ease: "power1.inOut",
      onUpdate: writeHud,
    });

    // explicit label: an *undefined* label string resolves to position 0, which
    // would run the reveal on top of the loader instead of after it
    tl.addLabel("reveal");

    if (variant === "pixel") {
      /**
       * The arc, all in the mosaic's own language:
       *   counting — blocks shimmer gently, the word sits coarse (== the placeholder)
       *   settle   — the shimmer dies away: visible, still pixelated
       *   glitch   — two short block-aligned tears with a ghost split
       *   cascade  — 44px blocks subdivide to sharp type
       *   hold     — sharp wordmark sits for a beat, then dissolves into the hero
       */
      tl.to(
        fx,
        { shimmer: 0.5, duration: 1.6, ease: "power1.in", onUpdate: drawPixel },
        0
      );

      tl.to(fx, { shimmer: 0, duration: 0.45, ease: "power1.out", onUpdate: drawPixel }, "reveal")
        .to(fx, { glitch: 1, duration: 0.09, ease: "power2.in", onUpdate: drawPixel }, "reveal+=0.55")
        .to(fx, { glitch: 0, duration: 0.07, onUpdate: drawPixel }, "reveal+=0.64")
        .to(fx, { glitch: 0.75, duration: 0.06, onUpdate: drawPixel }, "reveal+=0.79")
        .to(fx, { glitch: 0, duration: 0.09, onUpdate: drawPixel }, "reveal+=0.85")
        .to(
          fx,
          { block: 1, duration: 1.0, ease: "power3.inOut", onUpdate: drawPixel },
          "reveal+=0.98"
        )
        .to(hudRef.current, { opacity: 0, duration: 0.45, ease: "power2.in" }, "reveal+=1.65")
        // ~0.5s of nothing here: the wordmark just sits there, sharp
        .to(fx, { alpha: 0, duration: 0.6, ease: "power2.in", onUpdate: drawPixel }, "reveal+=2.5")
        .to(fx, { p: 1, duration: 1.5, ease: "power2.out", onUpdate: syncReveal }, "reveal+=2.4")
        .to(plate, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, "reveal+=2.6")
        // the hero un-pixelate outlives the plate fade; stop the invisible plate
        // swallowing clicks in between
        .set(plate, { pointerEvents: "none" }, "reveal+=2.6");
    } else {
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
          fx,
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

    // watchdog: a stalled tween must never leave someone on a black locked screen.
    // Comfortably past the ~5.5s pixel timeline so it only ever fires on a real stall.
    // (declared as bailEarly above the debug hook so QA can cancel it when frozen)
    const bail = bailEarly;

    /**
     * A tap hurries the intro, it does not skip it. Jumping to the end threw away the
     * whole reveal, so impatience was punished with a black frame and then the page.
     * Instead the remaining timeline is rescaled to land in HURRY_TO seconds and every
     * beat still plays, just faster. The scale ramps in over a moment so the tap reads
     * as the animation responding rather than the frame rate breaking.
     */
    const HURRY_TO = 1.9;
    let hurried = false;

    const hurry = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape" && e.key !== " ") return;
      if (hurried) return;
      const remaining = tl.duration() - tl.time();
      // already inside the target window: let it land on its own rather than stutter
      if (remaining <= HURRY_TO) return;
      hurried = true;
      // ease the scale in from wherever we are, not from 1, in case anything else
      // has touched it
      gsap.to(tl, {
        timeScale: remaining / HURRY_TO,
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
      gsap.killTweensOf(tl);
      tl.kill();
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
            <canvas ref={canvasRef} className="h-full w-full" />
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

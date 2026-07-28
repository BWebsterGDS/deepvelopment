"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reveal, scrollLock, scrollToEl, scrollToY } from "@/lib/reveal";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const onHome = usePathname() === "/";

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // heroOut drives the pixelation shader; cheap enough to compute on every tick
    const trackHero = () => {
      reveal.heroOut = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      // exposed as a CSS var so the hero copy can fade with the pixelation
      document.documentElement.style.setProperty(
        "--hero-out",
        reveal.heroOut.toFixed(4)
      );
    };

    if (reduce) {
      // ponytail: no lenis, no rAF loop. Native scroll + ScrollTrigger is enough.
      window.addEventListener("scroll", trackHero, { passive: true });
      trackHero();
      return () => window.removeEventListener("scroll", trackHero);
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      lerp: 0.09,
    });

    lenis.on("scroll", () => {
      ScrollTrigger.update();
      trackHero();
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    trackHero();

    // the intro holds the page at the top through these
    scrollLock.stop = () => {
      lenis.stop();
      document.documentElement.style.overflow = "hidden";
    };
    scrollLock.start = () => {
      document.documentElement.style.overflow = "";
      // resync lenis to the top, else it eases back to the offset it cached
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
    };
    scrollLock.resume = () => {
      document.documentElement.style.overflow = "";
      lenis.start();
    };
    // only the home page has an intro to wait for. Locking here on any other route
    // would leave that page unscrollable forever, because nothing would release it.
    if (onHome && !reveal.intro) scrollLock.stop();

    scrollToEl.go = (el, offset = 0) =>
      lenis.scrollTo(el as HTMLElement, { offset, duration: 1 });

    scrollToY.go = (y) => lenis.scrollTo(y, { duration: 1.2 });

    // anchor links go through lenis so they inherit the same easing
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as
        | HTMLAnchorElement
        | null;
      const href = a?.getAttribute("href");
      if (!href || href === "#") return;
      // discipline chips carry their own navigation: they have to reach a card inside a
      // pinned horizontal rail, which this generic handler cannot express
      if (a?.dataset.dvService) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      // clear the fixed 64px header, else every anchor lands with its own label
      // tucked underneath it. #top wants the true top, not 76px above it.
      const offset = href === "#top" ? 0 : -76;
      lenis.scrollTo(target as HTMLElement, { offset, duration: 1.4 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      document.documentElement.style.overflow = "";
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [onHome]);

  return <>{children}</>;
}

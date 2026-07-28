// ponytail: module-level store instead of a context provider. Two numbers, read
// every frame by the canvases, written by the intro and the scroll listener.
// If a third consumer ever needs to *react* (re-render) to these, add a context then.
export const reveal = {
  /** 0 while the intro plate covers the page, 1 once it has fully resolved. */
  intro: 0,
  /** 0 at the top of the hero, 1 once the hero has scrolled a full viewport away. */
  heroOut: 0,
  /** set true after the intro has played once this tab session. */
  introPlayed: false,
};

/**
 * Scroll lock, used to hold the page at the top while the intro plays so you always
 * land on the hero. SmoothScroll swaps in the lenis-aware versions when it mounts;
 * the defaults cover the reduced-motion path where lenis never exists.
 * ponytail: two function slots beat a context + provider for something the intro
 * calls exactly twice.
 */
export const scrollLock = {
  stop: () => {
    document.documentElement.style.overflow = "hidden";
  },
  /** release the lock and snap back to the top — the intro, exactly once */
  start: () => {
    document.documentElement.style.overflow = "";
  },
  /** release the lock where it was left — the mobile menu sheet, every time */
  resume: () => {
    document.documentElement.style.overflow = "";
  },
};

/**
 * Scroll to an element through whichever scroller is live, so programmatic scrolls
 * inherit the same easing as an anchor click. SmoothScroll swaps in the lenis
 * version; the default covers the reduced-motion path where lenis never exists.
 */
export const scrollToEl = {
  go: (el: Element, offset = 0) => {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY + offset,
      behavior: "smooth",
    });
  },
};

/**
 * Scroll to an absolute document position. Needed for the pinned horizontal rail,
 * where a card's on-screen position comes from a transform rather than from layout,
 * so there is no element an anchor could usefully target: the destination has to be
 * computed as a scroll offset instead.
 */
export const scrollToY = {
  go: (y: number) => window.scrollTo({ top: y, behavior: "smooth" }),
};

/** "off" is a QA escape hatch via ?intro=off — never the deployed default. */
export type IntroVariant = "pixel" | "mask" | "off";

/**
 * Which intro this deployment ships. Set NEXT_PUBLIC_INTRO=mask on the mask site;
 * anything else builds the pixel-dissolve. Inlined at build time, so each Vercel
 * project is a single-treatment site with no runtime switch.
 */
const DEPLOYED: IntroVariant = process.env.NEXT_PUBLIC_INTRO === "mask" ? "mask" : "pixel";

export function readIntroVariant(): IntroVariant {
  if (typeof window === "undefined") return DEPLOYED;
  const q = new URLSearchParams(window.location.search).get("intro");
  if (q === "mask" || q === "pixel" || q === "off") return q;
  return DEPLOYED;
}

import Link from "next/link";
import HeroCanvas from "./HeroCanvas";

export default function Hero() {
  return (
    <section id="top" className="relative min-h-[100svh] overflow-hidden">
      <HeroCanvas />

      {/* scrim: keeps the headline column readable over the render */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(96deg, #08090b 0%, rgba(8,9,11,0.92) 26%, rgba(8,9,11,0.55) 48%, rgba(8,9,11,0) 72%)",
        }}
      />
      {/* portrait gets a vertical scrim instead — the render sits low on mobile */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#08090b] via-[#08090b]/80 to-transparent lg:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#08090b] to-transparent"
      />

      {/* scale-through: driven by --intro-p, written by the intro timeline.
          copy fades out with --hero-out as the render re-pixelates. */}
      <div
        className="relative z-10 flex min-h-[100svh] flex-col justify-between shell pb-8 pt-24 sm:pb-10 sm:pt-28"
        style={{
          opacity: "calc(var(--intro-p, 1) * (1 - var(--hero-out, 0)))",
          transform: "scale(calc(1 + 0.09 * (1 - var(--intro-p, 1))))",
          transformOrigin: "50% 46%",
        }}
      >
        <div className="max-w-5xl">
          <p className="label mb-8 flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-acc" />
            Full-stack engineering studio
          </p>

          <h1 className="display text-[clamp(2.1rem,6.1vw,6rem)]">
            <span className="block">Engineering that goes</span>
            <span className="block chrome">deeper than the brief.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[clamp(0.98rem,1.35vw,1.2rem)] leading-relaxed text-mute sm:mt-8">
            Eight disciplines in one delivery team: fintech, ERP, real-time 3D,
            commerce, growth, security, AI automation and smart contracts. We are
            finished when everything runs without us. No walls, no guesswork,
            nobody left in the dark.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-2.5 sm:mt-10 sm:gap-3">
            <Link href="/start" className="btn btn-primary w-full min-[360px]:w-auto min-[360px]:flex-1 sm:flex-none">
              Start a build
              <span aria-hidden className="btn-arrow">
                →
              </span>
            </Link>
            <a href="#realtime-3d" className="btn btn-ghost w-full min-[360px]:w-auto min-[360px]:flex-1 sm:flex-none">
              See the 3D work
            </a>
          </div>
        </div>

        {/* portrait stacks these: stats first over the render, cue underneath.
            landscape puts them on one line. Same markup, reordered. */}
        <div className="mt-10 flex flex-col gap-5 sm:mt-0 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          {/* the scroll cue is desktop only: on a phone scrolling needs no explaining,
              and the marker crowded the stat strip at small sizes */}
          <div className="label order-2 hidden items-center gap-3 sm:order-1 sm:flex">
            <span className="relative flex h-8 w-px overflow-hidden bg-[var(--line-strong)]">
              <span className="absolute inset-x-0 top-0 h-3 animate-[drift_2.4s_linear_infinite] bg-acc" />
            </span>
            Scroll
          </div>
          {/* four stats: 2x2 on a phone, one line from sm up */}
          <dl className="order-1 grid grid-cols-2 gap-x-5 gap-y-4 sm:order-2 sm:flex sm:gap-10">
            {[
              ["08", "disciplines", "disciplines"],
              ["200+", "partners", "partners shipped with"],
              ["07", "years", "years in business"],
              ["60", "fps budget", "fps render budget"],
            ].map(([v, short, long]) => (
              <div key={long} className="border-t border-[var(--line-strong)] pt-3 sm:border-0 sm:pt-0">
                <dt className="techno text-xl sm:text-2xl">{v}</dt>
                <dd className="label mt-1 text-[0.58rem] tracking-[0.1em] sm:text-[0.6875rem] sm:tracking-[0.2em]">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{long}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

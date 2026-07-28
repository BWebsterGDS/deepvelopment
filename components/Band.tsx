import { metrics } from "@/lib/content";
import PixelImage from "./PixelImage";

export default function Band() {
  return (
    <section className="relative hair-t hair-b">
      {/* PixelImage owns `position: relative`, so it needs an absolute wrapper
          rather than absolute classes of its own */}
      <div aria-hidden className="absolute inset-0 opacity-40">
        <PixelImage src="/art/hero.webp" alt="" maxBlock={52} className="h-full w-full" />
      </div>
      <div className="relative shell py-16 sm:py-24 lg:py-28">
        <p className="label rise">Non-negotiables</p>
        {/* two-up on a phone: four full-width rows read as a list, not as a stat block */}
        <dl className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:mt-10 sm:gap-10 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.note} className="rise border-t border-[var(--line-strong)] pt-4 sm:pt-5">
              <dt className="display text-[clamp(1.9rem,4.4vw,3.6rem)]">
                {m.value}
                <span className="ml-1 text-acc text-[0.4em] align-super font-mono">
                  {m.unit}
                </span>
              </dt>
              <dd className="mt-2.5 text-[0.8rem] leading-relaxed text-mute sm:mt-3 sm:text-[0.84rem]">
                {m.note}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

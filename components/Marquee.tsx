import { capabilities } from "@/lib/content";

export default function Marquee() {
  // duplicated once; the track translates -50% so the seam is invisible
  const row = [...capabilities, ...capabilities];

  return (
    <section className="marquee hair-t hair-b overflow-hidden py-4 sm:py-5" aria-label="Capabilities">
      <div className="marquee-track flex w-max gap-8 sm:gap-10" style={{ ["--dur" as string]: "44s" }}>
        {row.map((c, i) => (
          <span key={`${c}-${i}`} className="flex items-center gap-8 whitespace-nowrap sm:gap-10">
            <span className="text-sm text-mute transition-colors hover:text-ink">{c}</span>
            <span className="h-1 w-1 rotate-45 bg-acc/60" />
          </span>
        ))}
      </div>
    </section>
  );
}

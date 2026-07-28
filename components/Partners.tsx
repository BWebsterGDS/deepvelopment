import { partners } from "@/lib/content";

function Row({ items, reverse, dur }: { items: string[]; reverse?: boolean; dur: string }) {
  const row = [...items, ...items];
  return (
    <div className="marquee overflow-hidden py-2 sm:py-3">
      <div
        className={`marquee-track flex w-max items-center gap-8 sm:gap-12 ${reverse ? "reverse" : ""}`}
        style={{ ["--dur" as string]: dur }}
      >
        {row.map((p, i) => (
          <span key={`${p}-${i}`} className="flex items-center gap-8 whitespace-nowrap sm:gap-12">
            <span className="font-display text-[clamp(1.35rem,3.2vw,2.8rem)] font-semibold tracking-[0.005em] text-ink/38 transition-colors duration-300 hover:text-ink">
              {p}
            </span>
            <span className="h-1.5 w-1.5 rotate-45 bg-acc/50" />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Partners() {
  const half = Math.ceil(partners.length / 2);

  return (
    <section id="partners" className="hair-b py-16 sm:py-24 lg:py-28">
      <div className="shell rise-head">
        <div className="flex flex-wrap items-end justify-between gap-5 sm:gap-6">
          <div>
            <p className="label">Partners &amp; clients</p>
            <h2 className="display mt-4 text-[clamp(1.8rem,4vw,3.4rem)]">
              Shipped alongside.
            </h2>
          </div>
          <p className="max-w-sm text-[0.86rem] leading-relaxed text-mute">
            Two hundred and counting. A fashion label, two car makers&apos; NFT drops, a
            crypto exchange, a government department and a skate park have all had very
            different definitions of done, and most of the rest we cannot name.
          </p>
        </div>
      </div>

      <div className="mt-10 sm:mt-14">
        <Row items={partners.slice(0, half)} dur="46s" />
        <Row items={partners.slice(half)} reverse dur="52s" />
      </div>
    </section>
  );
}

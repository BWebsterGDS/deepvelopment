import { process } from "@/lib/content";
import Reveal from "./Reveal";

export default function Process() {
  return (
    <section className="shell py-16 sm:py-24 lg:py-32">
      <Reveal>
        <p className="label">How it runs</p>
        <h2 className="display mt-4 max-w-3xl text-[clamp(1.8rem,4vw,3.4rem)]">
          Four stages, and none of them is a status call.
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-px bg-[var(--line)] sm:mt-14 md:grid-cols-2 xl:grid-cols-4">
        {process.map((p, i) => (
          <Reveal key={p.no} delay={i * 90} className="bg-[#08090b]">
            <div className="group h-full bg-[#0a0c0f] p-6 transition-colors duration-500 hover:bg-[#0d1116] sm:p-7">
              <span className="label text-acc">{p.no}</span>
              <h3 className="mt-6 text-lg font-medium tracking-[-0.03em]">{p.title}</h3>
              <p className="mt-4 text-[0.86rem] leading-relaxed text-mute">{p.body}</p>
              <span className="mt-8 block h-px w-0 bg-acc transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:w-full" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

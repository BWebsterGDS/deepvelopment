import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import StartCanvas from "@/components/StartCanvas";
import StartForm from "@/components/StartForm";

export const metadata: Metadata = {
  // the root layout appends " — Deepvelopment" via its title template
  title: "Start a build",
  description:
    "Tell us what has to hold under load. Send the constraint and a budget range, and you get an honest answer in the first reply.",
};

export default function StartPage() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden">
      <StartCanvas />

      {/* the canvas is the backdrop, so the column needs its own readable ground */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,9,11,0.30) 0%, rgba(8,9,11,0.72) 46%, #08090b 82%)",
        }}
      />
      {/* landscape: keep the reading column dark and let the render breathe on the right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
        style={{
          background:
            "linear-gradient(96deg, #08090b 0%, rgba(8,9,11,0.92) 24%, rgba(8,9,11,0.45) 46%, rgba(8,9,11,0) 68%)",
        }}
      />

      <div className="relative z-10">
        <header className="shell flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="Deepvelopment — home" className="-my-2 py-2">
            <Logo
              markClass="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
              textClass="text-[0.82rem] sm:text-[0.95rem]"
            />
          </Link>
          <Link href="/" className="label -my-3 py-3 transition-colors hover:text-ink">
            ← Back
          </Link>
        </header>

        <div className="shell pb-24 pt-10 sm:pt-16 lg:pb-32">
          <div className="max-w-3xl">
            <p className="label text-acc">Start a build</p>
            <h1 className="display mt-4 text-[clamp(2.1rem,6vw,4.6rem)]">
              <span className="block">Tell us what has to</span>
              <span className="block chrome">hold under load.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[0.95rem] leading-relaxed text-mute sm:text-[1.02rem]">
              Four minutes here saves a fortnight of scoping calls. The more specific the
              constraint, the more useful the first reply, and a budget range means we can
              tell you straight away whether we are the right people.
            </p>
          </div>

          <div className="mt-14 max-w-5xl sm:mt-20">
            <StartForm />
          </div>
        </div>
      </div>
    </main>
  );
}

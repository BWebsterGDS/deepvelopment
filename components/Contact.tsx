import Link from "next/link";
import DisciplineLinks from "./DisciplineLinks";
import Logo from "./Logo";
import Reveal from "./Reveal";

const EMAIL = "hello@deepvelopment.com";

export default function Contact() {
  return (
    <>
      <section id="contact" className="hair-t relative overflow-hidden">
        <div className="shell py-16 sm:py-28 lg:py-36">
          <Reveal>
            <p className="label">Start a build</p>
            <h2 className="display mt-6 max-w-4xl text-[clamp(2rem,5.6vw,4.8rem)]">
              Tell us what has to
              <span className="chrome"> hold under load.</span>
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-6 sm:mt-12">
              {/* the headline route is the form, not a mail client: the email itself
                  stays available below for anyone who would rather just write */}
              <Link
                href="/start"
                className="group -my-2 inline-flex items-baseline gap-3 py-2 text-[clamp(1.05rem,2.4vw,1.9rem)] font-medium tracking-[-0.03em]"
              >
                <span className="border-b border-acc/40 pb-1 transition-colors group-hover:border-acc group-hover:text-acc">
                  Start a build
                </span>
                <span className="text-acc transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <p className="max-w-xs text-[0.84rem] leading-relaxed text-mute">
                Tell us the constraint before the spec. A budget range and a deadline let
                us answer you honestly in the first reply. Or write to{" "}
                <a
                  href={`mailto:${EMAIL}?subject=New%20build%20enquiry`}
                  className="text-ink underline decoration-acc/40 underline-offset-4 transition-colors hover:text-acc"
                >
                  {EMAIL}
                </a>
                .
              </p>
            </div>
          </Reveal>

          <Reveal delay={220}>
            <DisciplineLinks />
          </Reveal>
        </div>
      </section>

      <footer className="hair-t shell py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="shrink-0">
            <Logo markClass="h-5 w-5" textClass="text-sm" />
          </span>
          {/* the discipline line only appears once there is genuinely room for it. It
              grew past the row when smart contracts was added, and squeezed the year
              down to a clipped "© 20". */}
          <p className="label hidden min-w-0 text-[0.6rem] leading-relaxed tracking-[0.12em] lg:block lg:text-[0.62rem] lg:tracking-[0.1em] xl:text-[0.6875rem] xl:tracking-[0.16em]">
            Full-stack engineering · fintech · ERP · real-time 3D · commerce · growth ·
            security · AI automation · smart contracts
          </p>
          <p className="label shrink-0 whitespace-nowrap">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </>
  );
}

import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import ServiceRail from "@/components/ServiceRail";
import GLDeepDive from "@/components/GLDeepDive";
import AgentLoop from "@/components/AgentLoop";
import Band from "@/components/Band";
import Partners from "@/components/Partners";
import Process from "@/components/Process";
import Contact from "@/components/Contact";
import MobileCta from "@/components/MobileCta";

export default function Home() {
  return (
    <main>
      {/* React hoists this into <head>: the intro film starts downloading with the
          HTML instead of waiting for hydration, so it reliably wins the race against
          the loading counter. Home route only — /start never plays it. */}
      <link rel="preload" href="/intro.mp4" as="video" type="video/mp4" />
      <Hero />
      <Marquee />
      <ServiceRail />
      <GLDeepDive />
      <AgentLoop />
      <Band />
      <Partners />
      <Process />
      <Contact />
      <MobileCta />
    </main>
  );
}

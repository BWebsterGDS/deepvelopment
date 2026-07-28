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

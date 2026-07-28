import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import SiteChrome from "@/components/SiteChrome";

// display: angular, squared terminals — technical without tipping into sci-fi cosplay
const display = Chakra_Petch({
  variable: "--font-dv-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
// body: geometric-humanist, holds long paragraphs at small sizes
const sans = Sora({ variable: "--font-dv-body", subsets: ["latin"] });
// labels, counters, code: machine voice
const mono = JetBrains_Mono({ variable: "--font-dv-mono", subsets: ["latin"] });

const TAGLINE = "The frontier of agentic programming, automation and delivery.";
const DESCRIPTION =
  "The frontier of agentic programming, automation and delivery. Fintech, ERP, real-time 3D and WebGL, commerce, growth, security, AI agents and smart contracts, under one delivery team.";

/**
 * metadataBase makes the file-based opengraph-image resolve to an absolute URL, which
 * every social scraper requires. Set NEXT_PUBLIC_SITE_URL when a custom domain lands;
 * the fallback keeps previews working on the Vercel alias meanwhile.
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://deepvelopment-pixel.vercel.app"
  ),
  title: {
    default: "Deepvelopment — agentic programming, automation and delivery",
    template: "%s — Deepvelopment",
  },
  description: DESCRIPTION,
  applicationName: "Deepvelopment",
  keywords: [
    "agentic programming",
    "AI automation",
    "LangGraph",
    "RAG",
    "smart contract audit",
    "token vesting",
    "fintech engineering",
    "ERP implementation",
    "WebGL",
    "Unreal Pixel Streaming",
    "headless commerce",
    "technical SEO",
    "application security",
    "development studio",
  ],
  openGraph: {
    type: "website",
    siteName: "Deepvelopment",
    title: "Deepvelopment",
    description: TAGLINE,
  },
  twitter: {
    card: "summary_large_image",
    title: "Deepvelopment",
    description: TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="grain">
        <SiteChrome />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

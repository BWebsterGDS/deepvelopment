import { LogoMark } from "./Logo";

/**
 * Fills the run-off below a sticky column. Both deep dives pair a short sticky panel
 * with a tall scrolling column, and the grid's own `bg-[var(--line)]` was showing
 * through the gap as a pale grey block. This region scrolls for a long time on a big
 * screen, so it has to hold up on its own rather than fade to flat black.
 *
 * Layers, back to front:
 *   - a rule grid at 96px, always present, so the field is never empty
 *   - three dot grids at different pitches, cross-fading on scroll so the texture
 *     resolves and re-pixelates the way PixelImage treats the stills
 *   - a large logo watermark, low enough to read as texture rather than branding
 *   - two gradient pools
 *   - static nodes for constant density, plus nodes drifting down eight hairlines
 *
 * Two boxes on purpose. `overflow: hidden` makes an element a scroll container and
 * `view()` resolves against the nearest one, so anything scroll-driven inside a clipped
 * box gets a timeline that never advances and sits frozen mid-animation. The dot layers
 * therefore live on the unclipped root; only the wires, whose nodes run off the bottom
 * edge, go inside the clipped child.
 *
 * Where `animation-timeline: view()` is unsupported the layers hold their declared
 * opacity, which is a plain dot grid. Under prefers-reduced-motion the global rule
 * collapses the drop animation, and the static nodes carry the density instead.
 */

const dots = (a: number) =>
  `radial-gradient(circle, rgba(255,255,255,${a}) 1px, transparent 1px)`;

/** pitch, resting opacity, and which half of the cross-fade the layer belongs to */
const LAYERS = [
  { size: "30px 30px", alpha: 0.1, opacity: 0.35, cls: "signal-px-coarse" },
  { size: "20px 20px", alpha: 0.085, opacity: 0.7, cls: "signal-px-mid" },
  { size: "13px 13px", alpha: 0.07, opacity: 0.55, cls: "signal-px-fine" },
];

const WIRES = [
  { x: "8%", dim: 0.05, nodes: [{ dur: "12s", delay: "0s" }] },
  { x: "20%", dim: 0.03, nodes: [{ dur: "9s", delay: "3.6s" }, { dur: "9s", delay: "8.1s" }] },
  { x: "31%", dim: 0.055, nodes: [{ dur: "14s", delay: "1.4s" }] },
  { x: "43%", dim: 0.03, nodes: [{ dur: "10.5s", delay: "6.2s" }] },
  { x: "55%", dim: 0.05, nodes: [{ dur: "8s", delay: "2.7s" }, { dur: "8s", delay: "6.5s" }] },
  { x: "67%", dim: 0.035, nodes: [{ dur: "13s", delay: "5.1s" }] },
  { x: "79%", dim: 0.05, nodes: [{ dur: "11s", delay: "0.8s" }, { dur: "11s", delay: "6.9s" }] },
  { x: "91%", dim: 0.03, nodes: [{ dur: "9.8s", delay: "4.4s" }] },
];

/** fixed so the field has weight even between passes of the moving nodes */
const STATIC = [
  { x: "8%", y: "14%", o: 0.2 },
  { x: "31%", y: "7%", o: 0.13 },
  { x: "55%", y: "21%", o: 0.16 },
  { x: "91%", y: "11%", o: 0.11 },
  { x: "20%", y: "33%", o: 0.17 },
  { x: "67%", y: "38%", o: 0.12 },
  { x: "43%", y: "47%", o: 0.2 },
  { x: "79%", y: "44%", o: 0.14 },
  { x: "8%", y: "58%", o: 0.12 },
  { x: "55%", y: "63%", o: 0.18 },
  { x: "31%", y: "71%", o: 0.14 },
  { x: "91%", y: "68%", o: 0.16 },
  { x: "67%", y: "81%", o: 0.13 },
  { x: "20%", y: "88%", o: 0.19 },
  { x: "79%", y: "93%", o: 0.12 },
];

export default function SignalFill({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`relative bg-[#0a0c0f] ${className}`}>
      {/* rule grid: the constant floor, so nothing is ever flat black */}
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.028) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.028) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />

      {/* unclipped: these are the scroll-driven ones */}
      {LAYERS.map((l) => (
        <span
          key={l.cls}
          className={`absolute inset-0 ${l.cls}`}
          style={{
            backgroundImage: dots(l.alpha),
            backgroundSize: l.size,
            opacity: l.opacity,
          }}
        />
      ))}

      <LogoMark className="absolute -right-16 bottom-10 h-[19rem] w-[19rem] opacity-[0.028]" />

      {/* cool wash from the top, cyan pooling into the bottom edge */}
      <span
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 78% -10%, rgba(122,158,255,0.06) 0%, rgba(122,158,255,0) 62%)",
        }}
      />
      <span
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(77,227,255,0) 40%, rgba(77,227,255,0.055) 100%)",
        }}
      />

      {/* clipped: nodes run off the bottom edge, and the pool sits half outside */}
      <div className="absolute inset-0 overflow-hidden">
        <span
          className="absolute -bottom-28 left-[6%] h-72 w-72 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(77,227,255,0.12) 0%, rgba(77,227,255,0) 70%)",
          }}
        />
        <span
          className="absolute -top-20 right-[18%] h-64 w-64 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(122,158,255,0.07) 0%, rgba(122,158,255,0) 70%)",
          }}
        />

        {STATIC.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className="absolute h-1 w-1 rotate-45 bg-acc"
            style={{ left: s.x, top: s.y, opacity: s.o }}
          />
        ))}

        {WIRES.map((w) => (
          <span
            key={w.x}
            className="absolute bottom-0 top-0 w-px"
            style={{ left: w.x, background: `rgba(255,255,255,${w.dim})` }}
          >
            {/* the track is what moves; the node just rides at the top of it */}
            {w.nodes.map((n) => (
              <span
                key={n.delay}
                className="signal-track absolute inset-x-0 bottom-0 h-[520px]"
                style={{ animationDuration: n.dur, animationDelay: n.delay }}
              >
                <span
                  className="absolute -left-[3px] top-0 h-[7px] w-[7px] rotate-45 bg-acc"
                  style={{ boxShadow: "0 0 10px 2px rgba(77,227,255,0.4)" }}
                />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Fold from "./Fold";
import PixelImage from "./PixelImage";
import SignalFill from "./SignalFill";

type DragState = { dragging: boolean; dx: number; dy: number; vx: number; vy: number };

/** radians per second the model turns when nobody is touching it */
const IDLE_SPIN = 0.16;

type Mode = "shaded" | "wire" | "points" | "normals";

const MODES: { id: Mode; label: string; note: string }[] = [
  {
    id: "shaded",
    label: "Shaded",
    note: "PBR metal, roughness 0.18, IBL from a local env probe",
  },
  {
    id: "wire",
    label: "Wireframe",
    note: "Triangle topology — what the rasteriser actually receives",
  },
  {
    id: "points",
    label: "Vertices",
    note: "Vertex buffer as points; density is your VRAM bill",
  },
  {
    id: "normals",
    label: "Normals",
    note: "Object-space normals, the first thing to check when lighting looks wrong",
  },
];

const PIPELINE = [
  [
    "01",
    "Vertex fetch",
    "Interleaved attribute buffers, index buffer, instance attributes",
  ],
  [
    "02",
    "Vertex shader",
    "Model→view→clip transform, displacement, skinning, morph targets",
  ],
  [
    "03",
    "Primitive assembly",
    "Triangle setup, backface cull, frustum + clip-space rejection",
  ],
  [
    "04",
    "Rasterisation",
    "Fragment generation, early-Z, quad overdraw — where fill rate dies",
  ],
  ["05", "Fragment shader", "BRDF evaluation, texture sampling, shadow lookups, fog"],
  [
    "06",
    "Output merger",
    "Depth/stencil test, blending, MRT writes for a deferred pass",
  ],
  [
    "07",
    "Resolve & post",
    "MSAA resolve, tonemap, bloom, TAA history, colour space conversion",
  ],
];

const BUDGET = [
  [
    "Frame time",
    "16.6 ms",
    "60fps ceiling; hero scenes are built against 11 ms to leave headroom",
  ],
  ["Draw calls", "< 150", "Instanced and merged; every uniform block change costs you"],
  [
    "Triangles",
    "< 1.2 M",
    "LOD chains swap at screen-space error, not at fixed distance",
  ],
  [
    "Texture memory",
    "< 256 MB",
    "KTX2/Basis, ASTC on mobile, BC7 on desktop, transcoded per device",
  ],
  [
    "Shader compiles",
    "0 mid-scene",
    "Programs warmed on load; a late compile is a visible hitch",
  ],
  [
    "JS heap churn",
    "~0 per frame",
    "No allocation in the render loop, or the GC schedules your stutter",
  ],
];

const SNIPPET = `// vertex — displacement on the GPU, curl noise sampled once per vertex
uniform float uTime;
uniform float uAmp;
varying vec3 vN;

void main() {
  vec3 p = position;
  float n = curl(p * 1.9 + uTime * 0.15).y;   // 3 taps, no derivative in VS
  p += normal * n * uAmp;

  // recompute the normal from the displaced neighbourhood, else lighting lies
  vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
  vec3 pt = p + t * 0.01 + normal * curl((p + t * 0.01) * 1.9).y * uAmp;
  vN = normalize(cross(pt - p, cross(normal, t)));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

/**
 * A phone is a portrait viewport with a near-square canvas: the same camera that
 * frames the knot on a desktop crops it. Pull back and narrow the fov instead of
 * scaling the model, so the geometry — and therefore the counters — stay honest.
 */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const tight = size.width / size.height < 1.1;
    cam.position.z = tight ? 7.4 : 5.6;
    cam.fov = tight ? 34 : 38;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function LocalEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = tex;
    return () => {
      tex.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

function Stats({
  onSample,
}: {
  onSample: (s: { tris: number; calls: number; programs: number }) => void;
}) {
  const { gl } = useThree();
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.5) return;
    acc.current = 0;
    onSample({
      tris: gl.info.render.triangles,
      calls: gl.info.render.calls,
      programs: gl.info.programs?.length ?? 0,
    });
  });
  return null;
}

/**
 * Rotation only, never scale, because the canvas box is a fixed height and nothing may
 * grow out of it.
 *
 * The angle is accumulated rather than eased toward a target. The previous version
 * lerped rotation.y toward a scroll-derived target at roughly 99.9% per second while
 * OrbitControls moved the camera, so a drag was overwritten almost immediately and the
 * model appeared to snap straight back to where it started.
 *
 * A drag now turns the model directly and leaves velocity behind, which decays in real
 * time, so releasing mid-flick lets it coast to a stop and settle into the idle drift.
 * Scroll adds on top instead of competing.
 */
function Knot({
  mode,
  progress,
  drag,
}: {
  mode: Mode;
  progress: React.RefObject<number>;
  drag: React.RefObject<DragState>;
}) {
  const ref = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const tilt = useRef(0);
  const geo = useMemo(() => new THREE.TorusKnotGeometry(1.02, 0.33, 320, 44), []);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const step = Math.min(dt, 1 / 30); // cap the step so a dropped frame cannot jolt it
    const d = drag.current;

    if (d.dragging) {
      // the pointer owns the angle outright, with no idle drift fighting the hand
      spin.current += d.dx;
      tilt.current = THREE.MathUtils.clamp(tilt.current + d.dy, -0.85, 0.85);
    } else {
      // coast: velocity decays to about 8% of itself per second, in real time so the
      // feel does not change with frame rate
      d.vx *= Math.pow(0.08, step);
      d.vy *= Math.pow(0.08, step);
      spin.current += (IDLE_SPIN + d.vx) * step;
      tilt.current += d.vy * step;
      // drift the tilt home once the flick has died away
      tilt.current += (Math.sin(spin.current * 0.35) * 0.16 - tilt.current) * step * 0.9;
    }
    d.dx = 0;
    d.dy = 0;

    // scroll adds on top of whatever the user did rather than replacing it
    g.rotation.y = spin.current + (progress.current ?? 0) * Math.PI * 1.6;
    g.rotation.x = tilt.current;
  });

  return (
    <group ref={ref}>
      {mode === "shaded" && (
        <mesh geometry={geo}>
          <meshStandardMaterial
            color="#dde5ec"
            metalness={1}
            roughness={0.18}
            envMapIntensity={1.2}
          />
        </mesh>
      )}
      {mode === "wire" && (
        <mesh geometry={geo}>
          <meshBasicMaterial color="#4de3ff" wireframe transparent opacity={0.5} />
        </mesh>
      )}
      {mode === "points" && (
        <points geometry={geo}>
          <pointsMaterial
            color="#4de3ff"
            size={0.011}
            sizeAttenuation
            transparent
            opacity={0.9}
          />
        </points>
      )}
      {mode === "normals" && (
        <mesh geometry={geo}>
          <meshNormalMaterial />
        </mesh>
      )}
    </group>
  );
}

export default function GLDeepDive() {
  const [mode, setMode] = useState<Mode>("shaded");
  const [stats, setStats] = useState({ tris: 0, calls: 0, programs: 0 });
  const [live, setLive] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const drag = useRef<DragState>({ dragging: false, dx: 0, dy: 0, vx: 0, vy: 0 });
  // session-scoped on purpose: worth showing once per page load, and someone who
  // reloads has probably forgotten the canvas is draggable
  const [hinted, setHinted] = useState(true);

  /**
   * Pointer handlers rather than OrbitControls, so a drag turns the model itself and
   * hands velocity to the render loop on release. touch-action is pan-y on the box, so
   * a vertical swipe still scrolls the page and only sideways drags grab the model.
   */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    let id: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    const down = (e: PointerEvent) => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      drag.current.dragging = true;
      drag.current.vx = 0;
      drag.current.vy = 0;
      setHinted(false);
    };

    const move = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      const dx = (e.clientX - lastX) * 0.007;
      const dy = (e.clientY - lastY) * 0.005;
      // seconds since the last sample, floored so a 0ms gap cannot divide by zero
      const dt = Math.max((e.timeStamp - lastT) / 1000, 0.008);
      drag.current.dx += dx;
      drag.current.dy += dy;
      // clamped, or one stray fast sample sends it spinning for ten seconds
      drag.current.vx = THREE.MathUtils.clamp(dx / dt, -12, 12);
      drag.current.vy = THREE.MathUtils.clamp(dy / dt, -8, 8);
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
    };

    const up = (e: PointerEvent) => {
      if (id !== e.pointerId) return;
      id = null;
      drag.current.dragging = false;
      // a pointer that came to rest before release should not fling
      if (e.timeStamp - lastT > 90) {
        drag.current.vx = 0;
        drag.current.vy = 0;
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    // generous margin: the loop is already running before the box is on screen,
    // so you never see a stale frame being stretched into place
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), {
      rootMargin: "40% 0px",
    });
    io.observe(el);

    // scroll progress of the box through the viewport, read on scroll not per frame
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const span = window.innerHeight + r.height;
      progress.current = Math.min(1, Math.max(0, (window.innerHeight - r.top) / span));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const active = MODES.find((m) => m.id === mode)!;

  return (
    <section id="realtime-3d" className="hair-t relative">
      <div className="shell py-16 sm:py-24 lg:py-32">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="rise-head max-w-2xl">
            <p className="label text-acc">03 — deep dive</p>
            <h2 className="display mt-4 text-[clamp(2rem,5vw,4.2rem)]">
              Inside the render loop.
            </h2>
            {/* the middle clause is desktop-only: nine lines of prose is a wall on a
                phone, and the last sentence is the part that tells you what to do */}
            <p className="mt-5 text-[0.95rem] leading-relaxed text-mute sm:mt-6 sm:text-[1.02rem]">
              <span className="hidden sm:inline">
                Anyone can drop a model into a page.{" "}
              </span>
              Shipping real-time 3D means owning the whole chain, from authored geometry
              through compression, upload, shader programs and draw submission, inside
              the 16.6ms a frame gives you.{" "}
              <span className="text-ink/80">
                The canvas below is live. Drag to orbit it, switch the debug view, and
                watch the counters move as you scroll.
              </span>
            </p>
          </div>
          <PixelImage
            src="/art/webgl.webp"
            alt="Chrome sculpture rendered half shaded, half wireframe"
            maxBlock={34}
            className="hidden h-40 w-[320px] shrink-0 xl:block"
          />
        </div>

        <div className="mt-10 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:mt-14 lg:grid-cols-[1.02fr_1fr]">
          {/* ---- live canvas: fixed height, clipped, sticky through the column beside it.
                  The item stretches to the row so the panel below the sticky block is
                  ours to fill, rather than the grid's line colour showing through. ---- */}
          <div className="flex flex-col bg-[#0a0c0f]">
            <div className="bg-[#0a0c0f] lg:sticky lg:top-16 lg:z-10">
              {/* 2×2 on phones — four across at 390px clipped the longer labels */}
              <div className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`label px-2 py-4 text-center text-[0.6rem] tracking-[0.12em] transition-colors sm:py-3 sm:tracking-[0.18em] ${
                      mode === m.id
                        ? "bg-acc text-[#05070a]"
                        : "bg-[#0a0c0f] active:bg-[#12171d] hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div
                ref={boxRef}
                className="relative h-[clamp(320px,58svh,600px)] cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing"
              >
                {/* affordance: the canvas gives no clue it is interactive until you try */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center transition-opacity duration-500 ${
                    hinted ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <span className="label flex items-center gap-2 border border-[var(--line-strong)] bg-[#0a0c0f]/80 px-3 py-2 text-[0.55rem] tracking-[0.14em] text-ink/80 backdrop-blur-sm">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0 text-acc"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 4.5 L7 15 L9.6 12.7 L11.6 17.2 L13.9 16.2 L11.9 11.8 L15.2 11.4 Z" />
                      <path d="M18.6 6.2 L21 8.6 L18.6 11" />
                      <path d="M5.4 6.2 L3 8.6 L5.4 11" />
                    </svg>
                    Drag to move
                  </span>
                </div>

                <Canvas
                  dpr={[1, 1.5]}
                  frameloop={live ? "always" : "never"}
                  camera={{ position: [0, 0, 5.6], fov: 38 }}
                  gl={{ antialias: true, powerPreference: "high-performance" }}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <color attach="background" args={["#0a0c0f"]} />
                  <FitCamera />
                  <LocalEnv />
                  <ambientLight intensity={0.25} />
                  <pointLight position={[3, 3, 3]} intensity={22} color="#ffffff" />
                  <pointLight position={[-4, -1, -2]} intensity={16} color="#4de3ff" />
                  <Knot mode={mode} progress={progress} drag={drag} />
                  <Stats onSample={setStats} />
                </Canvas>
              </div>

              {/* counters sit under the canvas on phones; overlaid on it from lg up,
                where there is room that does not land on the model */}
              <div className="pointer-events-none flex flex-col gap-3 border-t border-[var(--line)] p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 lg:absolute lg:inset-x-0 lg:bottom-14 lg:border-0 lg:p-5">
                {/* fixed columns: side-by-side flex let the wide mono labels collide */}
                <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-6">
                  {[
                    ["triangles", stats.tris.toLocaleString()],
                    ["draw calls", String(stats.calls)],
                    ["programs", String(stats.programs)],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dd className="font-mono text-[0.8rem] text-acc sm:text-sm">
                        {v}
                      </dd>
                      <dt className="label mt-0.5 truncate text-[0.55rem] tracking-[0.08em]">
                        {k}
                      </dt>
                    </div>
                  ))}
                </dl>
                <p className="label shrink-0 text-[0.55rem] tracking-[0.12em]">
                  live counters
                </p>
              </div>

              <p className="label border-t border-[var(--line)] px-5 py-4 text-[0.6rem] tracking-[0.12em] sm:tracking-[0.18em]">
                {active.note}
              </p>
            </div>

            <SignalFill className="hidden flex-1 border-t border-[var(--line)] lg:block" />
          </div>

          {/* ---- the column that scrolls past it ---- */}
          <div className="bg-[#0a0c0f]">
            <Fold title="Draw call → lit pixel" defaultOpen>
              <ol>
                {PIPELINE.map(([no, stage, detail]) => (
                  <li
                    key={no}
                    className="grid grid-cols-[1.75rem_1fr] gap-3 border-t border-[var(--line)] py-3 sm:grid-cols-[2rem_1fr]"
                  >
                    <span className="label pt-0.5 text-[0.6rem] text-acc">{no}</span>
                    <span>
                      <span className="block text-[0.86rem]">{stage}</span>
                      <span className="mt-1 block text-[0.78rem] leading-relaxed text-mute">
                        {detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Fold>

            <Fold title="Budgets we actually hold">
              <table className="w-full text-left">
                <tbody>
                  {BUDGET.map(([k, v, note]) => (
                    <tr key={k} className="border-t border-[var(--line)] align-top">
                      <th className="py-3 pr-3 text-[0.82rem] font-normal">{k}</th>
                      <td className="py-3 font-mono text-[0.82rem] whitespace-nowrap text-acc">
                        {v}
                      </td>
                      <td className="hidden py-3 pl-4 text-[0.76rem] leading-relaxed text-mute xl:table-cell">
                        {note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Fold>

            <Fold title="Written at the shader level">
              <pre className="-mx-6 overflow-x-auto px-6 font-mono text-[0.72rem] leading-[1.65] text-ink/78 lg:mx-0 lg:px-0">
                <code>{SNIPPET}</code>
              </pre>
              <p className="mt-6 text-[0.8rem] leading-relaxed text-mute">
                On the asset side, geometry is authored in Blender, exported as glTF 2.0
                and quantised with meshopt. Textures go out as KTX2 with Basis
                Universal, so one file serves ASTC to a phone and BC7 to a desktop.
                WebGPU is where this goes next: the same scene graph, WGSL in place of
                GLSL, and compute passes doing the work the framebuffer ping-pong does
                today.
              </p>
            </Fold>

            <Fold title="When the browser is the wrong renderer">
              <p className="text-[0.82rem] leading-relaxed text-mute">
                Some scenes are never going to fit the budgets above. A configurator with
                film-grade materials, or an environment built on Nanite geometry, belongs
                in Unreal Engine 5 with Epic&apos;s Pixel Streaming. The frame renders on
                a GPU host, the browser receives video over WebRTC, and input travels back
                the other way, so fidelity stops being limited by whatever laptop opened
                the page.
              </p>
              <p className="mt-5 text-[0.82rem] leading-relaxed text-mute">
                What you trade is a download for a GPU instance per concurrent viewer,
                plus a latency floor set by how far the user sits from the nearest region.
                That is a real cost with a real ceiling on concurrency, which is why we
                will still argue for WebGL when WebGL is enough. Knowing which of the two
                a project needs is most of the value here.
              </p>
            </Fold>
          </div>
        </div>
      </div>
    </section>
  );
}

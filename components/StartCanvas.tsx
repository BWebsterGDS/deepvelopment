"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Backdrop for the enquiry page. Deliberately not HeroCanvas: that one reads
 * reveal.intro and reveal.heroOut, which are both zero here, so it would render fully
 * pixelated and never resolve. This is the same material language with none of that
 * state, and it drifts with the pointer rather than with scroll.
 */

function Env() {
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

function Rig({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { size } = useThree();

  // landscape puts the object to the right of the reading column; portrait drops it
  // low and centred, where the vertical scrim can carry it
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    const portrait = size.width / size.height < 1;
    g.position.set(portrait ? 0 : 2.5, portrait ? -1.6 : 0.1, 0);
    g.scale.setScalar(portrait ? 0.82 : 1);
  }, [size]);

  const knot = useMemo(() => new THREE.TorusKnotGeometry(1.25, 0.28, 260, 40, 2, 5), []);
  const shell = useMemo(() => new THREE.IcosahedronGeometry(2.5, 1), []);
  useEffect(() => {
    return () => {
      knot.dispose();
      shell.dispose();
    };
  }, [knot, shell]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 1 / 30);
    const g = group.current;
    const i = inner.current;
    if (!g || !i) return;
    // pointer parallax, damped so a fast flick reads as a lean rather than a snap
    const p = pointer.current ?? { x: 0, y: 0 };
    g.rotation.y += (p.x * 0.5 - g.rotation.y) * (1 - Math.pow(0.002, step));
    g.rotation.x += (-p.y * 0.32 - g.rotation.x) * (1 - Math.pow(0.002, step));
    i.rotation.y += step * 0.14;
    i.rotation.z += step * 0.05;
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        <mesh geometry={knot}>
          <meshStandardMaterial
            color="#dbe4ec"
            metalness={1}
            roughness={0.17}
            envMapIntensity={1.6}
          />
        </mesh>
        <mesh geometry={shell}>
          <meshBasicMaterial color="#4de3ff" wireframe transparent opacity={0.16} />
        </mesh>
      </group>
    </group>
  );
}

export default function StartCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLive(false);
      return;
    }

    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), {
      rootMargin: "20% 0px",
    });
    io.observe(el);

    // fine pointers only: on a phone this would never fire and costs a listener
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      pointer.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      if (fine) window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={hostRef} aria-hidden className="absolute inset-0 z-0">
      <Canvas
        // one frame is enough when the loop is parked, and the object still reads
        frameloop={live ? "always" : "demand"}
        dpr={[1, typeof window !== "undefined" && window.innerWidth < 768 ? 1.3 : 1.6]}
        camera={{ position: [0, 0, 6.8], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#08090b"]} />
        <fogExp2 attach="fog" args={["#08090b", 0.018]} />
        <Env />
        <ambientLight intensity={0.25} />
        <pointLight position={[4, 3, 4]} intensity={34} />
        <pointLight position={[-5, -2, -3]} intensity={18} color="#4de3ff" />
        <Rig pointer={pointer} />
      </Canvas>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { reveal } from "@/lib/reveal";

/**
 * Hero scene rendered off-screen, then resolved through a mosaic pass.
 * uPixel is driven by two things:
 *   intro   — 47px blocks resolving to 1 as the intro completes
 *   heroOut — re-pixelating as the hero scrolls away, so the effect bookends the section
 * One shader, two drivers. Nothing else needs to know about it.
 */
export default function HeroCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    // phones run this at 3x device ratio through a full-screen mosaic pass; 1.4 is
    // the point where the blocks still read clean and the GPU stops throttling
    const dprCap = window.innerWidth < 768 ? 1.4 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x08090b, 1);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08090b, 0.052);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    camera.position.set(0, 1.15, 8.2);

    // ---- environment (local; no remote HDRI fetch) ----
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.035).texture;
    scene.environment = envMap;

    // ---- ground grid ----
    const gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      // uPulse is the ring's current radius, driven from JS so the gap between pulses
      // can be random. Negative means no pulse is in flight.
      uniforms: {
        uTime: { value: 0 },
        uAcc: { value: new THREE.Color(0x4de3ff) },
        uPulse: { value: -1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying float vDist;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDist = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uAcc; uniform float uPulse;
        varying vec2 vUv; varying float vDist;
        float line(float c, float w) {
          float d = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          return 1.0 - smoothstep(0.0, w, d);
        }
        void main() {
          vec2 g = vUv * 70.0;
          float l = max(line(g.x, 1.1), line(g.y, 1.1));
          float major = max(line(g.x / 10.0, 1.0), line(g.y / 10.0, 1.0));
          // a scan pulse travelling outward from the centre, scheduled from JS
          float r = length(vUv - 0.5) * 2.0;
          // fade the ring out as it reaches the edge so it never pops mid-grid
          float tail = 1.0 - smoothstep(1.15, 1.6, uPulse);
          float pulse = uPulse < 0.0
            ? 0.0
            : smoothstep(0.06, 0.0, abs(r - uPulse)) * tail;
          float fade = smoothstep(1.0, 0.12, r);
          float a = (l * 0.13 + major * 0.22 + pulse * 0.5) * fade;
          a *= smoothstep(95.0, 12.0, vDist);
          gl_FragColor = vec4(mix(vec3(0.62, 0.70, 0.78), uAcc, major * 0.5 + pulse), a);
          #include <colorspace_fragment>
        }`,
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 1, 1), gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -2.6;
    scene.add(grid);

    // ---- particle field ----
    const COUNT = reduce ? 800 : 4200;
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = Math.random() * 22 - 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 46;
      seed[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 2.6 } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uSize;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y = mod(p.y - uTime * (0.18 + aSeed * 0.5) + 3.0, 25.0) - 3.0;
          p.x += sin(uTime * 0.22 + aSeed * 24.0) * 0.5;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (34.0 / -mv.z) * (0.5 + aSeed);
          vA = smoothstep(70.0, 6.0, -mv.z) * (0.25 + aSeed * 0.6);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d) * vA;
          gl_FragColor = vec4(mix(vec3(0.55, 0.78, 0.85), vec3(0.30, 0.89, 1.0), 0.6), a);
          #include <colorspace_fragment>
        }`,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // ---- chrome core + wire shell ----
    // offset right of centre so the headline column stays on clean background
    const focus = new THREE.Group();
    focus.position.set(3.15, -0.55, 0);
    scene.add(focus);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.42, 6),
      new THREE.MeshStandardMaterial({
        color: 0xdfe7ee,
        metalness: 1,
        roughness: 0.14,
        envMapIntensity: 1.15,
      })
    );
    focus.add(core);

    const shell = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.35, 2)),
      new THREE.LineBasicMaterial({
        color: 0x4de3ff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    focus.add(shell);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.45, 0.012, 6, 320),
      new THREE.MeshStandardMaterial({
        color: 0x9fb2be,
        metalness: 1,
        roughness: 0.2,
        envMapIntensity: 1.4,
      })
    );
    ring.rotation.set(Math.PI / 2.35, 0.2, 0);
    focus.add(ring);

    const rim = new THREE.PointLight(0x4de3ff, 24, 22);
    rim.position.set(-1.2, 2.4, 3.2);
    scene.add(rim);

    // ---- mosaic resolve pass ----
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
    });
    rt.texture.minFilter = THREE.NearestFilter;
    rt.texture.magFilter = THREE.NearestFilter;
    rt.texture.generateMipmaps = false;

    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: rt.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPixel: { value: 47 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform vec2 uRes;
        uniform float uPixel; uniform float uTime;
        varying vec2 vUv;

        vec2 snap(vec2 p, vec2 cells) {
          return (floor(p * cells) + 0.5) / cells;
        }

        void main() {
          float px = max(uPixel, 1.0);
          vec2 cells = max(uRes / px, vec2(2.0));
          float blocky = step(1.02, px);          // pass straight through once resolved
          vec2 uv = mix(vUv, snap(vUv, cells), blocky);

          // channel split by exactly one cell, snapped — an unsnapped offset samples
          // between blocks and turns the mosaic into rainbow confetti
          vec2 d = vec2(1.0 / cells.x, 0.0) * step(7.0, px);
          vec3 c;
          c.r = texture2D(tDiffuse, mix(vUv, snap(vUv + d, cells), blocky)).r;
          c.g = texture2D(tDiffuse, uv).g;
          c.b = texture2D(tDiffuse, mix(vUv - d, snap(vUv - d, cells), blocky)).b;

          // block-edge seams while mosaiced, so the pixels read as pixels
          vec2 f = fract(vUv * cells);
          float seam = (1.0 - smoothstep(0.0, 0.06, min(f.x, f.y))) * step(3.0, px);
          c *= 1.0 - seam * 0.35;

          // scanline + vignette
          c *= 1.0 - 0.05 * step(0.5, fract(vUv.y * uRes.y * 0.25));
          float v = distance(vUv, vec2(0.5));
          c *= 1.0 - v * v * 0.85;

          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    quad.frustumCulled = false;
    postScene.add(quad);

    const renderPass = () => {
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    };

    // ---- sizing ----
    let sized = false;
    let lookX = 0.85;
    let portrait = false;

    /**
     * The two layouts are eased into rather than snapped between, and the threshold has
     * hysteresis.
     *
     * The intro locks the page with `overflow: hidden`, which takes the scrollbar away
     * and makes the host about 15px wider. Releasing the lock hands it back. On a
     * smaller window that was enough to cross a hard `w / h < 0.95` test, so the moment
     * the intro finished the object jumped from full size to 0.78 and slid across the
     * screen. Needing to fall to 0.95 to enter portrait but climb past 1.02 to leave it
     * means a scrollbar can no longer flip the layout.
     */
    const goal = { x: 3.15, y: -0.55, z: 0, scale: 1, fov: 50, lookX: 0.85 };

    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      const ratio = w / h;
      portrait = portrait ? ratio < 1.02 : ratio < 0.95;

      // portrait: drop the object low and centre-ish, out from under the headline
      goal.x = portrait ? 0.4 : 3.15;
      goal.y = portrait ? -2.5 : -0.55;
      goal.z = portrait ? -2 : 0;
      goal.scale = portrait ? 0.78 : 1;
      goal.fov = portrait ? 60 : 50;
      goal.lookX = portrait ? 0.15 : 0.85;

      // the first pass has nothing to ease from, so it lands on the target directly
      if (!sized) {
        focus.position.set(goal.x, goal.y, goal.z);
        focus.scale.setScalar(goal.scale);
        camera.fov = goal.fov;
        lookX = goal.lookX;
      }

      camera.updateProjectionMatrix();
      const dpr = renderer.getPixelRatio();
      rt.setSize(Math.round(w * dpr), Math.round(h * dpr));
      postMat.uniforms.uRes.value.set(w * dpr, h * dpr);
      // repaint immediately: a resized target holds a stretched stale frame
      if (sized) renderPass();
    };
    resize();
    sized = true;
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // ---- parallax: cursor on a desktop, tilt or a finger on a phone ----
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /**
     * Device tilt, where it is available without asking. iOS gates this behind
     * DeviceOrientationEvent.requestPermission(), which needs a user gesture and puts a
     * system dialog in front of a first-time visitor, so we do not prompt. Android and
     * desktop-with-sensor fire it directly; iOS falls back to the pointermove above,
     * which still tracks a finger dragged across the hero.
     */
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        ?.requestPermission === "function";

    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma is left/right in degrees, beta is front/back. Clamp to a comfortable
      // wrist range so a small tilt covers the full travel.
      pointer.tx = Math.max(-1, Math.min(1, e.gamma / 32));
      pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 32));
    };
    const useTilt = !needsPermission && typeof DeviceOrientationEvent !== "undefined";
    if (useTilt) window.addEventListener("deviceorientation", onTilt, { passive: true });

    // ---- loop ----
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0,
    });
    io.observe(host);

    const clock = new THREE.Clock();
    let lastT = 0;

    /**
     * Scan pulse scheduling. This used to be `fract(uTime * 0.045)`, a fixed 22 second
     * period, which is why it felt like it never fired. It now starts shortly after the
     * hero is actually on screen and repeats on a random 6 to 9 second gap.
     *
     * The clock starts when the canvas mounts, which is behind the intro plate, so the
     * schedule is anchored to the moment the intro resolves instead. Otherwise the first
     * pulse burns off while nobody can see it.
     */
    const PULSE_TRAVEL = 2.4; // seconds for the ring to cross the grid
    const PULSE_SPEED = 1.6 / PULSE_TRAVEL;
    const nextGap = () => 6 + Math.random() * 3;
    let heroAt = -1;
    let pulseStart = -1;
    let pulseNext = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      const t = clock.getElapsedTime();
      gridMat.uniforms.uTime.value = t;
      pMat.uniforms.uTime.value = t;
      postMat.uniforms.uTime.value = t;

      // frame-rate independent damping. The old per-frame 0.045 moved twice as fast on
      // a 120Hz display as on a 60Hz one, which is what made this feel inconsistent.
      // dt comes off `t`, not clock.getDelta(): getElapsedTime() already consumed the
      // delta this frame, so getDelta() here would return ~0 and freeze the parallax.
      const dt = Math.min(t - lastT, 1 / 30);
      lastT = t;
      const ease = 1 - Math.pow(0.0009, dt);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;

      core.rotation.y = t * 0.12;
      core.rotation.x = Math.sin(t * 0.19) * 0.14;
      shell.rotation.y = -t * 0.07;
      shell.rotation.z = t * 0.03;
      ring.rotation.z = t * 0.16;

      camera.position.x = pointer.x * 1.15;
      camera.position.y = 1.15 - pointer.y * 0.6;
      // the subject counter-rotates a little, so the parallax reads as depth rather
      // than as the whole scene sliding
      focus.rotation.y = pointer.x * 0.12;
      focus.rotation.x = pointer.y * 0.07;
      // pull back slightly as the hero leaves, so the pixelation reads as a zoom-out
      camera.position.z = 8.2 + reveal.heroOut * 2.2;
      camera.lookAt(lookX, 0.1, 0);

      // ease toward the current layout, so any change of shape reads as a move rather
      // than a jump. Same time-corrected damping as the parallax.
      const layoutEase = 1 - Math.pow(0.0001, dt);
      focus.position.x += (goal.x - focus.position.x) * layoutEase;
      focus.position.y += (goal.y - focus.position.y) * layoutEase;
      focus.position.z += (goal.z - focus.position.z) * layoutEase;
      const sc = focus.scale.x + (goal.scale - focus.scale.x) * layoutEase;
      focus.scale.setScalar(sc);
      lookX += (goal.lookX - lookX) * layoutEase;
      if (Math.abs(camera.fov - goal.fov) > 0.01) {
        camera.fov += (goal.fov - camera.fov) * layoutEase;
        camera.updateProjectionMatrix();
      }

      // anchor the schedule to the hero becoming visible, then fire on a random gap
      if (heroAt < 0 && reveal.intro >= 0.999) {
        heroAt = t;
        pulseNext = t + 0.6; // first ring lands well inside the opening three seconds
      }
      if (heroAt >= 0 && t >= pulseNext) {
        pulseStart = t;
        pulseNext = t + nextGap();
      }
      gridMat.uniforms.uPulse.value =
        pulseStart < 0 ? -1 : (t - pulseStart) * PULSE_SPEED;

      const resolved = easeOut(Math.min(1, Math.max(0, reveal.intro)));
      const fromIntro = 1 + 46 * (1 - resolved);
      const fromScroll = 54 * Math.pow(reveal.heroOut, 1.6);
      postMat.uniforms.uPixel.value = fromIntro + fromScroll;

      renderPass();
    };

    if (reduce) {
      reveal.intro = 1;
      postMat.uniforms.uPixel.value = 1;
    }
    // paint once synchronously — the hero is never an empty black box, even if
    // rAF is throttled (background tab, low power mode)
    renderPass();
    if (!reduce) frame();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      if (useTilt) window.removeEventListener("deviceorientation", onTilt);
      envMap.dispose();
      pmrem.dispose();
      rt.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      postMat.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // z-0, not -z-10: a negative z-index child paints *below* body's own background,
  // which would hide the canvas entirely
  return <div ref={hostRef} className="absolute inset-0 z-0" aria-hidden />;
}

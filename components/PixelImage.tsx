"use client";

import { useEffect, useRef } from "react";

/**
 * The scroll pixelation, applied to a still: blocky as the frame enters or leaves
 * the viewport, resolving to sharp when it sits centred. 2D canvas rather than a
 * shader — one image, one downsample, no GL context to budget for.
 * ponytail: the <img> underneath is the fallback and the a11y/SEO surface. If the
 * canvas never gets a frame (no JS, decode error), the picture still shows.
 */
export default function PixelImage({
  src,
  alt,
  maxBlock = 30,
  className = "",
}: {
  src: string;
  alt: string;
  maxBlock?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.decoding = "async";
    const tmp = document.createElement("canvas");
    const tctx = tmp.getContext("2d")!;

    let ready = false;
    let raf = 0;
    let visible = false;
    let lastBlock = -1;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr));
      lastBlock = -1;
    };

    // object-fit: cover, by hand
    const cover = () => {
      const s = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * s;
      const h = img.height * s;
      return { x: (canvas.width - w) / 2, y: (canvas.height - h) / 2, w, h };
    };

    const draw = (block: number) => {
      if (!ready || Math.abs(block - lastBlock) < 0.35) return;
      lastBlock = block;
      const { x, y, w, h } = cover();

      if (block <= 1.05) {
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, w, h);
        return;
      }

      const bw = Math.max(2, Math.round(canvas.width / block));
      const bh = Math.max(2, Math.round(canvas.height / block));
      tmp.width = bw;
      tmp.height = bh;
      tctx.clearRect(0, 0, bw, bh);
      tctx.drawImage(
        img,
        (x / canvas.width) * bw,
        (y / canvas.height) * bh,
        (w / canvas.width) * bw,
        (h / canvas.height) * bh
      );

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tmp, 0, 0, bw, bh, 0, 0, canvas.width, canvas.height);
    };

    // distance from viewport centre on whichever axis the frame is actually moving
    // along — so this works unchanged inside the horizontally-pinned service rail
    const blockFor = () => {
      const r = wrap.getBoundingClientRect();
      const cx = (r.left + r.width / 2) / window.innerWidth;
      const cy = (r.top + r.height / 2) / window.innerHeight;
      const d = Math.min(
        1,
        Math.max(Math.abs(cx - 0.5) * 2.1, Math.abs(cy - 0.5) * 2.1)
      );
      return 1 + maxBlock * Math.pow(d, 1.9);
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      draw(blockFor());
    };

    img.onload = () => {
      ready = true;
      sizeCanvas();
      draw(reduce ? 1 : blockFor());
      canvas.style.opacity = "1";
      if (imgRef.current) imgRef.current.style.opacity = "0";
      if (!reduce) frame();
    };
    /**
     * Fetch only once the frame is near the viewport. Every instance used to set src
     * immediately, so a phone pulled all nine section stills on load whether or not it
     * ever reached them. The <img> underneath already carries loading="lazy"; this makes
     * the canvas source agree with it.
     */
    let started = false;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !started) {
          started = true;
          img.src = src;
        }
      },
      { rootMargin: "35% 0px" }
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      if (!ready) return;
      sizeCanvas();
      draw(reduce ? 1 : blockFor());
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      img.onload = null;
    };
  }, [src, maxBlock]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08090b] via-transparent to-transparent" />
    </div>
  );
}

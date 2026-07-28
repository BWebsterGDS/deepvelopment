"use client";

import { services } from "@/lib/content";

/**
 * The chips at the foot of the page. Every one of these used to point at
 * `#capabilities`, so clicking "Real-time 3D & WebGL" dropped you at the top of the
 * rail on discipline 01 rather than the one you asked for.
 *
 * A plain anchor cannot fix it either: on desktop the card's position comes from the
 * pinned rail's transform, and on mobile the row is collapsed. ServiceRail owns both
 * behaviours already, so these hand it the id and let it decide.
 *
 * The href stays as a real fallback for a middle-click, or if this never hydrates.
 */
export default function DisciplineLinks() {
  return (
    <ul className="mt-10 flex flex-col gap-px bg-[var(--line)] sm:mt-16 sm:flex-row sm:flex-wrap sm:gap-2 sm:bg-transparent">
      {services.map((s) => (
        <li key={s.id} className="bg-[#08090b] sm:bg-transparent">
          <a
            href="#capabilities"
            data-dv-service={s.id}
            onClick={(e) => {
              e.preventDefault();
              // and stop it reaching SmoothScroll's document-level anchor handler, which
              // would otherwise scroll to #capabilities straight after us and win
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("dv:open-service", { detail: s.id })
              );
            }}
            className="label flex items-center justify-between gap-4 px-1 py-4 transition-colors active:text-acc sm:border sm:border-[var(--line)] sm:px-3 sm:py-2 sm:hover:border-acc sm:hover:text-acc"
          >
            {s.title}
            <span aria-hidden className="text-acc sm:hidden">
              →
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

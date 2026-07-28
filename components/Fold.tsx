"use client";

import { useState } from "react";

/**
 * A reference block that folds on a phone and is always open from lg up.
 * One markup for both: `lg:grid-rows-[1fr]` is a later cascade layer than the base
 * `grid-rows-[var(--rows)]`, so the breakpoint wins without any JS media query.
 * Stacked unfolded, these blocks are ~2000px of scrolling nobody reads on mobile.
 */
export default function Fold({
  title,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rise border-t border-[var(--line)]">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors active:bg-[#101419] lg:pointer-events-none lg:px-9 lg:pt-9 lg:pb-0"
        >
          <span className="label">{title}</span>
          <span
            aria-hidden
            className={`grid h-8 w-8 shrink-0 place-items-center border text-base leading-none transition-all duration-500 lg:hidden ${
              open
                ? "rotate-45 border-acc bg-acc/10 text-acc"
                : "border-[var(--line-strong)] text-mute"
            }`}
          >
            +
          </span>
        </button>
      </h3>
      <div
        className="grid grid-rows-[var(--rows)] transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.16,1,.3,1)] lg:grid-rows-[1fr]"
        style={{ ["--rows" as string]: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-7 pt-1 lg:px-9 lg:pb-9 lg:pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { services } from "@/lib/content";
import { scrollLock } from "@/lib/reveal";

const links = [
  { href: "#capabilities", label: "Capabilities", no: "01" },
  { href: "#realtime-3d", label: "Real-time 3D", no: "02" },
  { href: "#agent-loop", label: "AI & agents", no: "03" },
  { href: "#partners", label: "Partners", no: "04" },
  { href: "#contact", label: "Contact", no: "05" },
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const barRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setSolid(window.scrollY > window.innerHeight * 0.6);
      // read progress here rather than in state: this fires on every scroll frame
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      }
      // whichever section has crossed the header last is the one you are reading
      let current = "";
      for (const l of links) {
        const el = document.querySelector(l.href);
        if (el && el.getBoundingClientRect().top <= 120) current = l.href;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // the sheet owns the scroll while it is up. resume(), not start() — start() is the
  // intro's exit and snaps back to the top, which would throw you out of the page.
  useEffect(() => {
    if (!open) return;
    scrollLock.stop();
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      scrollLock.resume();
    };
  }, [open]);

  /** release the scroller before the state update, so the anchor handler that runs
   *  straight after this click is scrolling a live lenis instead of a stopped one */
  const close = () => {
    scrollLock.resume();
    setOpen(false);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 shell transition-colors duration-500 ${
          solid
            ? "border-b border-[var(--line)] bg-[#08090b]/72 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-4">
          {/* -my-2 py-2: a 44px hit area without moving the mark */}
          <a
            href="#top"
            aria-label="Deepvelopment — home"
            className="group relative z-10 -my-2 py-2"
          >
            <Logo
              className="transition-opacity group-hover:opacity-80"
              markClass="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]"
              textClass="text-[0.82rem] sm:text-[0.95rem]"
            />
          </a>

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={active === l.href ? "true" : undefined}
                className={`label group relative py-2 transition-colors ${
                  active === l.href ? "text-ink" : "hover:text-ink"
                }`}
              >
                {l.label}
                {/* wipes in on hover, stays put on the section you are in */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-acc transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-100 ${
                    active === l.href ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </a>
            ))}
          </nav>

          <Link href="/start" className="btn btn-sm btn-primary hidden lg:inline-flex">
            Start a build
            <span aria-hidden className="btn-arrow">
              →
            </span>
          </Link>

          {/* mobile: two bars that cross into an X. Bigger hit area than it looks. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative z-10 -mr-2 grid h-11 w-11 place-items-center lg:hidden"
          >
            <span className="relative block h-3 w-6">
              <span
                className={`absolute inset-x-0 h-px bg-ink transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute inset-x-0 h-px bg-ink transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>

        {/* read-progress hairline, doubles as the header's bottom edge once solid */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <span
            ref={barRef}
            className="block h-px origin-left bg-acc"
            style={{ transform: "scaleX(0)" }}
          />
        </span>
      </header>

      {/* ---------- mobile sheet ---------- */}
      <div
        ref={sheetRef}
        id="menu"
        tabIndex={-1}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 flex flex-col justify-between gap-10 overflow-y-auto overscroll-contain bg-[#08090b]/96 pb-8 pt-20 backdrop-blur-2xl transition-[opacity,visibility] duration-500 outline-none lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav className="shell">
          <ul className="flex flex-col">
            {links.map((l, i) => (
              <li key={l.href} className="overflow-hidden border-b border-[var(--line)]">
                <a
                  href={l.href}
                  onClick={close}
                  tabIndex={open ? 0 : -1}
                  className="flex items-baseline gap-4 py-4 transition-[transform,opacity] duration-700 ease-[cubic-bezier(.16,1,.3,1)] active:text-acc"
                  style={{
                    transform: open ? "none" : "translate3d(0, 110%, 0)",
                    opacity: open ? 1 : 0,
                    transitionDelay: `${open ? 90 + i * 70 : 0}ms`,
                  }}
                >
                  <span className="label text-acc">{l.no}</span>
                  <span className="display text-[1.9rem]">{l.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {/* the six disciplines as a direct index. resume the scroller first, then
              let ServiceRail expand the row and scroll to it — one hop, not two. */}
          <div
            className="mt-8 transition-opacity duration-700"
            style={{ opacity: open ? 1 : 0, transitionDelay: open ? "300ms" : "0ms" }}
          >
            <p className="label text-[0.58rem]">Jump to a discipline</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4">
              {services.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      close();
                      window.dispatchEvent(
                        new CustomEvent("dv:open-service", { detail: s.id })
                      );
                    }}
                    className="flex w-full items-baseline gap-2 py-3 text-left text-[0.8rem] text-ink/60 active:text-acc"
                  >
                    <span className="label shrink-0 text-[0.5rem] text-acc/60">{s.no}</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div
          className="shell transition-opacity duration-700"
          style={{ opacity: open ? 1 : 0, transitionDelay: open ? "340ms" : "0ms" }}
        >
          <p className="label">Eight disciplines, one delivery team</p>
          <a
            href="mailto:hello@deepvelopment.com?subject=New%20build%20enquiry"
            tabIndex={open ? 0 : -1}
            className="mt-3 block border-b border-[var(--line)] pb-4 text-[1.05rem] font-medium tracking-[-0.02em] active:text-acc"
          >
            hello@deepvelopment.com
          </a>
          <Link
            href="/start"
            onClick={close}
            tabIndex={open ? 0 : -1}
            className="btn btn-primary mt-5 w-full"
          >
            Start a build
            <span aria-hidden className="btn-arrow">
              →
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The only CTA on a phone used to be in the header, which scrolls away for 8000px.
 * This slides up once the hero is behind you and retires itself when the real
 * contact section arrives — so it never competes with the thing it points at.
 * ponytail: one scroll listener, no observer, no library.
 */
export default function MobileCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const contact = document.getElementById("contact");
      const arrived = contact
        ? contact.getBoundingClientRect().top < window.innerHeight * 0.9
        : false;
      setShow(window.scrollY > window.innerHeight * 1.1 && !arrived);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[#08090b]/88 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] lg:hidden"
      style={{
        transform: show ? "none" : "translate3d(0, 110%, 0)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-hidden={!show}
    >
      <div className="shell flex items-center justify-between gap-4 py-3">
        <span className="label min-w-0 text-[0.58rem] leading-tight">
          Eight disciplines
          <br />
          one delivery team
        </span>
        <Link href="/start" tabIndex={show ? 0 : -1} className="btn btn-primary btn-sm shrink-0">
          Start a build
          <span aria-hidden className="btn-arrow">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Intro from "./Intro";
import Nav from "./Nav";

/**
 * The intro and the section nav belong to the home page only. Mounted globally they
 * put a loading animation in front of the enquiry form and a row of anchor links that
 * point at sections which do not exist there. Gating here rather than inside each
 * component means neither one mounts at all off the home page, so no effects run and
 * nothing touches the scroll lock.
 */
export default function SiteChrome() {
  if (usePathname() !== "/") return null;
  return (
    <>
      <Intro />
      <Nav />
    </>
  );
}

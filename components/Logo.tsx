/**
 * Mark: a solid D whose counter is itself a D, with a cyan core at the centre —
 * the same letterform at three depths. Built as filled paths with evenodd holes so
 * it sits on any background and stays legible down to a 16px favicon.
 */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  // outer D, then the counter punched out of it
  const ring =
    "M5 3 H14.5 A13 13 0 0 1 14.5 29 H5 Z " +
    "M10.4 8.6 H14 A7.4 7.4 0 0 1 14 23.4 H10.4 Z";
  const core = "M13.9 12.3 H15.2 A3.7 3.7 0 0 1 15.2 19.7 H13.9 Z";

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d={ring} fill="#f4f6f8" fillRule="evenodd" />
      <path d={core} fill="#4de3ff" />
    </svg>
  );
}

export default function Logo({
  className = "",
  markClass = "h-[1.35rem] w-[1.35rem]",
  textClass = "text-[0.95rem]",
}: {
  className?: string;
  markClass?: string;
  textClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={`${markClass} shrink-0`} />
      <span className={`${textClass} font-display font-semibold tracking-[0.01em] whitespace-nowrap`}>
        Deep<span className="text-acc">velopment</span>
      </span>
    </span>
  );
}

"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { services } from "@/lib/content";
import { submitEnquiry, type SubmitResult } from "@/app/start/actions";

const EMAIL = "hello@deepvelopment.com";

const STAGES = ["An idea", "A spec", "Already live", "Rescuing a build"];
const BUDGETS = ["Under £25k", "£25k – £75k", "£75k – £200k", "£200k+", "Not sure yet"];
const TIMELINES = ["Yesterday", "This quarter", "Next quarter", "Exploring"];

/** one visual language for every choice chip on the page */
function Chip({
  label,
  name,
  type,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  type: "radio" | "checkbox";
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`label cursor-pointer select-none border px-3 py-3 text-[0.6rem] transition-colors sm:py-2.5 ${
        checked
          ? "border-acc bg-acc/10 text-acc"
          : "border-[var(--line)] text-mute hover:border-[var(--line-strong)] hover:text-ink active:border-acc"
      }`}
    >
      <input
        type={type}
        name={name}
        value={label}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function Field({
  no,
  title,
  hint,
  children,
}: {
  no: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-[var(--line)] pt-7 sm:pt-9">
      <legend className="sr-only">{title}</legend>
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr] lg:gap-10">
        <div>
          <p className="label text-acc">{no}</p>
          <h2 className="display mt-2 text-[1.35rem] sm:text-[1.5rem]">{title}</h2>
          {hint && (
            <p className="mt-2 text-[0.8rem] leading-relaxed text-mute lg:mt-3">{hint}</p>
          )}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </fieldset>
  );
}

const inputClass =
  "w-full border border-[var(--line)] bg-[#0c0e12]/80 px-4 py-3.5 text-[0.95rem] text-ink transition-colors placeholder:text-mute/60 focus:border-acc focus:outline-none";

export default function StartForm() {
  const [picked, setPicked] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const openedAt = useMemo(() => Date.now(), []);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  /** everything the form knows, as a plain-text mail body for the fallback path */
  const mailto = (form: FormData) => {
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const body = [
      `Name: ${get("name")}`,
      `Email: ${get("email")}`,
      get("company") && `Company: ${get("company")}`,
      picked.length && `Disciplines: ${picked.join(", ")}`,
      stage && `Stage: ${stage}`,
      budget && `Budget: ${budget}`,
      timeline && `Timeline: ${timeline}`,
      get("stack") && `Stack: ${get("stack")}`,
      "",
      get("brief"),
      get("extra") && `\n${get("extra")}`,
    ]
      .filter(Boolean)
      .join("\n");
    return `mailto:${EMAIL}?subject=${encodeURIComponent(
      `New build enquiry — ${get("name")}`
    )}&body=${encodeURIComponent(body)}`;
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    picked.forEach((p) => form.append("disciplines", p));
    form.set("stage", stage);
    form.set("budget", budget);
    form.set("timeline", timeline);
    form.set("openedAt", String(openedAt));

    start(async () => {
      const r = await submitEnquiry(form);
      setResult(r);
      if (!r.ok && r.useMailto) window.location.href = mailto(form);
    });
  };

  if (result?.ok) {
    return (
      <div className="border border-acc/40 bg-[#0c0e12]/80 p-8 sm:p-12">
        <p className="label text-acc">Received</p>
        <h2 className="display mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)]">
          That is with us.
        </h2>
        <p className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-mute">
          You will get a reply from a person, not an autoresponder, usually inside one
          working day. If it is urgent, {EMAIL} reaches the same inbox.
        </p>
        <Link href="/" className="btn btn-ghost mt-8">
          Back to the site
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-9 sm:gap-12">
      {/* honeypot: off-screen, no label, never focusable by tabbing */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <Field
        no="01"
        title="What are we building"
        hint="Pick anything that applies. It shapes who reads this first."
      >
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Chip
              key={s.id}
              label={s.title}
              name="disciplines-ui"
              type="checkbox"
              checked={picked.includes(s.title)}
              onChange={() => toggle(s.title)}
            />
          ))}
        </div>

        <label className="mt-7 block">
          <span className="label">What has to hold under load</span>
          <textarea
            name="brief"
            rows={5}
            required
            minLength={20}
            maxLength={5000}
            placeholder="The constraint rather than the spec. What breaks today, what it costs you, and what has to be true when we are done."
            className={`${inputClass} mt-3 resize-y leading-relaxed`}
          />
        </label>

        <div className="mt-7">
          <span className="label">Where is it now</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <Chip
                key={s}
                label={s}
                name="stage-ui"
                type="radio"
                checked={stage === s}
                onChange={() => setStage(s)}
              />
            ))}
          </div>
        </div>
      </Field>

      <Field
        no="02"
        title="Shape of the engagement"
        hint="A range and a date let us answer honestly in the first reply instead of the third."
      >
        <div>
          <span className="label">Budget range</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGETS.map((s) => (
              <Chip
                key={s}
                label={s}
                name="budget-ui"
                type="radio"
                checked={budget === s}
                onChange={() => setBudget(s)}
              />
            ))}
          </div>
        </div>

        <div className="mt-7">
          <span className="label">When does it need to land</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIMELINES.map((s) => (
              <Chip
                key={s}
                label={s}
                name="timeline-ui"
                type="radio"
                checked={timeline === s}
                onChange={() => setTimeline(s)}
              />
            ))}
          </div>
        </div>

        <label className="mt-7 block">
          <span className="label">Anything already running</span>
          <input
            type="text"
            name="stack"
            maxLength={400}
            placeholder="Next.js, NetSuite, Shopify, a pile of Airflow DAGs"
            className={`${inputClass} mt-3`}
          />
        </label>
      </Field>

      <Field no="03" title="You" hint="Enough to reply properly.">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Name</span>
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              autoComplete="name"
              className={`${inputClass} mt-3`}
            />
          </label>
          <label className="block">
            <span className="label">Email</span>
            <input
              type="email"
              name="email"
              required
              maxLength={200}
              autoComplete="email"
              className={`${inputClass} mt-3`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Company</span>
            <input
              type="text"
              name="company"
              maxLength={160}
              autoComplete="organization"
              className={`${inputClass} mt-3`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">Anything else</span>
            <textarea
              name="extra"
              rows={3}
              maxLength={2000}
              className={`${inputClass} mt-3 resize-y leading-relaxed`}
            />
          </label>
        </div>
      </Field>

      <div className="border-t border-[var(--line)] pt-7">
        {result && !result.ok && (
          <p role="alert" className="mb-5 border border-warn/40 bg-warn/5 px-4 py-3 text-[0.85rem] text-ink">
            {result.error}
          </p>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
            {pending ? "Sending" : "Send it"}
            <span aria-hidden className="btn-arrow">
              →
            </span>
          </button>
          <p className="text-[0.78rem] leading-relaxed text-mute sm:max-w-xs">
            Goes to one inbox and stays there. No CRM sequence, no newsletter. Or email{" "}
            <a href={`mailto:${EMAIL}`} className="text-ink underline decoration-acc/40">
              {EMAIL}
            </a>{" "}
            directly.
          </p>
        </div>
      </div>
    </form>
  );
}

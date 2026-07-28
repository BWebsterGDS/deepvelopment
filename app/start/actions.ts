"use server";

import { put } from "@vercel/blob";

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; useMailto?: boolean; field?: string };

/** length caps applied server-side: the client is not a trust boundary */
const CAP = { name: 120, email: 200, company: 160, brief: 5000, stack: 400, extra: 2000 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (form: FormData, key: string, cap: number) =>
  String(form.get(key) ?? "").trim().slice(0, cap);

export async function submitEnquiry(form: FormData): Promise<SubmitResult> {
  // honeypot: a real person never fills a field they cannot see
  if (str(form, "website", 50)) return { ok: true };

  // anything submitted in under three seconds was not typed by a human
  const opened = Number(form.get("openedAt") ?? 0);
  if (opened && Date.now() - opened < 3000) {
    return { ok: false, error: "That was too quick. Give it another go." };
  }

  const name = str(form, "name", CAP.name);
  const email = str(form, "email", CAP.email);
  const company = str(form, "company", CAP.company);
  const brief = str(form, "brief", CAP.brief);
  const stack = str(form, "stack", CAP.stack);
  const extra = str(form, "extra", CAP.extra);
  const budget = str(form, "budget", 60);
  const timeline = str(form, "timeline", 60);
  const stage = str(form, "stage", 60);
  const disciplines = form.getAll("disciplines").map((d) => String(d).slice(0, 60));

  if (!name) return { ok: false, error: "We need a name to reply to.", field: "name" };
  if (!EMAIL.test(email)) {
    return { ok: false, error: "That email address does not look right.", field: "email" };
  }
  if (brief.length < 20) {
    return {
      ok: false,
      error: "Tell us a little more about the constraint, twenty characters at least.",
      field: "brief",
    };
  }

  const lines = [
    `Name:        ${name}`,
    `Email:       ${email}`,
    company ? `Company:     ${company}` : "",
    disciplines.length ? `Disciplines: ${disciplines.join(", ")}` : "",
    stage ? `Stage:       ${stage}` : "",
    budget ? `Budget:      ${budget}` : "",
    timeline ? `Timeline:    ${timeline}` : "",
    stack ? `Stack:       ${stack}` : "",
    "",
    "What has to hold under load",
    "---------------------------",
    brief,
    extra ? `\nAnything else\n-------------\n${extra}` : "",
  ].filter(Boolean);
  const body = lines.join("\n");

  const stamp = new Date().toISOString();

  /**
   * Storage first, email second. A blob write is the durable record; email is only a
   * notification. If the write succeeds the enquiry is safe even when mail fails.
   *
   * The store is private, so these are readable with the store token or from the
   * Vercel dashboard, and never from a public URL. Do not switch this to
   * access: "public" — the payload is somebody's name, email and business problem.
   */
  let stored = false;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(
        `enquiries/${stamp.slice(0, 10)}/${stamp.replace(/[:.]/g, "-")}-${
          email.split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 24) || "anon"
        }.json`,
        JSON.stringify(
          { at: stamp, name, email, company, disciplines, stage, budget, timeline, stack, brief, extra },
          null,
          2
        ),
        { access: "private", contentType: "application/json", addRandomSuffix: true }
      );
      stored = true;
    } catch {
      // fall through: the mail paths below are still worth trying
    }
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_TO ?? "hello@deepvelopment.com";
  const from = process.env.ENQUIRY_FROM;

  // no mail provider yet. If the enquiry is already on disk that is a real success, so
  // do not send someone to their mail app to send it a second time.
  if (!key || !from) {
    if (stored) return { ok: true };
    return {
      ok: false,
      useMailto: true,
      error: "Direct sending is not switched on yet, so this opens your mail app instead.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `New build enquiry — ${name}${company ? ` (${company})` : ""}`,
        text: body,
      }),
    });
    if (!res.ok && !stored) {
      return {
        ok: false,
        useMailto: true,
        error: "That did not send. Opening your mail app instead.",
      };
    }
    return { ok: true };
  } catch {
    if (stored) return { ok: true };
    return {
      ok: false,
      useMailto: true,
      error: "We could not reach the mail service. Opening your mail app instead.",
    };
  }
}

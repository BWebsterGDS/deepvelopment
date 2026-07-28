"use client";

import { useEffect, useRef, useState } from "react";
import { agentBudget, agentLoop } from "@/lib/content";
import Fold from "./Fold";
import SignalFill from "./SignalFill";

/** what the trace prints per stage: [line, ms] — the ms are illustrative, and say so */
const TRACE: [string, number][] = [
  ["run.start  invoice-triage  cp_0", 0],
  ["ingest     42 docs · 318 chunks", 210],
  ["embed      318 vectors · cached 61%", 140],
  ["retrieve   bm25 ∪ vec 40 → rerank 8", 190],
  ["ground     8 sources · 3 cited", 120],
  ["act        erp.postCredit  ic_9f2a", 260],
  ["gate       side effect → awaiting human", 0],
  ["gate       approved by finance@client", 0],
  ["run.end    2.1s · £0.038 · tr_71c4", 0],
];

/** which loop stage each trace line belongs to, so the graph and the log stay in step */
const STAGE_OF = [0, 0, 1, 2, 3, 4, 5, 5, 5];

export default function AgentLoop() {
  const [step, setStep] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(TRACE.length - 1);
      return;
    }

    let timer = 0;
    let i = -1;

    // ponytail: a timeout chain, not a rAF loop — this advances ~4 times a second and
    // has no business being tied to the display refresh rate
    const tick = () => {
      i = i + 1 >= TRACE.length ? 0 : i + 1;
      setStep(i);
      timer = window.setTimeout(tick, i === TRACE.length - 1 ? 2200 : 620);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !timer) tick();
        if (!e.isIntersecting && timer) {
          clearTimeout(timer);
          timer = 0;
        }
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // keep the newest line in view without scrolling the page
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [step]);

  const stage = step >= 0 ? STAGE_OF[step] : -1;

  return (
    <section id="agent-loop" className="hair-t relative">
      <div className="shell py-16 sm:py-24 lg:py-32">
        <div className="rise-head max-w-3xl">
          <p className="label text-acc">07 — deep dive</p>
          <h2 className="display mt-4 text-[clamp(2rem,5vw,4.2rem)]">
            <span className="block">Do anything.</span>
            <span className="block chrome">Appear as anything.</span>
            <span className="block">Automate anything.</span>
          </h2>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-mute sm:mt-6 sm:text-[1.02rem]">
            That is the pitch everyone is making this year. Actually meaning it is
            the hard part.
            <span className="hidden sm:inline">
              {" "}
              An agent left running against a real business needs state you can replay
              when something goes wrong, and retrieval you can audit when a customer
              challenges what it said. It also needs a person standing in front of
              anything irreversible, which is the part most demos skip.
            </span>
            <span className="sm:hidden">
              {" "}
              An agent left running against a real business needs replayable state,
              auditable retrieval, and a person standing in front of anything
              irreversible. That last one is what most demos skip.
            </span>{" "}
            <span className="text-ink/80">
              The trace here is the shape of a run we would put in front of a client.
            </span>
          </p>
        </div>

        <div className="mt-10 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:mt-14 lg:grid-cols-[1.02fr_1fr]">
          {/* ---- live run trace. Same shape as the render-loop panel: the grid item
                  stretches, a sticky block rides inside it, and SignalFill takes the
                  run-off underneath so no grid background shows through. ---- */}
          <div className="flex flex-col bg-[#0a0c0f]">
            <div className="bg-[#0a0c0f] lg:sticky lg:top-16 lg:z-10">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
                <p className="label text-[0.58rem] tracking-[0.12em] sm:tracking-[0.18em]">
                  Run trace
                </p>
                <p className="label flex items-center gap-2 text-[0.58rem] text-acc">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acc" />
                  live
                </p>
              </div>

              {/* the loop as six cells; the active one lights up with the log line */}
              <div ref={boxRef} className="grid grid-cols-6 gap-px bg-[var(--line)]">
                {agentLoop.map(([no, name], i) => (
                  <div
                    key={no}
                    className={`flex flex-col items-center gap-1 bg-[#0a0c0f] px-1 py-3 transition-colors duration-300 ${
                      i === stage ? "bg-acc/12" : i < stage ? "bg-[#0d1116]" : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rotate-45 transition-colors duration-300 ${
                        i === stage
                          ? "bg-acc"
                          : i < stage
                            ? "bg-acc/40"
                            : "bg-[#2a3138]"
                      }`}
                    />
                    <span
                      className={`label text-[0.5rem] tracking-[0.04em] transition-colors duration-300 ${
                        i === stage ? "text-acc" : ""
                      }`}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>

              <div
                ref={logRef}
                aria-live="off"
                className="h-[15rem] overflow-hidden px-4 py-4 font-mono text-[0.66rem] leading-[1.85] sm:px-5 sm:text-[0.72rem]"
              >
                {TRACE.map(([line, ms], i) => (
                  <p
                    key={line}
                    className={`flex gap-3 transition-opacity duration-300 ${
                      i <= step ? "opacity-100" : "opacity-0"
                    } ${i === step ? "text-acc" : "text-ink/55"}`}
                  >
                    <span className="shrink-0 text-mute">
                      {ms ? `+${ms}ms` : "     ·"}
                    </span>
                    <span className="min-w-0 truncate">{line}</span>
                  </p>
                ))}
              </div>

              <p className="label border-t border-[var(--line)] px-4 py-4 text-[0.55rem] leading-relaxed tracking-[0.1em] sm:px-5 sm:tracking-[0.14em]">
                Illustrative trace. The stages and the shape are real, the figures are
                not from your data
              </p>
            </div>

            <SignalFill className="hidden flex-1 border-t border-[var(--line)] lg:block" />
          </div>

          {/* ---- the reference column ---- */}
          <div className="bg-[#0a0c0f]">
            <Fold title="Ingest → grounded, gated answer" defaultOpen>
              <ol>
                {agentLoop.map(([no, stage_, detail]) => (
                  <li
                    key={no}
                    className="grid grid-cols-[1.75rem_1fr] gap-3 border-t border-[var(--line)] py-3 sm:grid-cols-[2rem_1fr]"
                  >
                    <span className="label pt-0.5 text-[0.6rem] text-acc">{no}</span>
                    <span>
                      <span className="block text-[0.86rem]">{stage_}</span>
                      <span className="mt-1 block text-[0.78rem] leading-relaxed text-mute">
                        {detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Fold>

            <Fold title="What we refuse to ship without">
              <table className="w-full text-left">
                <tbody>
                  {agentBudget.map(([k, v, note]) => (
                    <tr key={k} className="border-t border-[var(--line)] align-top">
                      <th className="py-3 pr-3 text-[0.82rem] font-normal">{k}</th>
                      <td className="py-3 font-mono text-[0.82rem] whitespace-nowrap text-acc">
                        {v}
                      </td>
                      <td className="hidden py-3 pl-4 text-[0.76rem] leading-relaxed text-mute xl:table-cell">
                        {note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Fold>

            <Fold title="The graph, in TypeScript">
              <pre className="-mx-6 overflow-x-auto px-6 font-mono text-[0.72rem] leading-[1.65] text-ink/78 lg:mx-0 lg:px-0">
                <code>{SNIPPET}</code>
              </pre>
              <p className="mt-6 text-[0.8rem] leading-relaxed text-mute">
                Typed channels mean a malformed state fails at the node boundary rather
                than three steps later, where it is much more annoying to debug. The
                human gate is <code className="text-acc">interruptBefore</code>: the run
                suspends to the checkpointer and picks up again on approval, so an agent
                sitting for a day waiting on finance costs nothing while it waits.
              </p>
            </Fold>

            <Fold title="Automating the human parts">
              <p className="text-[0.82rem] leading-relaxed text-mute">
                Looking to automate something human? Plenty of work has no API behind it.
                Someone signs into a portal, reads a PDF, copies six numbers into another
                system, and does that four hundred times a month. We automate it as a real
                browser session driven at human pace, with the judgement calls routed to a
                person and everything it touched written to a trace you can audit
                afterwards.
              </p>
              <p className="mt-5 text-[0.82rem] leading-relaxed text-mute">
                We also know the other side of it. Browser fingerprinting and anti-bot
                systems are close enough to our security work that we can tell you upfront
                which of three situations you are in: a workflow that automates cleanly, a
                workflow that should really be an API conversation with the vendor, or one
                to leave alone. That answer arrives before you spend anything, which is
                usually worth more than the automation.
              </p>
            </Fold>
          </div>
        </div>
      </div>
    </section>
  );
}

const SNIPPET = `// typed state, one checkpoint per node, every edge explicit
const graph = new StateGraph<RunState>({ channels })
  .addNode("retrieve", retrieve)        // hybrid search + rerank
  .addNode("ground", ground)            // refuses without a citation
  .addNode("act", act)                  // idempotent tool calls
  .addNode("gate", humanApproval)

  // no source? go back for more context, do not guess
  .addConditionalEdges("ground", (s) =>
    s.citations.length > 0 ? "act" : "retrieve")

  // anything irreversible stops for a person
  .addConditionalEdges("act", (s) =>
    s.pending.some(isSideEffect) ? "gate" : END)

  .compile({ checkpointer, interruptBefore: ["gate"] });`;

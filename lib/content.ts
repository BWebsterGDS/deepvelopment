export type Service = {
  id: string;
  no: string;
  title: string;
  kicker: string;
  blurb: string;
  bullets: string[];
  stack: string[];
  art: string;
};

export const services: Service[] = [
  {
    id: "fintech",
    no: "01",
    title: "Fintech platforms",
    kicker: "Where a rounding error is an incident",
    blurb:
      "A ledger that disagrees with the bank by a penny is an incident, not a bug. We build the money side of the product: books that balance by construction, payment flows that survive being retried, and reconciliation an auditor can follow without you in the room.",
    bullets: [
      "Immutable double-entry ledgers. Balances are derived from entries rather than stored and then updated.",
      "Idempotency keys and replayable event logs, so a retry across a PSP boundary cannot charge someone twice.",
      "Open Banking and PSD2 integrations, including the SCA and 3DS2 step-up flows nobody enjoys building.",
      "KYC, KYB and AML screening with a decision trail you can hand to a regulator.",
      "Reconciliation against PSP settlement files, run automatically, with break detection and ageing.",
      "PCI-DSS scope kept small by tokenising at the edge, so card numbers never reach your own systems.",
    ],
    stack: [
      "Stripe",
      "Adyen",
      "TrueLayer",
      "Plaid",
      "Postgres",
      "Kafka",
      "Temporal",
      "Go",
      "TypeScript",
      "Decimal arithmetic",
    ],
    art: "/art/fintech.webp",
  },
  {
    id: "erp",
    no: "02",
    title: "ERP implementation",
    kicker: "The risk lives in the data, not the software",
    blurb:
      "ERP projects rarely fail because somebody picked the wrong platform. They fail on data nobody validated and integrations nobody owned. We treat the migration and the integration work as the actual deliverable, which is what makes go-live the quiet part.",
    bullets: [
      "Discovery through to cutover: process mapping, gap analysis, and a chart of accounts that survives contact with finance.",
      "Data migration with dry runs, row-level validation and a rollback we have already rehearsed.",
      "Event-driven integration between ERP, storefront, WMS, 3PL and CRM, instead of a nightly CSV and hope.",
      "Inventory across multiple warehouses and currencies, with landed cost modelled properly.",
      "Custom modules where the platform runs out, written so the upgrade path stays open.",
      "Hypercare, runbooks, and an operations team that can run the thing after we leave.",
    ],
    stack: [
      "NetSuite",
      "Dynamics 365 BC",
      "Odoo",
      "SAP B1",
      "Celigo",
      "Workato",
      "REST/SOAP bridges",
      "dbt",
      "Airflow",
    ],
    art: "/art/erp.webp",
  },
  {
    id: "webgl",
    no: "03",
    title: "Real-time 3D & WebGL",
    kicker: "GPU work in the browser, at frame rate",
    blurb:
      "Full-stack 3D, from authored geometry through to a render loop that holds 60fps on a mid-range laptop. We write shaders when the problem needs shaders, and when a frame costs 22ms we can tell you which pass is eating it.",
    bullets: [
      "GLSL and WGSL authoring: vertex displacement, PBR variants, SDF raymarching, custom lighting.",
      "GPGPU on framebuffer ping-pong, which is how millions of particles and cloth get off the CPU.",
      "Draw-call discipline. Instanced meshes, merged geometry, culling, LOD on screen-space error.",
      "An asset pipeline that ships: glTF 2.0, Draco and meshopt, KTX2 transcoded per platform.",
      "Deferred against forward+, cascaded shadow maps, TAA or FXAA when MSAA is unavailable.",
      "Unreal Engine 5 with Epic Pixel Streaming when a scene will never fit a browser, and the judgement to say when WebGL is enough.",
      "Budgets we say out loud: VRAM ceilings, texture memory, thermal throttling, WebGPU.",
    ],
    stack: [
      "WebGL2",
      "WebGPU",
      "Three.js",
      "R3F",
      "GLSL",
      "Unreal Engine 5",
      "Pixel Streaming",
      "Nanite / Lumen",
      "Blender",
      "KTX2",
    ],
    art: "/art/webgl.webp",
  },
  {
    id: "ecommerce",
    no: "04",
    title: "Ecommerce implementation",
    kicker: "Storefronts that convert and still reconcile",
    blurb:
      "A storefront has two jobs. Load fast enough to rank, and tell the warehouse and finance the same story about what was sold. Plenty of builds manage one of those and quietly give up on the other.",
    bullets: [
      "Headless builds on Shopify with Hydrogen and Oxygen, or on Medusa and commercetools where that fits better.",
      "Checkout performance work until LCP is under 1.2s on 4G, with no layout shift when the price or cart updates.",
      "Subscriptions, bundles, pre-orders and tiered B2B pricing, built without a pile of plugins fighting each other.",
      "Product data as a pipeline. PIM in one side, clean feeds out to Google, Meta, Amazon and affiliates.",
      "Order lifecycle sync into ERP and 3PL, with idempotent webhooks and a dead-letter queue somebody actually reads.",
      "Merchandising and CRO experiments measured on revenue per session rather than click-through.",
    ],
    stack: [
      "Shopify",
      "Hydrogen",
      "Medusa",
      "Next.js",
      "Sanity",
      "Algolia",
      "Klaviyo",
      "Stripe",
      "Vercel",
    ],
    art: "/art/ecommerce.webp",
  },
  {
    id: "growth",
    no: "05",
    title: "Ads & SEO",
    kicker: "Spend that has to answer to margin",
    blurb:
      "Technical SEO and paid media are engineering problems before they are marketing ones. Crawlable architecture, measurement that survives cookie loss, and budget judged against contribution margin rather than a dashboard full of impressions.",
    bullets: [
      "Technical SEO: crawl budget, log-file analysis, internal linking, and canonical and hreflang correctness.",
      "Core Web Vitals treated as an SLO and tracked per template in the field, through CrUX and RUM.",
      "Structured data at scale for Product, Offer, FAQ, Article and BreadcrumbList, validated in CI so it stays valid.",
      "Programmatic and localised page systems that stay useful instead of turning thin six months later.",
      "Server-side GTM, consent mode v2, and first-party measurement that still works when the cookies go.",
      "Paid search, shopping, social and retargeting managed against blended ROAS and contribution margin.",
    ],
    stack: [
      "GA4",
      "BigQuery",
      "Looker Studio",
      "Server-side GTM",
      "Screaming Frog",
      "Ahrefs",
      "Google Ads",
      "Meta",
      "Merchant Center",
    ],
    art: "/art/growth.webp",
  },
  {
    id: "security",
    no: "06",
    title: "Security & threat prevention",
    kicker: "We assume the breach, then make it boring",
    blurb:
      "Security works when it is a property of the system rather than a report in a folder. Threat modelling, hardening and detection go into the delivery pipeline alongside everything else, which is the only way any of it survives a deadline.",
    bullets: [
      "STRIDE threat models per service, with abuse cases written next to the user stories.",
      "SAST, DAST, dependency and secret scanning gated in CI, tuned well enough that nobody learns to ignore it.",
      "Authenticated penetration testing, then remediation that gets retested rather than closed on trust.",
      "Edge defence that holds during a launch: WAF rules, bot management, rate limits and a real DDoS posture.",
      "Secrets, key rotation and least-privilege IAM, with no long-lived credentials sitting in a CI runner.",
      "Detection and response: structured audit logs, alert thresholds that mean something, runbooks, tabletop exercises.",
      "SOC 2 and ISO 27001 readiness, with evidence produced continuously instead of the week before the audit.",
    ],
    stack: [
      "Burp Suite",
      "Semgrep",
      "Trivy",
      "OWASP ASVS",
      "Cloudflare",
      "Vault",
      "OIDC",
      "Falco",
      "Sentry",
    ],
    art: "/art/security.webp",
  },
  {
    id: "automation",
    no: "07",
    title: "AI & business automation",
    kicker: "Agents that can prove what they did",
    blurb:
      "The demo is always easy. An agent left running against a real business is harder, because a wrong tool call moves money and a confident guess turns into a customer email. We build the parts that stop that happening.",
    bullets: [
      "LangGraph state machines in TypeScript, typed and checkpointed, so any run replays a step at a time.",
      "Retrieval that cites its sources: hybrid BM25 and vector search, then a cross-encoder rerank.",
      "Tool calls handled like payments. Idempotency keys, bounded retries, compensating actions.",
      "A human gate in front of anything irreversible, with the diff on screen before it continues.",
      "Work with no API behind it, driven as a real browser session at human pace.",
      "Collection at scale from public sources, built to survive a layout change.",
      "Token cost and p95 latency tracked per release, because an agent nobody costed gets switched off.",
    ],
    stack: [
      "TypeScript",
      "LangGraph",
      "pgvector",
      "Postgres",
      "Temporal",
      "Playwright",
      "Anthropic",
      "OpenAI",
      "OpenTelemetry",
    ],
    art: "/art/automation.webp",
  },
  {
    id: "web3",
    no: "08",
    title: "Smart contracts & token launches",
    kicker: "Where a bug is permanent and expensive",
    blurb:
      "The team has been in crypto for the best part of a decade, raising, building, launching, maintaining and auditing token economies. On-chain, a mistake is instant, public and irreversible, so the contracts get audited properly and the mechanics have to survive a real market.",
    bullets: [
      "Solidity and Anchor development, with the invariants written down before the code is.",
      "Audits that combine manual review with fuzzing and symbolic execution, and a report you can publish.",
      "Vesting and release schedules enforced on-chain rather than promised in a deck.",
      "Token ecosystem design: supply, emissions, sinks, and what happens when incentives stop.",
      "Raise support end to end: data room, diligence, launch strategy and the answers investors ask.",
      "Treasury, multisig and timelock setup, with a key-loss story that is not a group chat.",
      "Post-launch monitoring: mempool alerts, anomaly detection and a rehearsed incident path.",
    ],
    stack: [
      "Solidity",
      "Foundry",
      "Anchor",
      "Slither",
      "Echidna",
      "OpenZeppelin",
      "Safe",
      "Chainlink",
      "viem",
    ],
    art: "/art/web3.webp",
  },
];

/** the seven stages of a production agent run — the spine of the AI section */
export const agentLoop = [
  [
    "01",
    "Ingest",
    "Incremental crawls. Chunking follows the structure of the document rather than a character count, and every chunk keeps a record of where it came from.",
  ],
  [
    "02",
    "Embed",
    "The model and the number of dimensions get chosen against your corpus rather than a leaderboard, then pinned to a version so results stop moving.",
  ],
  [
    "03",
    "Retrieve",
    "BM25 and vector search together, then a cross-encoder rerank. We measure recall@k on labelled data before anything goes near production.",
  ],
  [
    "04",
    "Ground",
    "Every claim carries a citation. With no source to point at, the graph loops back for more context instead of writing something plausible.",
  ],
  [
    "05",
    "Act",
    "Tool calls get idempotency keys and bounded retries, plus a compensating action for the case where step three succeeded and step four did not.",
  ],
  [
    "06",
    "Gate",
    "Anything with a side effect stops for a person. They see the diff, then approve, edit or reject it. The run suspends to the checkpointer while it waits.",
  ],
];

export const agentBudget = [
  [
    "Cost per run",
    "priced",
    "Tokens, tool calls and retries costed per workflow, so you find out before the invoice does",
  ],
  [
    "p95 latency",
    "< 4 s",
    "First token streamed, retrieval done in parallel, cache checked before reaching for a bigger model",
  ],
  [
    "Recall@10",
    "> 0.90",
    "Measured on a labelled set drawn from your own documents, not a public benchmark",
  ],
  [
    "Answers without a citation",
    "0",
    "The graph returns to retrieval rather than guessing, and says so in the trace",
  ],
  [
    "Side effects without a gate",
    "0",
    "Writes, sends and payments wait for a person or a signed policy, every time",
  ],
  [
    "Runs you can replay",
    "100%",
    "Checkpointed state means an incident gets re-run node by node instead of argued about",
  ],
];

export const partners = [
  "Blvck Paris",
  "McLaren NFT",
  "Porsche NFT",
  "Nike",
  "GDS Group",
  "Crypto.com",
  "Chainlink",
  "IBC Group (Mario Nawfal)",
  "IGBX",
  "Australian Government",
  "Pump.fun",
  "The Cooking Guild",
  "Habibiz",
  "Egg Heads Club",
  "DystoApez",
  "YYG",
  "Forgotten 3thereal Worlds",
  "Blank Studios",
  "Llamaverse",
  "Blacks Club",
  "Crypto Club Global",
  "Initial Talent",
  "Private FnFs",
  "Southbank Centre",
  "BaySixty6",
  "Maynards Bassetts",
  "PG Group",
  "Arcadia Marketing",
  "Web Three Consulting",
  "Kickz.eu",
];

export const capabilities = [
  // Title Case, with canonical spellings left alone: glTF and pgvector are written
  // lowercase by their own projects, so capitalising them would just be wrong.
  "Double-Entry Ledgers",
  "WebGL2 / WebGPU",
  "LangGraph Agents",
  "GLSL Shaders",
  "PSD2 / Open Banking",
  "RAG with Citations",
  "NetSuite",
  "Headless Commerce",
  "TypeScript End to End",
  "Threat Modelling",
  "Core Web Vitals",
  "pgvector / Hybrid Search",
  "GPGPU Particles",
  "PCI-DSS Scope Reduction",
  "Human-in-the-Loop Gates",
  "Event-Driven Integration",
  "Penetration Testing",
  "Eval Harnesses in CI",
  "Server-Side GTM",
  "glTF Pipelines",
  "Postgres",
  "SOC 2 Readiness",
  "Smart Contract Audits",
  "Token Vesting Schedules",
  "Capital Raise Support",
];

export const metrics = [
  { value: "60", unit: "fps", note: "render budget held on mid-range hardware" },
  { value: "<1.2", unit: "s", note: "LCP target on 4G for commerce templates" },
  { value: "0", unit: "", note: "agent answers shipped without a citation" },
  { value: "8", unit: "disciplines", note: "sitting in one delivery team" },
];

export const process = [
  {
    no: "01",
    title: "Interrogate",
    body: "We pull the problem apart before anyone writes code. Constraints, data, failure modes, and the thing you have not said out loud yet. Most of the risk on a project is findable in this first week if you go looking for it.",
  },
  {
    no: "02",
    title: "Prove",
    body: "A thin slice through the whole stack, with real data and a real integration behind it. Either it holds up, or we have learned something cheaply and early instead of expensively in month five.",
  },
  {
    no: "03",
    title: "Build",
    body: "Weekly increments you could ship, kept behind flags until you want them. Tests where they earn their keep, observability from the first deploy, and no branch alive long enough to rot.",
  },
  {
    no: "04",
    title: "Hand over",
    body: "Runbooks, architecture decision records, and a team trained to operate the thing. The end of an engagement should not feel like a cliff edge.",
  },
];

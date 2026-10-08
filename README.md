# Thesis monitor

A login-free internal tool for AMPB (US AI / US Non-AI) and SnT (FX / rates).

## Interface

The homepage contains clickable thesis cards, Add thesis, filters, and a small usage control. Each card shows its author and sequence number, title, and subthesis status icons. Research is started by the green search button. Filters cover desk, time horizon, status and date order.

The detail page contains two tabs: Thesis monitor (subtheses and compact source dropdowns) and Your thesis (the submitted fields, preserving their text and line breaks). Editing includes a separate deletion confirmation. No sidebar, dashboard statistics, evidence feed, journal, reflections, learning panels, history tabs, archive controls, or exports.

## Research and validation

React / Vinext → API routes → Cloudflare D1. Native fetch calls OpenAI Responses with `gpt-5-nano`; no agent framework or SDK is needed.

Research instructions are selected by the saved team: `lib/prompts/snt.ts` covers FX/rates, public versus terminal-only data, aligned-series correlation checks, and qualitative/political mechanisms; `lib/prompts/ampb.ts` covers company disclosures, comparable financial periods, fundamentals and valuation assumptions. Both include the same identity, timing and evidence rules from `lib/prompts/shared-research.ts`. These prompts do not add market-data integrations: unavailable evidence is explained as unclear for assessable claims, while future outcomes stay pending. Form validation remains shared in `lib/ai-validation.ts`.

Submission and editing run a small structured-output input check. Placeholder, misplaced, incomplete or inappropriate input returns field-specific feedback without saving. Optional fields may remain empty. Research also checks older submissions before starting web research.

Research uses required live `web_search`, low reasoning effort, at most four web tool calls, an 8,000-output-token cap and a 150-second timeout. The UI shows a single short progress line using public reasoning-summary headings, with actual search queries and source links underneath. Long reasoning paragraphs are not displayed. Raw reasoning is never requested or forwarded. The strict output schema requires an object with exactly one field for each non-manual subthesis ID, preventing omitted, duplicated or invented identifiers. The server validates the returned keys and maps results back to the original thesis order. Evidence links must match search or citation metadata; unsupported true/false results become unclear. This validates traceability, not the correctness of a model's interpretation.

## Dates and the pending rule

`lib/timing.ts` resolves dates from subthesis text, explicit deadlines, catalyst timing and applicable trade horizons. It supports ISO dates, named months/days, quarters and relative day/week/month/year windows. Month-only deadlines end on the last day of that month. Relative windows are anchored to thesis creation.

The observation window must end before a forecast is judged true or false. A server-side rule overrides every premature model status, including unclear, to pending. It also corrects earlier stored premature results when loading them, leaving the submitted text and sources intact. An old pre-deadline review cannot become a valid final verdict merely because time passes: another research run is required. Current/latest observations remain independently assessable. Ambiguous calendars are left to sourced research; the model can still misinterpret language or evidence.

Regression tests use the five exact USDJPY propositions reported by the user, including March 2027 and the next three monthly releases. They verify all four possible model verdicts, missing sources, deadline rollover, historical/current claims, and old results.

## Persistence and cost

Theses are shared by all visitors. Names identify submissions without adding accounts or ownership. Sequence numbers are allocated atomically per normalized author name and are not reused after deletion. Old submissions without a collected name display Unnamed until edited.

`OPENAI_API_KEY` is a server runtime secret. It is never returned to the browser or included in a client bundle. The $12 app allowance reserves $0.25 per research attempt and $0.01 per input-validation attempt. Reservations are kept after failures because requests may incur cost. Research has a one-minute global cooldown and a three-minute stale-lock expiry. The usage control shows estimated charges, allocated allowance, and conservatively estimated remaining research runs including their input checks.

Estimated charges use $0.05/M input tokens, $0.40/M output tokens and $0.01 per returned web call. The OpenAI project billing limit is authoritative; interrupted calls can have unreported charges. [GPT-5 nano](https://developers.openai.com/api/docs/models/gpt-5-nano), [web search](https://developers.openai.com/api/docs/guides/tools-web-search), [pricing](https://developers.openai.com/api/docs/pricing).

Versions prevent concurrent edits and research from overwriting each other. Deleted thesis records disappear immediately; cost-accounting rows remain to preserve the allowance. There are no background jobs or automatic research runs.

## Develop

Use Node 22.13+ (Node 25 used for tests). Local and hosted databases are separate.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_careful_aaron_stack.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_narrow_major_mapleleaf.sql
npm run dev -- --port 3000
```

Apply each migration once. Sites applies pending migrations on deployment. Provide a server-only local API key through ignored environment configuration when testing paid calls. Do not commit keys.

```sh
npm run typecheck
npm test
npm run build
```

Limits: 24 subtheses, 12 groups, 6 subtheses per group, and 20,000 input characters. Public research cannot verify private data; Manual checks accept a trader's recorded observation. No live price feed, execution or P&L engine.

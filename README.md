# Traders@UST thesis monitor

A login-free, shared prototype for writing trade theses, checking explicit propositions against web evidence, and recording what traders learn.

## What it does

- AMPB desks (US AI, US Non-AI, Seeds, Infinity); SnT desks (USDJPY, USDKRW, USDSGD, US/Japan rates); Quant and AI research.
- Natural-language trade, reasoning, market view, variant view, catalysts, risks, invalidation, valuation, and implementation fields.
- Numeric, qualitative and manual checks. Event windows can be expressed directly in a check or catalyst timing field.
- On-demand GPT-5 nano Responses API research using live `web_search` and strict JSON Schema output.
- True / false / unclear / pending check states; exact source links, dated observations, and check-level explanations.
- Immutable review snapshots, thesis revision snapshots, manual observations, reflections, archive/restore, search/filter, JSON export.
- Shared Cloudflare D1 persistence. No accounts, background research, trading, price feed, agent framework, or valuation engine.

## Architecture

React UI (`app/page.tsx`) → small API routes → Cloudflare D1. One prompt + structured output lives in `lib/research.ts`. Vinext/Vite provides the Sites-compatible server build.

The API key exists only in the hosted `OPENAI_API_KEY` runtime secret. It is never returned to clients or bundled. Set it through the hosting provider's environment settings. `.env.example` documents the name for other local deployments; never commit a real key.

This intentionally has no login or ownership boundaries. Everyone with access to the site shares the same records and research allowance. It is a club prototype, not a private multi-tenant product.

## Cost controls

The app permanently reserves $0.25 per research attempt from a $12 allowance stored in D1 (48 attempts maximum). Failed and conflicted attempts keep the reservation because they may have incurred API cost. One global review runs at a time, with a one-minute cooldown; stale locks expire after three minutes. The request uses low reasoning effort, an 8,000-output-token cap, a four-web-tool-call budget, and a 150-second timeout. No automatic retries or automatic research.

The UI also displays estimated actual charges, using $0.05/M input tokens, $0.40/M output tokens, and $0.01 per returned web tool call. Estimates include returned token usage but are not a billing report; the OpenAI project budget remains authoritative. Timeout responses may have incurred unreported cost; the reservation remains in place. Rates were checked against official OpenAI docs on 7 October 2026.

- https://developers.openai.com/api/docs/models/gpt-5-nano
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/pricing

## Evidence integrity

Research must complete a web search. Every expected non-manual check must appear exactly once. Evidence URLs must occur in the API's actual search-source or citation metadata; unsupported URLs are dropped, and unsupported true/false decisions become unclear. This establishes source traceability, not source accuracy: traders should inspect the linked source and its date. Model interpretation and date errors remain possible. No confidence percentage is invented.

True risk and invalidation conditions are adverse. Check coverage is not a conviction score. Editing resets current check states and stores the previous thesis; prior review labels and evidence are preserved. Version checks prevent concurrent edits/research from overwriting each other. A research result that conflicts with an edit is retained in the server audit table but not applied to the updated thesis.

## Develop

Node 22.13+ (Node 25 used during development).

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_careful_aaron_stack.sql
npm run dev -- --port 3000
```

Apply the migration once per fresh local database. Hosted migrations are applied by Sites. Local and hosted data are separate. You can add the three clearly labelled examples using the empty workspace's **Load example theses** button.

Checks:

```sh
npm run typecheck
npm test
npm run build
```

`scripts/test-openai.mjs` is an optional paid smoke test. It takes the key via hidden stdin and performs a bounded real API request. Never pass the key as a shell argument.

## Prototype limits

24 checks per thesis and 12 argument groups. Web research may not cover every check in one bounded run; missing evidence stays unclear. Private Quant backtests and experiments need manual checks. No price execution, automated P&L, push alerts, scheduled jobs, or quantitative backtest verification. The sample theses are illustrative hypotheses, not trade recommendations.

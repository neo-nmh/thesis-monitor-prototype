# Deploy from GitHub to Cloudflare Workers

One Worker serves the Vinext frontend and `/api/*` routes. Cloudflare D1 stores theses, author numbering, research results and usage. OpenAI runs server-side using a Worker secret. No login, separate API server, paid Cloudflare service, or GitHub Actions workflow is required.

This is the existing pinned Vinext / Cloudflare Vite plugin / Wrangler stack, without a framework upgrade. `vite.cloudflare.config.ts` builds the standalone app using the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/reference/api/); the original `vite.config.ts` and Sites files remain available. Both builds write `dist/`, so always run the matching build immediately before previewing or deploying. Do not use the Sites `npm run build` output for the standalone deployment.

## 1. Create your D1 database

In the Cloudflare dashboard, open **Storage & databases → D1 → Create database**. Name it `thesis-monitor`, then copy its **Database ID** into `d1_databases[0].database_id` in `wrangler.jsonc`, replacing the all-zero placeholder. Keep the binding name **DB**. The ID is configuration, not a secret.

Alternatively, after installing dependencies locally, use `npx wrangler login` and `npx wrangler d1 create thesis-monitor --config wrangler.jsonc`.

The migrations in `drizzle/` create the three existing app tables. The deployment command applies pending migrations before uploading the Worker; Wrangler records applied migrations so later deployments do not recreate the tables. [D1 setup](https://developers.cloudflare.com/d1/get-started/), [migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## 2. Push this app folder to GitHub

Create an empty GitHub repository, then run these commands **inside the `thesis-monitor` folder that contains `package.json`**:

```sh
git add .
git commit -m "Prepare standalone Cloudflare deployment"
git remote add github https://github.com/YOUR-USERNAME/thesis-monitor.git
git push -u github main
```

If the `github` remote already exists, skip `git remote add` or update it with `git remote set-url github ...`. Do not commit `.env*`, `.dev.vars*`, database exports, or API keys. The local secret and build files are ignored.

## 3. Connect Cloudflare to GitHub

Open **Workers & Pages → Create application → Import a repository**, connect GitHub, and select this repository. Set:

| Setting | Value |
| --- | --- |
| Worker name | `traders-ust-thesis-monitor` (must match `wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | `/` if this app is the repository root; otherwise its relative folder, e.g. `thesis-monitor` |
| Build command | `npm run typecheck && npm test && npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Build variable | `NODE_VERSION` = `22` |

Cloudflare installs dependencies from `package-lock.json` before the build. Use its generated build token, but ensure it also has **Account → D1 → Edit** for your account so the migration command can run. Configure the token in **My Profile → API Tokens** or select a token with that permission in the build settings. The default generated token's documented permissions do not include D1.

Leave non-production branch/preview builds disabled for this prototype so they do not share the production database or research budget. This configuration declares only a production database.

Select **Save and Deploy** when you are ready to publish. Subsequent pushes to `main` build, migrate and deploy automatically. These are future deployment instructions; preparing the repository does not create a Worker or database. [Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/), [build settings and token permissions](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## 4. Set the OpenAI runtime secret

After the Worker exists, open **Settings → Variables & Secrets → Add**, choose **Secret**, name it `OPENAI_API_KEY`, paste your key, and save/deploy the change. Add it to the Worker runtime, not **Build variables and secrets**, and do not use a `VITE_` or `NEXT_PUBLIC_` prefix. Research and submission validation require this secret; the first deployment can run without it while you configure it. [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

Open the provided `https://traders-ust-thesis-monitor.<your-subdomain>.workers.dev` URL. `/api/status` should return `configured: true` with usage details; `/api/theses` should return a JSON array. The UI, validation, web research, team-specific prompts, pending-date rules, editing/deletion and shared usage limits work as before.

## Existing data

Your own D1 database starts empty. The existing Sites database and its API key are not copied by a GitHub deployment. To carry records across, obtain a database export from the current host and import it into your new D1 database before switching users over. Preserve **all three tables**, especially `research_runs` (the $12 allowance ledger) and `author_sequences`; do not reset usage while reusing the same OpenAI budget. Schema migrations are not a data transfer, and a full schema export must be reconciled with Wrangler's `d1_migrations` tracking rather than applied on top of already-created tables.

## Local checks without deploying

Use Node 22 LTS (at least 22.13) or newer and run:

```sh
npm ci
npm run typecheck
npm test
npm run db:migrate:local
npm run build:cloudflare
npx wrangler deploy --config dist/server/wrangler.json --dry-run
npm run preview:cloudflare
```

`--dry-run` validates/packages the Worker without uploading it. The local D1 emulator needs no Cloudflare account and uses `.wrangler/cloudflare-state`, separately from the old Sites preview database. For development with hot reload, use `npm run dev:cloudflare`. For local AI testing, copy `.env.example` to `.dev.vars` and fill in the key; those calls still incur OpenAI charges. Without a key, browsing works and AI actions report that OpenAI is not configured.

## Free-tier limits

The configuration requires only Workers Free and D1 Free. Workers Free currently allows 100,000 dynamic requests/day and 10 ms CPU/request; network waiting time does not count as CPU. D1 Free allows 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Workers Builds Free includes 3,000 build minutes/month. OpenAI usage is billed separately; the existing $12 application allowance is unchanged. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [build pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/).

Local checks cannot certify Cloudflare's production CPU limits. After deployment, check Worker metrics for `exceededCpu` while loading the dashboard and running research. Streaming and JSON parsing consume CPU even though waiting for OpenAI does not. No paid CPU limit override or paid storage binding has been added.

# Thesis monitor prototype

A vibecoded prototype for a Traders@UST thesis monitoring dashboard that researches theses on demand and validates / invalidates traders' claims, catalysts and reasoning.

## Develop

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_careful_aaron_stack.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_narrow_major_mapleleaf.sql
npm run dev -- --port 3000
```


```sh
npm run typecheck
npm test
npm run build
```

OpenAI API key is needed.

Create .dev.vars in the project root.

```sh
OPENAI_API_KEY=sk-your-api-key-here
```

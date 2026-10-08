import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import vinext from "vinext";

// Standalone Workers deployment. The existing vite.config.ts remains for Sites.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      configPath: "wrangler.jsonc",
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      persistState: { path: ".wrangler/cloudflare-state" },
      inspectorPort: false,
    }),
  ],
});

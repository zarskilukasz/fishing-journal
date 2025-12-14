// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: import.meta.env.PROD
        ? {
            // Use edge-compatible React DOM server for Cloudflare Workers
            // React 19's standard server build uses MessageChannel which isn't available in Workers
            "react-dom/server": "react-dom/server.edge",
          }
        : {},
    },
    ssr: {
      // Exclude Node.js built-in modules from SSR bundle for Cloudflare Workers
      external: ["node:async_hooks"],
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});

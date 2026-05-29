import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  tanstackStart: {
    server: { 
      entry: "server",
      preset: "vercel"
    },
  },
  cloudflare: false,
  plugins: [
    nitro({
      preset: "vercel"
    })
  ]
});


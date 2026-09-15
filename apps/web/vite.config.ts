import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    host: process.env.WEB_HOST || undefined, // set WEB_HOST=0.0.0.0 to expose on LAN/tunnels
    allowedHosts: true, // dev-only: allow temporary tunnel hosts (trycloudflare.com etc.)
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});

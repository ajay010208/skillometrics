import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the built index.html load assets relatively, so the same
// bundle works from a domain root, a subpath, or any static host.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    host: process.env.WEB_HOST || undefined, // set WEB_HOST=0.0.0.0 to expose on LAN/tunnels
    allowedHosts: true, // dev-only: allow temporary tunnel hosts (trycloudflare.com etc.)
    proxy: {
      // Default backend: the Express API bundled with this repo.
      // Override at runtime with API_TARGET=http://localhost:5001 to run the
      // unified Python-backend prototype (skillometrics2) behind the same UI.
      "/api": process.env.API_TARGET || "http://localhost:4000",
    },
  },
  preview: {
    // `npm start` (vite preview) serves the production build; port follows
    // WEB_PORT so the same env var drives dev and preview.
    port: Number(process.env.WEB_PORT || 4173),
    host: true,
  },
});

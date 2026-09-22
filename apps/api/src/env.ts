import { config } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

// Secrets live in the monorepo root .env; apps/api/.env can add defaults.
// Precedence: real process env (hosting platform) > monorepo root .env >
// apps/api/.env — matching the original loader's "root wins" rule.
//
// Works from BOTH layouts:
//   dev:        apps/api/src/env.js
//   compiled:   apps/api/dist/src/env.js
const here = path.dirname(fileURLToPath(import.meta.url));

// Collect every existing .env from `here` upward (max 6 levels), nearest first.
const candidates: string[] = [];
let dir = here;
for (let i = 0; i < 6 && dir !== path.dirname(dir); i++) {
  const candidate = path.join(dir, ".env");
  if (existsSync(candidate)) candidates.push(candidate);
  dir = path.dirname(dir);
}

// Load root-most first; nearer files only fill gaps (override: false),
// so the monorepo root .env keeps precedence over apps/api/.env.
for (const file of candidates.reverse()) {
  config({ path: file, override: false });
}

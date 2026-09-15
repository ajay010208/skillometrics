import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Secrets live in the monorepo root .env; apps/api/.env can add defaults
// (root wins because it loads first with override precedence).
const here = path.dirname(fileURLToPath(import.meta.url)); // apps/api/src
config({ path: path.resolve(here, "../../../.env") });
config({ path: path.resolve(here, "../.env"), override: false });

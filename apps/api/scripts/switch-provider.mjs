// Switch Prisma datasource between local SQLite (zero-setup demo) and
// PostgreSQL/Supabase. Usage: node scripts/switch-provider.mjs postgresql|sqlite
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
if (!["sqlite", "postgresql"].includes(target)) {
  console.error("Usage: node switch-provider.mjs <sqlite|postgresql>");
  process.exit(1);
}
const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");
let schema = readFileSync(schemaPath, "utf8");
schema = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`);
writeFileSync(schemaPath, schema);
console.log(`✔ datasource provider set to "${target}"`);
if (target === "postgresql") {
  console.log("Now set DATABASE_URL in .env to your Supabase pooler connection string, then run:");
  console.log("  npm run db:push && npm run db:seed");
}

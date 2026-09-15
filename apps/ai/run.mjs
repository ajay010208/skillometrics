// Cross-platform helper: setup venv + install deps, or run the AI service.
// Usage: node run.mjs setup | node run.mjs dev
import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const venv = join(here, ".venv");
const isWin = process.platform === "win32";
const pyExe = join(venv, isWin ? "Scripts\\python.exe" : "bin/python");
const port = process.env.AI_PORT || "8000";

function pythonCmd(args) {
  const candidates = ["python", "py", "python3"];
  for (const c of candidates) {
    const r = spawnSync(c, args, { stdio: "pipe", shell: isWin });
    if (r.status === 0) return c;
  }
  console.error("No Python found on PATH. Install Python 3.10+ from python.org");
  process.exit(1);
}

if (process.argv[2] === "setup") {
  if (!existsSync(venv)) {
    console.log("Creating Python virtualenv…");
    const py = pythonCmd(["--version"]);
    const r = spawnSync(py, ["-m", "venv", venv], { stdio: "inherit", shell: isWin });
    if (r.status !== 0) process.exit(1);
  }
  console.log("Installing AI dependencies…");
  const r = spawnSync(pyExe, ["-m", "pip", "install", "-r", join(here, "requirements.txt"), "--quiet"], { stdio: "inherit", shell: isWin });
  process.exit(r.status ?? 0);
}

// dev: run uvicorn
if (!existsSync(pyExe)) {
  console.error("AI venv missing — run: npm run setup");
  process.exit(1);
}
console.log(`Starting AI service on :${port} …`);
const child = spawn(pyExe, ["-m", "uvicorn", "app.main:app", "--port", port, "--log-level", "warning"], {
  cwd: here,
  stdio: "inherit",
  shell: isWin,
});
child.on("exit", (code) => process.exit(code ?? 0));

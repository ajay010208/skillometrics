// Extract the main diagram SVG (+ page styles) from archify HTML artifacts
// into bare white wrapper pages sized for Edge headless screenshots.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "C:/Users/T-460/OneDrive/Desktop/weather-platform/diagrams";
const files = ["architecture.html", "workflow.html", "oauth-sequence.html"];
const manifest = [];

for (const f of files) {
  const html = readFileSync(join(dir, f), "utf8");

  const svgMatch = html.match(/<svg\b[^>]*viewBox="([\d.\s-]+)"[^>]*>/i);
  if (!svgMatch) {
    console.error(`${f}: no svg with viewBox found`);
    continue;
  }
  const parts = svgMatch[1].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    console.error(`${f}: unexpected viewBox "${svgMatch[1]}"`);
    continue;
  }
  const [w, h] = [parts[2], parts[3]];

  // Page-wide <style> blocks carry the viewer's font/CSS custom properties.
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  // The main diagram svg: the largest one in the document.
  const svgs = [...html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)]
    .map((m) => m[0])
    .sort((a, b) => b.length - a.length);
  const svg = svgs[0];

  const out = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${styles}
html,body{margin:0;padding:0;background:#ffffff;}
svg{display:block;}
</style>
</head>
<body>
${svg}
</body>
</html>`;
  const outName = f.replace(/\.html$/, ".svg-page.html");
  writeFileSync(join(dir, outName), out);
  manifest.push({ file: f, page: outName, w, h });
  console.log(`${f} -> ${outName} viewBox ${w}x${h}`);
}
writeFileSync(join(dir, "png-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("done");

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ciEnvironment, resetDiagnostics, runSuites, saveResults } from "./ci-tools.mjs";

export const browserSuites = ["authenticator", "staff-manager", "applicant-submission", "evaluations", "decisions", "application-queue", "intake", "application-export"];
export async function browserTests() {
  await resetDiagnostics();
  const controller = new AbortController(), abort = () => controller.abort();
  process.once("SIGINT", abort); process.once("SIGTERM", abort);
  const timer = setTimeout(abort, 12 * 60 * 1000);
  try {
    await access(path.join(process.cwd(), ".next", "server", "app", "admin.html"));
    const { version } = JSON.parse(await readFile(new URL("../node_modules/playwright/package.json", import.meta.url), "utf8"));
    if (version !== "1.63.0") throw new Error("Run npm ci to install the pinned Playwright 1.63.0 dependency.");
    const { chromium } = await import("playwright");
    try { const browser = await chromium.launch({ headless: true }); await browser.close(); }
    catch { throw new Error("Chromium is unavailable. Run npx playwright install --with-deps chromium (Windows: npx playwright install chromium)."); }
    const results = await runSuites(browserSuites.map(name => ({ name, command: process.execPath, args: ["--experimental-strip-types", `tests/browser/${name}.mjs`] })), { env: ciEnvironment(), signal: controller.signal });
    const summary = await saveResults(results, "browser-summary");
    console.log(JSON.stringify(summary, null, 2));
    return summary.passed ? 0 : 1;
  } catch (error) {
    const message = error.code === "ENOENT" ? "Build output or a dependency is missing. Run npm ci and npm run build before npm run test:browser." : error.message;
    await saveResults([{ name: "browser-preflight", code: 1, output: message + "\n" }], "browser-summary");
    console.error(message); return 1;
  } finally { clearTimeout(timer); process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = await browserTests();

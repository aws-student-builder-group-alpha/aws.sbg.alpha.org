import { readFile } from "node:fs/promises";
import path from "node:path";
import { ciEnvironment, changedSources, resetDiagnostics, runProcess, saveResults, sourceSnapshot } from "./ci-tools.mjs";

const results = [], controller = new AbortController(), abort = () => controller.abort();
process.once("SIGINT", abort); process.once("SIGTERM", abort);
const timer = setTimeout(abort, 15 * 60 * 1000);
let before;
try {
  await resetDiagnostics();
  const expectedNode = (await readFile(".node-version", "utf8")).trim();
  if (process.versions.node !== expectedNode) throw new Error(`Use Node ${expectedNode} from .node-version; this process uses ${process.versions.node}.`);
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !path.isAbsolute(npmCli)) throw new Error("Run this pipeline through npm run verify:ci.");
  before = await sourceSnapshot();
  console.log(`CI verification with Node ${process.versions.node}; synthetic data; hosted configuration disabled.`);
  const env = ciEnvironment();
  const stages = [
    ["lint", [npmCli, "run", "lint", "--", "--max-warnings=0"], 120000],
    ["node-tests", [npmCli, "run", "test:ci"], 300000],
    ["build", [npmCli, "run", "build"], 300000],
    ["typescript", [path.join("node_modules", "typescript", "bin", "tsc"), "--noEmit"], 120000],
    ["browser", [npmCli, "run", "test:browser"], 12 * 60 * 1000],
  ];
  for (const [name, args, timeoutMs] of stages) {
    console.log(`\nVerification stage: ${name}`);
    const result = await runProcess({ command: process.execPath, args, env, signal: controller.signal, timeoutMs });
    results.push({ name, ...result });
    if (result.code !== 0) break;
  }
} catch (error) {
  results.push({ name: "verification-preflight", code: 1, output: error.message + "\n" }); console.error(error.message);
} finally {
  clearTimeout(timer); process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort);
  if (before) {
    try {
      const changed = changedSources(before, await sourceSnapshot());
      results.push({ name: "source-integrity", code: changed.length ? 1 : 0, output: changed.length ? "Verification changed source files:\n" + changed.join("\n") + "\n" : "Tracked and nonignored source files are unchanged.\n" });
    } catch (error) { results.push({ name: "source-integrity", code: 1, output: error.message + "\n" }); }
  }
  try {
    const summary = await saveResults(results, "verification-summary", process.cwd(), { node: process.versions.node, hostedVerification: false });
    console.log(JSON.stringify(summary, null, 2)); process.exitCode = summary.passed ? 0 : 1;
  } catch (error) { console.error("Could not save verification diagnostics:", error.message); process.exitCode = 1; }
}

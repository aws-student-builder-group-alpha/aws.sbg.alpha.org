import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readlink, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";

export function ciEnvironment(base = process.env) {
  const env = { ...base };
  const executablePath = Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "path" || /^(?:NEXT_PUBLIC_|SUPABASE_|VERCEL_|DATABASE_URL$|PGPASSWORD$|GH_TOKEN$|GITHUB_TOKEN$|NODE_AUTH_TOKEN$|CRON_SECRET$|NODE_ENV$)/i.test(key)) delete env[key];
  }
  return { ...env, PATH: path.dirname(process.execPath) + path.delimiter + executablePath, CI: "true", APP_URL: "http://localhost:3000", NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" };
}

/** Kill the process tree, including Chromium, when a suite exceeds its budget. */
function terminate(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    killer.once("error", () => child.kill("SIGKILL"));
    killer.once("exit", code => { if (code) child.kill("SIGKILL"); });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  }
}

export async function runProcess({ command, args = [], cwd = process.cwd(), env = ciEnvironment(), timeoutMs = 120000, signal, echo = true }) {
  const started = Date.now();
  if (signal?.aborted) return { code: 1, cancelled: true, timedOut: false, durationMs: 0, output: "Cancelled before start.\n" };
  return new Promise(resolve => {
    let output = "", truncated = false, timedOut = false, cancelled = false, error = "", finished = false;
    const decoder = new StringDecoder("utf8");
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32", windowsHide: true });
    const capture = data => {
      const text = decoder.write(data);
      if (echo) process.stdout.write(text);
      output += text;
      if (output.length > 2 * 1024 * 1024) { output = output.slice(-2 * 1024 * 1024); truncated = true; }
    };
    child.stdout.on("data", capture); child.stderr.on("data", capture);
    const abort = () => { cancelled = true; terminate(child); };
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; terminate(child); }, timeoutMs);
    function finish(code, exitSignal) {
      if (finished) return;
      finished = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
      output += decoder.end();
      const suffix = error ? error + "\n" : timedOut ? "Timed out; child process tree terminated.\n" : cancelled ? "Cancelled; child process tree terminated.\n" : "";
      resolve({ code: error || timedOut || cancelled || exitSignal ? 1 : code ?? 1, cancelled, timedOut, durationMs: Date.now() - started,
        output: (truncated ? "[Earlier output truncated at 2 MiB characters]\n" : "") + output + suffix });
    }
    child.once("error", failure => { error = failure.message; finish(1); });
    child.once("close", finish);
  });
}

export async function sourceSnapshot(cwd = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true }).split("\0").filter(Boolean);
  const result = {};
  for (const file of [...new Set(files)].sort()) {
    const target = path.join(cwd, file);
    try {
      const stat = await lstat(target);
      const bytes = stat.isSymbolicLink() ? await readlink(target) : await readFile(target);
      result[file] = (stat.isSymbolicLink() ? "link:" : "file:") + createHash("sha256").update(bytes).digest("hex");
    } catch (error) { if (error.code === "ENOENT") result[file] = "missing"; else throw error; }
  }
  return result;
}

export function changedSources(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
}

export async function resetDiagnostics(cwd = process.cwd()) {
  const root = await realpath(cwd), target = path.join(root, ".next", "verification");
  // These are the only recursively removed paths. Refuse symlinked parents/targets.
  for (const directory of [path.join(root, ".next"), target]) {
    try { if ((await lstat(directory)).isSymbolicLink()) throw new Error("Refusing symlinked diagnostic directory"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  if (!target.startsWith(root + path.sep) || path.relative(root, target) !== path.join(".next", "verification")) throw new Error("Invalid diagnostics target");
  await rm(target, { recursive: true, force: true });
  await mkdir(path.join(target, "ci"), { recursive: true });
}

export async function saveResults(results, name, cwd = process.cwd(), extra = {}) {
  if (![name, ...results.map(result => result.name)].every(value => /^[a-z0-9-]+$/.test(value))) throw new Error("Invalid diagnostic name");
  const directory = path.join(cwd, ".next", "verification", "ci");
  await mkdir(directory, { recursive: true });
  for (const result of results) await writeFile(path.join(directory, result.name + ".log"), result.output, "utf8");
  const summary = { ...extra, passed: results.length > 0 && results.every(result => result.code === 0), results: results.map(result => Object.fromEntries(Object.entries(result).filter(([key]) => key !== "output"))) };
  await writeFile(path.join(directory, name + ".json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  return summary;
}

export async function runSuites(suites, { cwd = process.cwd(), env = ciEnvironment(), signal, timeoutMs = 120000, echo = true } = {}) {
  const results = [];
  for (const suite of suites) {
    if (echo) process.stdout.write(`\nRunning ${suite.name}\n`);
    const result = await runProcess({ ...suite, cwd, env, signal, timeoutMs, echo });
    results.push({ name: suite.name, ...result });
  }
  return results;
}

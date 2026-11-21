import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const projectName = "awslc-alpha-org";

function run(command, args, secret = "") {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.stderr) process.stderr.write(secret ? result.stderr.replaceAll(secret, "[redacted]") : result.stderr);
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unavailable"}.`);
  return result.stdout.trim();
}

export async function release(env, execute = run, request = fetch, report = console.log) {
  const { VERIFIED_SHA: sha, VERCEL_RELEASE_MODE: mode, VERCEL_TOKEN: token,
    VERCEL_ORG_ID: team, VERCEL_PROJECT_ID: projectId, VERCEL_TEAM_SLUG: scope } = env;
  if (!/^[0-9a-f]{40}$/.test(sha ?? "") || !["stage", "live"].includes(mode)) {
    throw new Error("A verified commit and release mode are required.");
  }
  if (execute("git", ["rev-parse", "HEAD"]) !== sha) {
    throw new Error("The checkout does not match the commit verified by CI.");
  }
  const isCurrent = () => execute("git", ["ls-remote", "--exit-code", "origin", "refs/heads/main"]).split(/\s+/)[0] === sha;
  if (!isCurrent()) {
    report(`Skipped ${sha} because main has advanced.`);
    return;
  }
  if (![token, team, projectId, scope].every(Boolean)) {
    throw new Error("Configure the Vercel credentials and project identifiers in unified-vercel-production.");
  }

  async function vercelGet(path) {
    const url = new URL(path, "https://api.vercel.com");
    url.searchParams.set("teamId", team);
    const response = await request(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Vercel verification returned HTTP ${response.status}.`);
    return response.json();
  }

  const project = await vercelGet(`/v9/projects/${encodeURIComponent(projectId)}`);
  if (project.id !== projectId || project.name !== projectName || (project.rootDirectory && project.rootDirectory !== ".")) {
    throw new Error("The configured Vercel project must be awslc-alpha-org at the repository root.");
  }

  const vercel = (args) => execute("npx", ["--yes", "vercel@59.1.4", ...args, "--scope", scope, "--token", token], token);
  const result = JSON.parse(vercel([
    "deploy", "--project", projectId, "--prod", "--skip-domain", "--yes", "--json", "--no-color",
    "--meta", `verifiedCommitSha=${sha}`,
  ]));
  const staged = result.deployment ?? result;
  if (!/^dpl_[a-zA-Z0-9]+$/.test(staged.id ?? "") || staged.readyState !== "READY" || staged.target !== "production"
    || !/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app\/?$/.test(staged.url ?? "")) {
    throw new Error("Vercel did not return a ready staged production deployment.");
  }
  const deployment = await vercelGet(`/v13/deployments/${staged.id}`);
  if (deployment.id !== staged.id || deployment.projectId !== projectId || deployment.readyState !== "READY"
    || deployment.target !== "production" || deployment.meta?.verifiedCommitSha !== sha) {
    throw new Error("The staged deployment does not match the verified commit and target project.");
  }
  report(`Staged ${sha} as ${staged.id} at ${staged.url}.`);

  if (mode === "stage") return;
  if (!isCurrent()) {
    report("Production promotion skipped because main advanced during the build.");
    return;
  }
  vercel(["promote", staged.id, "--yes", "--timeout", "5m", "--no-color"]);
  report(`Promoted ${staged.id} to production.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = (message) => {
    console.log(message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
  };
  try {
    await release(process.env, run, fetch, report);
  } catch (error) {
    console.error(error instanceof SyntaxError ? "Vercel returned invalid JSON." : error.message);
    process.exitCode = 1;
  }
}

import assert from "node:assert/strict";
import test from "node:test";
import { release } from "./release-vercel.mjs";

const sha = "a".repeat(40);
const newer = "b".repeat(40);

function fixture({ mode = "live", tips = [sha, sha], checkout = sha, stagedSha = sha,
  projectName = "awslc-alpha-org", readyState = "READY" } = {}) {
  const env = {
    VERIFIED_SHA: sha, VERCEL_RELEASE_MODE: mode, VERCEL_TOKEN: "synthetic-token",
    VERCEL_ORG_ID: "team_fixture", VERCEL_PROJECT_ID: "prj_fixture", VERCEL_TEAM_SLUG: "fixture",
  };
  const commands = [];
  const messages = [];
  const execute = (program, args) => {
    commands.push([program, ...args]);
    if (program === "git") return args[0] === "rev-parse" ? checkout : `${tips.shift()}\trefs/heads/main`;
    if (args[2] === "deploy") return JSON.stringify({
      deployment: { id: "dpl_fixture", url: "https://fixture.vercel.app", readyState, target: "production" },
    });
    assert.equal(args[2], "promote");
    return "";
  };
  const request = async (url, options) => {
    assert.equal(url.origin, "https://api.vercel.com");
    assert.equal(url.searchParams.get("teamId"), env.VERCEL_ORG_ID);
    assert.equal(options.headers.Authorization, "Bearer synthetic-token");
    if (url.pathname === "/v9/projects/prj_fixture") {
      return Response.json({ id: env.VERCEL_PROJECT_ID, name: projectName, rootDirectory: null });
    }
    assert.equal(url.pathname, "/v13/deployments/dpl_fixture");
    return Response.json({
      id: "dpl_fixture", projectId: env.VERCEL_PROJECT_ID, target: "production", readyState,
      meta: { verifiedCommitSha: stagedSha },
    });
  };
  return {
    run: () => release(env, execute, request, (message) => messages.push(message)),
    commands, messages,
    vercelCommands: () => commands.filter(([program]) => program === "npx"),
  };
}

test("stage mode builds the verified commit without assigning production domains", async () => {
  const run = fixture({ mode: "stage" });
  await run.run();
  const [deploy] = run.vercelCommands();
  assert.ok(deploy.includes("--prod"));
  assert.ok(deploy.includes("--skip-domain"));
  assert.ok(deploy.includes(`verifiedCommitSha=${sha}`));
  assert.equal(run.vercelCommands().length, 1);
});

test("live mode promotes the verified deployment after checking main again", async () => {
  const run = fixture();
  await run.run();
  assert.deepEqual(run.commands.map((args) => args.slice(0, args[0] === "git" ? 2 : 4)), [
    ["git", "rev-parse"], ["git", "ls-remote"], ["npx", "--yes", "vercel@59.1.4", "deploy"],
    ["git", "ls-remote"], ["npx", "--yes", "vercel@59.1.4", "promote"],
  ]);
  assert.equal(run.vercelCommands()[1][4], "dpl_fixture");
});

test("a superseded commit skips the build or skips promotion if main advanced during the build", async () => {
  const staleBefore = fixture({ tips: [newer] });
  await staleBefore.run();
  assert.equal(staleBefore.vercelCommands().length, 0);
  const staleAfter = fixture({ tips: [sha, newer] });
  await staleAfter.run();
  assert.equal(staleAfter.vercelCommands().length, 1);
  assert.match(staleAfter.messages.at(-1), /promotion skipped/);
});

test("a mismatched checkout, unexpected project, failed build or mismatched deployment cannot promote", async () => {
  for (const [options, error, commandCount] of [
    [{ checkout: newer }, /checkout does not match/, 0],
    [{ projectName: "aws-alpha-recruitment" }, /must be awslc-alpha-org/, 0],
    [{ readyState: "ERROR" }, /did not return a ready/, 1],
    [{ stagedSha: newer }, /does not match the verified commit/, 1],
  ]) {
    const run = fixture(options);
    await assert.rejects(run.run(), error);
    assert.equal(run.vercelCommands().length, commandCount);
  }
});

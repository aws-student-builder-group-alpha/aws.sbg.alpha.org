import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import yaml from "js-yaml";
import { browserSuites } from "../scripts/browser-tests.mjs";
import { changedSources, ciEnvironment, resetDiagnostics, runProcess, runSuites, saveResults, sourceSnapshot } from "../scripts/ci-tools.mjs";

async function temporary(t) {
  const root = await mkdtemp(path.join(tmpdir(), "alpha-ci-test-"));
  t.after(async () => {
    const relative = path.relative(path.resolve(tmpdir()), path.resolve(root));
    assert.ok(relative.startsWith("alpha-ci-test-") && !relative.includes(path.sep));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

test("CI workflow parses with pinned tools, ordinary triggers, read-only permissions and a narrow artifact allowlist",async()=>{
 const workflow=yaml.load(await readFile(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8"));
 assert.deepEqual(Object.keys(workflow.on).sort(),["pull_request","push","workflow_dispatch"]);assert.deepEqual(workflow.on.push.branches,["main"]);assert.deepEqual(workflow.on.pull_request.branches,["main"]);assert.deepEqual(workflow.permissions,{contents:"read"});assert.equal(workflow.concurrency["cancel-in-progress"],true);
 const job=workflow.jobs.verify;assert.equal(job["runs-on"],"ubuntu-24.04");assert.equal(job["timeout-minutes"],20);assert.equal(job.env.NEXT_TELEMETRY_DISABLED,"1");
 for(const step of job.steps.filter(step=>step.uses))assert.match(step.uses,/^actions\/(checkout|setup-node|upload-artifact)@[a-f0-9]{40}$/);
 assert.equal(job.steps.find(step=>step.uses?.startsWith("actions/checkout@")).with["persist-credentials"],false);
 const setup=job.steps.find(step=>step.uses?.startsWith("actions/setup-node@"));assert.equal(setup.with["node-version-file"],".node-version");assert.equal(setup.with.cache,"npm");
 const upload=job.steps.find(step=>step.uses?.startsWith("actions/upload-artifact@"));assert.equal(upload.with["retention-days"],7);assert.equal(upload.with["include-hidden-files"],true);
 for(const entry of upload.with.path.trim().split("\n"))assert.match(entry,/^\.next\/verification\/(?:ci\/\*\.(?:log|json)|(?:staff-confirmation|applicant-submission|evaluations|decisions|application-queue|intake|application-export)\/\*\.png)$/);
 assert.equal(JSON.stringify(workflow).includes("secrets."),false);assert.deepEqual(job.steps.filter(step=>step.run).map(step=>step.run),["npm ci","npx playwright install --with-deps chromium","npm run verify:ci"]);
 const manifest=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));assert.equal(manifest.devDependencies.playwright,"1.63.0");assert.match(manifest.scripts["test:ci"],/--test-concurrency=2/);assert.equal((await readFile(new URL("../.node-version",import.meta.url),"utf8")).trim(),"24.22.1");assert.equal(browserSuites.length,8);
});

test("CI subprocess environment disables hosted configuration and uses the invoking Node on Windows and Linux",()=>{
 const env=ciEnvironment({Path:"synthetic-bin",NEXT_PUBLIC_SUPABASE_URL:"synthetic-host",SUPABASE_SERVICE_ROLE_KEY:"synthetic-secret",VERCEL_TOKEN:"synthetic-secret",DATABASE_URL:"synthetic-secret",PGPASSWORD:"synthetic-secret",GH_TOKEN:"synthetic-secret",GITHUB_TOKEN:"synthetic-secret",NODE_AUTH_TOKEN:"synthetic-secret",CRON_SECRET:"synthetic-secret",APP_URL:"https://synthetic.example.test",NODE_ENV:"development"});
 assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,"");assert.equal(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,"");assert.equal(env.APP_URL,"http://localhost:3000");assert.equal(env.NEXT_TELEMETRY_DISABLED,"1");assert.equal(Object.keys(env).filter(key=>key.toLowerCase()==="path").length,1);assert.ok(env.PATH.startsWith(path.dirname(process.execPath)+path.delimiter));assert.equal(JSON.stringify(env).includes("synthetic-secret"),false);assert.equal(env.NODE_ENV,undefined);
});

test("suite runner records a failed child, continues remaining suites and never reports an all-green summary",async t=>{
 const cwd=await temporary(t);await resetDiagnostics(cwd);
 const results=await runSuites([{name:"fails",command:process.execPath,args:["-e","console.error('synthetic failure');process.exit(7)"]},{name:"passes",command:process.execPath,args:["-e","console.log('synthetic success')"]}],{cwd,echo:false});
 assert.deepEqual(results.map(result=>result.code),[7,0]);const summary=await saveResults(results,"test-summary",cwd);assert.equal(summary.passed,false);assert.equal("output" in summary.results[0],false);assert.match(await readFile(path.join(cwd,".next/verification/ci/fails.log"),"utf8"),/synthetic failure/);await assert.rejects(saveResults(results,"../escape",cwd));
});

test("suite timeout terminates descendants and still runs the next suite",async t=>{
 const cwd=await temporary(t),marker=path.join(cwd,"heartbeat.txt");
 const descendant=`const fs=require('node:fs');setInterval(()=>fs.writeFileSync(${JSON.stringify(marker)},String(Date.now())),30);`;
 const parent=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore',windowsHide:true});setInterval(()=>{},1000);`;
 const results=await runSuites([{name:"times-out",command:process.execPath,args:["-e",parent]},{name:"after-timeout",command:process.execPath,args:["-e","process.exit(0)"]}],{cwd,timeoutMs:1500,echo:false});
 assert.equal(results[0].timedOut,true);assert.equal(results[0].code,1);assert.equal(results[1].code,0);const heartbeat=await readFile(marker,"utf8");await delay(150);assert.equal(await readFile(marker,"utf8"),heartbeat);
});

test("missing executable and explicit cancellation return failures with actionable diagnostics",async t=>{
 const cwd=await temporary(t),missing=await runProcess({command:path.join(cwd,"missing-executable"),cwd,echo:false});assert.equal(missing.code,1);assert.match(missing.output,/ENOENT|not found/i);
 const controller=new AbortController();const pending=runProcess({command:process.execPath,args:["-e","setInterval(()=>{},1000)"],cwd,signal:controller.signal,echo:false});controller.abort();const result=await pending;assert.equal(result.cancelled,true);assert.equal(result.code,1);
});

test("source snapshot detects changed, removed and new nonignored files without exposing their contents",async t=>{
 const cwd=await temporary(t);execFileSync("git",["init","--quiet"],{cwd,windowsHide:true});await writeFile(path.join(cwd,".gitignore"),".next/\n");await writeFile(path.join(cwd,"source.txt"),"original synthetic source\n");const before=await sourceSnapshot(cwd);await mkdir(path.join(cwd,".next"));await writeFile(path.join(cwd,".next/generated.txt"),"ignored");assert.deepEqual(changedSources(before,await sourceSnapshot(cwd)),[]);await writeFile(path.join(cwd,"source.txt"),"changed synthetic source\n");await writeFile(path.join(cwd,"new.txt"),"new");assert.deepEqual(changedSources(before,await sourceSnapshot(cwd)).sort(),["new.txt","source.txt"]);assert.equal(JSON.stringify(before).includes("original synthetic source"),false);
});

test("standalone browser preflight explains missing build output without launching suites",async t=>{
 const cwd=await temporary(t);await mkdir(path.join(cwd,"scripts"));for(const file of ["browser-tests.mjs","ci-tools.mjs"])await cp(new URL("../scripts/"+file,import.meta.url),path.join(cwd,"scripts",file));
 const result=await runProcess({command:process.execPath,args:["scripts/browser-tests.mjs"],cwd,echo:false});assert.equal(result.code,1);assert.match(result.output,/npm run build/);const summary=JSON.parse(await readFile(path.join(cwd,".next/verification/ci/browser-summary.json"),"utf8"));assert.equal(summary.passed,false);
});

test("missing Chromium preflight gives an installation command and a failed artifact summary",async t=>{
 const cwd=await temporary(t);await mkdir(path.join(cwd,"scripts"));for(const file of ["browser-tests.mjs","ci-tools.mjs"])await cp(new URL("../scripts/"+file,import.meta.url),path.join(cwd,"scripts",file));await mkdir(path.join(cwd,".next/server/app"),{recursive:true});await writeFile(path.join(cwd,".next/server/app/admin.html"),"synthetic shell");await mkdir(path.join(cwd,"node_modules/playwright"),{recursive:true});await writeFile(path.join(cwd,"node_modules/playwright/package.json"),JSON.stringify({version:"1.63.0",type:"module",exports:"./index.mjs"}));await writeFile(path.join(cwd,"node_modules/playwright/index.mjs"),"export const chromium={launch:async()=>{throw Error('synthetic missing browser')}};");
 const result=await runProcess({command:process.execPath,args:["scripts/browser-tests.mjs"],cwd,echo:false});assert.equal(result.code,1);assert.match(result.output,/npx playwright install --with-deps chromium/);assert.equal(JSON.parse(await readFile(path.join(cwd,".next/verification/ci/browser-summary.json"),"utf8")).passed,false);
});

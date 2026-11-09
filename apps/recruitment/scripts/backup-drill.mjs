import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { emptyDraftInput } from "../lib/drafts.ts";
import { ciphertextHash, createBackup, postgresImage, restoreLocalBackup } from "./backup-tools.mjs";

// No application env file is loaded. This command creates and removes its own local container.
const name = "alpha-backup-drill-" + randomUUID(), directory = await mkdtemp(path.join(tmpdir(), "alpha-backup-drill-"));
const age = process.env.BACKUP_AGE_BIN ?? "age", keygen = process.env.BACKUP_AGE_KEYGEN_BIN ?? "age-keygen";
const source = "alpha_restore_source", restored = "alpha_restore_verified", wrongTarget = "alpha_restore_wrongkey", replayFailure = "alpha_restore_replay_failure";
const owner = "00000000-0000-4000-8000-000000000001", kept = "00000000-0000-4000-8000-000000000002", deleted = "00000000-0000-4000-8000-000000000003";
let started = false;
function command(executable, args, input) {
  const result = spawnSync(executable, args, { input, encoding: "utf8", timeout: 60000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) {
    mkdirSync(".next/backup-drill", { recursive: true });
    writeFileSync(".next/backup-drill/synthetic-tool-error.txt", result.stderr ?? result.error?.message ?? "Tool failed.", "utf8");
    throw Error("Local synthetic drill tool failed; private diagnostics are in .next/backup-drill/synthetic-tool-error.txt. No hosted operation was attempted.");
  }
  return result.stdout;
}
const docker = (args, input) => command("docker", args, input);
const sql = (database, input) => docker(["exec", "-i", name, "psql", "--no-psqlrc", "--set=ON_ERROR_STOP=1", "--quiet", "--tuples-only", "-U", "postgres", "-d", database], input);
const input = { ...process.env, BACKUP_PGHOST: "127.0.0.1", BACKUP_PGUSER: "postgres", BACKUP_PGPASSWORD: "synthetic-drill-only", BACKUP_PGDATABASE: source };
const restore = { command: "docker", args: ["exec", "-i", name, "pg_restore", "-U", "postgres"] };
const syntheticDiagnostics = chunk => { mkdirSync(".next/backup-drill", { recursive: true }); appendFileSync(".next/backup-drill/synthetic-tool-error.txt", chunk); };
const replay = { command: "docker", args: ["exec", "-i", name, "psql", "-U", "postgres", "-d", restored] };
try {
  command(age, ["--version"]); docker(["info", "--format", "{{.ServerVersion}}"]);
  console.log("Starting disposable PostgreSQL 17.11 restore drill.");
  docker(["run", "--detach", "--name", name, "--network", "none", "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_PASSWORD=synthetic-drill-only", postgresImage]); started = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], { timeout: 5000, windowsHide: true });
    if (result.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw Error("Disposable PostgreSQL did not become ready.");
  sql("postgres", `create role anon; create role authenticated; create database ${source}; create database ${restored}; create database ${wrongTarget}; create database ${replayFailure};`);
  // Fresh PostgreSQL creates public automatically; the archive will create it with its original ACL.
  for (const database of [restored, wrongTarget, replayFailure]) sql(database, "drop schema public;");
  sql(source, `create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid references auth.users(id) on delete cascade,provider text);
    create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,secret text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth,public to anon,authenticated;
    create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key);`);
  for (const file of (await readdir("supabase/migrations")).filter(file => file.endsWith(".sql")).sort()) {
    sql(source, await readFile(path.join("supabase/migrations", file), "utf8"));
    sql(source, `insert into supabase_migrations.schema_migrations values ('${file.split("_")[0]}');`);
  }
  sql(source, `insert into auth.users values ('${owner}','owner@example.test',now()),('${kept}','kept@example.test',now()),('${deleted}','deleted@example.test',now());
    insert into auth.identities select id,'google' from auth.users;
    insert into auth.mfa_factors values (gen_random_uuid(),'${owner}','synthetic-factor-only');
    select public.bootstrap_first_staff_admin('owner@example.test','Synthetic restore drill');`);
  const draft = JSON.stringify({ ...emptyDraftInput(), processingConsent: true }).replaceAll("'", "''");
  for (const id of [kept, deleted]) sql(source, `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);select public.save_applicant_draft('${draft}'::jsonb,0,gen_random_uuid());commit;`);
  const fingerprintSql = `select md5(coalesce(jsonb_agg(to_jsonb(d) order by d.id)::text,'')) from public.applicant_drafts d where owner_id='${kept}';`;
  const before = sql(source, fingerprintSql);
  const identity = path.join(directory, "identity.txt"), wrongIdentity = path.join(directory, "wrong-identity.txt"), replayFile = path.join(directory, "deletions.sql");
  command(keygen, ["--output", identity]); command(keygen, ["--output", wrongIdentity]);
  input.BACKUP_AGE_RECIPIENT = command(keygen, ["-y", identity]).trim();
  const backup = await createBackup({ cwd: directory, input, local: true, age, syntheticDiagnostics, dump: { command: "docker", args: ["exec", "-i", name, "pg_dump", "-U", "postgres", "-d", source] } });
  assert.equal((await readFile(path.join(backup, "database.dump.age"))).includes(Buffer.from("synthetic-factor-only")), false);
  assert.equal(sql(source, fingerprintSql), before);
  // This deletion happens AFTER the snapshot: restoring must not resurrect it.
  sql(source, `delete from auth.users where id='${deleted}';`);
  await writeFile(replayFile, `delete from auth.users where id='${deleted}';\n`, { mode: 0o600 });
  const request = { directory: backup, identity, replayFile, input: { ...input, BACKUP_PGDATABASE: restored }, age, restore, replay, syntheticDiagnostics };
  await assert.rejects(restoreLocalBackup({ ...request, identity: wrongIdentity, input: { ...input, BACKUP_PGDATABASE: wrongTarget } }));
  const corrupt = path.join(directory, "corrupt"); await mkdir(corrupt);
  const corruptedArchive = path.join(corrupt, "database.dump.age"); await copyFile(path.join(backup, "database.dump.age"), corruptedArchive);
  const corruptBytes = await readFile(corruptedArchive); corruptBytes[corruptBytes.length - 1] ^= 1; await writeFile(corruptedArchive, corruptBytes);
  const corruptManifest = JSON.parse(await readFile(path.join(backup, "manifest.json"), "utf8")); corruptManifest.sha256 = await ciphertextHash(corruptedArchive);
  await writeFile(path.join(corrupt, "manifest.json"), JSON.stringify(corruptManifest));
  await assert.rejects(restoreLocalBackup({ ...request, directory: corrupt, input: { ...input, BACKUP_PGDATABASE: wrongTarget } }));
  assert.equal(sql(wrongTarget, "select count(*) from pg_tables where schemaname in ('auth','private');").trim(), "0");
  const badReplay = path.join(directory, "failed-replay.sql"); await writeFile(badReplay, "select deliberately_missing_replay_function();\n");
  await assert.rejects(restoreLocalBackup({ ...request, replayFile: badReplay, input: { ...input, BACKUP_PGDATABASE: replayFailure }, replay: { command: "docker", args: ["exec", "-i", name, "psql", "-U", "postgres", "-d", replayFailure] } }));
  assert.equal(sql(replayFailure, `select count(*) from auth.users where id='${deleted}';`).trim(), "1"); // Isolated target remains incomplete, never a success.
  const result = await restoreLocalBackup(request);
  assert.equal(result.deletionsReplayed, true); assert.equal(sql(restored, fingerprintSql), before);
  assert.equal(sql(restored, `select count(*) from auth.users where id='${deleted}';`).trim(), "0");
  assert.equal(sql(restored, "select count(*) from public.applicant_drafts;").trim(), "1");
  assert.equal(sql(restored, "select count(*) from public.staff_memberships where role='administrator' and status='active';").trim(), "1");
  assert.equal(sql(restored, "select count(*) from auth.mfa_factors;").trim(), "1");
  assert.equal(sql(restored, "select count(*) from public.draft_opportunities;").trim(), "16");
  sql(restored, `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${deleted}',true);do $$begin if (select count(*) from public.applicant_drafts) <> 0 then raise exception 'RLS isolation lost'; end if;end$$;rollback;`);
  sql(restored, await readFile(replayFile, "utf8")); // Replay is repeatable.
  console.log("PASS: real age encryption, wrong-key/tamper rejection before SQL, failed-replay rejection, complete PostgreSQL archive restore, unchanged retained answers, administrator/MFA fixture, catalog, RLS isolation and idempotent later-deletion replay.");
  console.log("Synthetic local evidence only; managed Supabase Auth/provider recovery and live deletion-ledger replay remain unverified.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (started) docker(["rm", "--force", name]);
  assert.equal(path.dirname(directory), path.resolve(tmpdir())); assert.ok(path.basename(directory).startsWith("alpha-backup-drill-"));
  await rm(directory, { recursive: true, force: true });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yaml from "js-yaml";
import { backupSchemas, boundedBytes, createBackup, databaseEnvironment, postgresCommand, restoreLocalBackup, transfer, validateBackup } from "../scripts/backup-tools.mjs";

const input = { ...process.env, BACKUP_PGHOST: "127.0.0.1", BACKUP_PGUSER: "postgres", BACKUP_PGPASSWORD: "synthetic-only", BACKUP_PGDATABASE: "alpha_restore_fixture", BACKUP_AGE_RECIPIENT: "age1" + "q".repeat(58) };
const node = code => ({ command: process.execPath, args: ["-e", code, "--"] });
async function temporary(t) {
  const cwd = await mkdtemp(path.join(tmpdir(), "alpha-backup-test-"));
  t.after(async () => { assert.equal(path.dirname(cwd), path.resolve(tmpdir())); assert.ok(path.basename(cwd).startsWith("alpha-backup-test-")); await rm(cwd, { recursive: true, force: true }); });
  return cwd;
}
// Synthetic byte transformer tests plumbing only; real age verification is in backup-drill.mjs.
const dump = node("process.stdout.write('synthetic archive '.repeat(100))");
const encrypt = node("process.stdin.on('data',chunk=>process.stdout.write(Buffer.from(chunk).map(byte=>byte^42)))");

test("backup job is gated to private main, has no PR trigger and retains only encrypted artifacts for 35 days", async () => {
  const workflow = yaml.load(await readFile(new URL("../.github/workflows/backup.yml", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(workflow.on).sort(), ["schedule", "workflow_dispatch"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.concurrency["cancel-in-progress"], false);
  const job = workflow.jobs.backup;
  assert.match(job.if, /BACKUPS_ENABLED == 'true'/); assert.match(job.if, /repository.private == true/); assert.match(job.if, /refs\/heads\/main/);
  assert.equal(job["timeout-minutes"], 15);
  for (const step of job.steps.filter(value => value.uses)) assert.match(step.uses, /^actions\/[a-z-]+@[a-f0-9]{40}$/);
  const upload = job.steps.find(step => step.uses?.startsWith("actions/upload-artifact@"));
  assert.equal(upload.with["retention-days"], 35); assert.equal(upload.with["if-no-files-found"], "error"); assert.equal(upload.if, undefined);
  assert.deepEqual(upload.with.path.trim().split("\n"), [".backups/**/database.dump.age", ".backups/**/manifest.json"]);
  assert.ok(!JSON.stringify(workflow).includes("AGE_SECRET_KEY"));
});

test("database configuration matches the exact project and session connection, never a transaction pooler", () => {
  const ref = "a".repeat(20), base = { ...input, BACKUP_PROJECT_REF: ref, BACKUP_PGDATABASE: "postgres", BACKUP_PGHOST: `db.${ref}.supabase.co` };
  const env = databaseEnvironment({ ...base, GITHUB_TOKEN: "synthetic-token", NEXT_PUBLIC_SUPABASE_URL: "synthetic-host" });
  assert.equal(env.PGSSLMODE, "require"); assert.match(env.PGOPTIONS, /default_transaction_read_only=on/); assert.equal(env.GITHUB_TOKEN, undefined); assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, undefined);
  assert.throws(() => databaseEnvironment({ ...base, BACKUP_PROJECT_REF: "b".repeat(20) }));
  assert.throws(() => databaseEnvironment({ ...base, BACKUP_PGHOST: "aws-0-ap-southeast-1.pooler.supabase.com", BACKUP_PGUSER: `postgres.${ref}`, BACKUP_PGPORT: "6543" }));
  assert.equal(databaseEnvironment({ ...base, BACKUP_PGHOST: "aws-0-ap-southeast-1.pooler.supabase.com", BACKUP_PGUSER: `postgres.${ref}` }).PGPORT, "5432");
});

test("restore guard rejects hosted destinations and non-drill databases before running SQL", async () => {
  for (const values of [{ ...input, BACKUP_PGHOST: "db.example.supabase.co" }, { ...input, BACKUP_PGDATABASE: "postgres" }]) {
    await assert.rejects(restoreLocalBackup({ input: values }), /localhost/);
  }
  const command = postgresCommand("pg_dump"); assert.match(command.args.join(" "), /@sha256:[a-f0-9]{64}/); assert.ok(!command.args.join(" ").includes("synthetic-only"));
  assert.throws(() => postgresCommand("arbitrary-command"));
});

test("snapshot pipeline publishes an integrity manifest only after both processes finish", async t => {
  const cwd = await temporary(t), directory = await createBackup({ cwd, input, local: true, dump, encrypt });
  assert.deepEqual((await readdir(directory)).sort(), ["database.dump.age", "manifest.json"]);
  const { manifest, archive } = await validateBackup(directory);
  assert.equal(manifest.synthetic, true); assert.deepEqual(manifest.schemas, backupSchemas); assert.equal(manifest.encrypted, true);
  assert.ok(!(await readFile(archive, "utf8")).includes("synthetic archive"));
  assert.ok(!JSON.stringify(manifest).includes("synthetic-only"));
  await writeFile(archive, "corrupt"); await assert.rejects(validateBackup(directory), /integrity/);
});

test("failed dump and failed encryptor remove their partial output and redact tool diagnostics", async t => {
  const cwd = await temporary(t), failure = node("process.stderr.write('synthetic-sensitive-password');process.stdout.write('partial');process.exit(9)");
  for (const pair of [{ dump: failure, encrypt }, { dump, encrypt: failure }]) {
    await assert.rejects(createBackup({ cwd, input, local: true, ...pair }), error => !error.message.includes("synthetic-sensitive-password"));
    assert.deepEqual(await readdir(path.join(cwd, ".backups")), []);
  }
});

test("backup cancellation and subprocess timeout terminate transfers without claiming success", async t => {
  const cwd = await temporary(t), controller = new AbortController(); controller.abort();
  await assert.rejects(createBackup({ cwd, input, local: true, dump, encrypt, signal: controller.signal }));
  assert.deepEqual(await readdir(path.join(cwd, ".backups")), []);
  await assert.rejects(transfer({ producer: node("setInterval(()=>{},1000)"), output: new Writable({ write(chunk, encoding, cb) { cb(); } }), env: databaseEnvironment(input, { local: true }), timeoutMs: 100 }), /failed or was cancelled/);
});

test("byte limiter rejects oversized streams and a missing recipient leaves no backup", async t => {
  const cwd = await temporary(t);
  await assert.rejects(pipeline(Readable.from([Buffer.alloc(20)]), boundedBytes(10), new Writable({ write(chunk, encoding, cb) { cb(); } })), /limit/);
  await assert.rejects(createBackup({ cwd, input: { ...input, BACKUP_AGE_RECIPIENT: "" }, local: true }), /public age/);
  assert.deepEqual(await readdir(cwd), []);
});

test("automated restore refuses a real-data manifest even on localhost", async t => {
  const cwd = await temporary(t), directory = await createBackup({ cwd, input, local: true, dump, encrypt });
  const file = path.join(directory, "manifest.json"), manifest = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify({ ...manifest, synthetic: false }));
  await assert.rejects(restoreLocalBackup({ directory, input }), /synthetic drill archives/);
});

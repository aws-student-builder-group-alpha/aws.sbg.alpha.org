import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

export const postgresImage = "postgres:17.11@sha256:3518071376d0b6156b02e1db2747a78511b5b9dc3763cc79c506ebe2dc2ee71c";
export const backupSchemas = ["public", "private", "auth", "supabase_migrations"];
export const maxBackupBytes = 512 * 1024 * 1024;

export function databaseEnvironment(input = process.env, { local = false } = {}) {
  const { BACKUP_PGHOST: host, BACKUP_PGPORT: port = "5432", BACKUP_PGUSER: user, BACKUP_PGPASSWORD: password, BACKUP_PGDATABASE: database = "postgres" } = input;
  if (!host || !user || !password || !/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) throw Error("Set the BACKUP_PGHOST, BACKUP_PGPORT, BACKUP_PGUSER and BACKUP_PGPASSWORD connection values.");
  if (local) {
    if (!["localhost", "127.0.0.1", "::1"].includes(host) || !/^alpha_restore_[a-z0-9_]+$/.test(database)) throw Error("Restore drills require localhost and a new alpha_restore_ database.");
  } else {
    const ref = input.BACKUP_PROJECT_REF;
    if (!/^[a-z]{20}$/.test(ref ?? "") || database !== "postgres" || !((host === `db.${ref}.supabase.co` && user === "postgres") || (/^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${ref}` && port === "5432"))) throw Error("Backup connection must match BACKUP_PROJECT_REF using the direct host or session pooler.");
  }
  // Build an allowlist: database/encryption children never receive unrelated app or GitHub secrets.
  const inherited = Object.fromEntries(Object.entries(input).filter(([key]) => /^(PATH|PATHEXT|SystemRoot|WINDIR|TEMP|TMP|HOME|USERPROFILE|DOCKER_HOST|DOCKER_CONTEXT)$/i.test(key)));
  return { ...inherited, PGHOST: host, PGPORT: port, PGUSER: user, PGPASSWORD: password, PGDATABASE: database,
    PGSSLMODE: local ? "disable" : "require", PGCONNECT_TIMEOUT: "15", PGAPPNAME: "alpha-encrypted-backup", PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=600000 -c lock_timeout=10000" };
}

export function postgresCommand(tool) {
  if (!["pg_dump", "pg_restore", "psql"].includes(tool)) throw Error("Unsupported database tool.");
  return { command: "docker", args: ["run", "--rm", "--init", "--network", "host", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "-i", ...["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGSSLMODE", "PGCONNECT_TIMEOUT", "PGAPPNAME", "PGOPTIONS"].flatMap(key => ["-e", key]), postgresImage, tool] };
}

export function boundedBytes(limit = maxBackupBytes) {
  let bytes = 0;
  return new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; callback(bytes > limit ? Error("Backup exceeds the 512 MiB operational limit.") : null, chunk); } });
}

/** No child stderr/stdout diagnostics are logged: they can include connection or row data. */
export async function transfer({ producer, consumer, input, output, env, timeoutMs = 10 * 60 * 1000, signal, syntheticDiagnostics }) {
  const children = [], tasks = [], controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const launch = spec => {
    const child = spawn(spec.command, spec.args, { env, windowsHide: true, stdio: ["pipe", "pipe", syntheticDiagnostics ? "pipe" : "ignore"], signal: controller.signal });
    if (syntheticDiagnostics) child.stderr.on("data", chunk => syntheticDiagnostics(chunk));
    children.push(child);
    const done = new Promise((resolve, reject) => {
      child.once("error", () => { reject(Error("Backup tool could not run; check Docker, age and configuration.")); abort(); });
      child.once("close", code => { if (code === 0) resolve(); else { reject(Error("Backup tool failed; no successful backup or restore is confirmed.")); abort(); } });
    });
    tasks.push(done); return child;
  };
  try {
    const source = producer ? launch(producer).stdout : input;
    const sinkChild = consumer ? launch(consumer) : null;
    const sink = sinkChild ? sinkChild.stdin : output;
    if (producer) children[0].stdin.end();
    if (sinkChild && output) tasks.push(pipeline(sinkChild.stdout, boundedBytes(), output, { signal: controller.signal }));
    else if (sinkChild) sinkChild.stdout.resume();
    tasks.push(pipeline(source, boundedBytes(), sink, { signal: controller.signal }));
    await Promise.all(tasks);
  } catch {
    abort(); await Promise.allSettled(tasks);
    throw Error("Backup transfer failed or was cancelled. No successful result is confirmed; check tools and connection settings privately.");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

export async function ciphertextHash(file) {
  const hash = createHash("sha256"); for await (const chunk of createReadStream(file)) hash.update(chunk); return hash.digest("hex");
}

export async function createBackup({ cwd = process.cwd(), input = process.env, local = false, dump, encrypt, age = "age", signal, syntheticDiagnostics } = {}) {
  const env = databaseEnvironment(input, { local });
  const recipient = input.BACKUP_AGE_RECIPIENT;
  if (!/^age1[0-9a-z]{58}$/.test(recipient ?? "")) throw Error("Set BACKUP_AGE_RECIPIENT to the owner's public age encryption key; keep its private key offline.");
  const root = await realpath(cwd), base = path.join(root, ".backups");
  try { if ((await lstat(base)).isSymbolicLink()) throw Error("Backup output must not be a symlink."); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(base, { recursive: true, mode: 0o700 });
  const directory = path.join(base, new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID());
  await mkdir(directory, { mode: 0o700 });
  const partial = path.join(directory, "database.dump.age.part"), archive = path.join(directory, "database.dump.age");
  try {
    const pg = dump ?? postgresCommand("pg_dump");
    const output = createWriteStream(partial, { flags: "wx", mode: 0o600 });
    // A single pg_dump archive gives schema/data one consistent database snapshot.
    await transfer({ producer: { ...pg, args: [...pg.args, "--format=custom", "--no-owner", "--no-password", "--lock-wait-timeout=10000", ...backupSchemas.map(schema => `--schema=${schema}`)] },
      consumer: encrypt ?? { command: age, args: ["--encrypt", "--recipient", recipient] }, output, env, signal, syntheticDiagnostics: local ? syntheticDiagnostics : undefined });
    await rename(partial, archive);
    const bytes = (await stat(archive)).size;
    if (bytes < 100 || bytes > maxBackupBytes) throw Error("Encrypted backup size is invalid.");
    const manifest = { version: 1, createdAt: new Date().toISOString(), schemas: backupSchemas, postgresImage, encrypted: true, bytes, sha256: await ciphertextHash(archive), synthetic: local,
      projectRef: local ? null : input.BACKUP_PROJECT_REF, sourceCommit: /^[a-f0-9]{40}$/.test(input.GITHUB_SHA ?? "") ? input.GITHUB_SHA : null,
      recipientSha256: createHash("sha256").update(recipient).digest("hex") };
    await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    return directory;
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
}

export async function validateBackup(directory) {
  const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
  const archive = path.join(directory, "database.dump.age");
  if (manifest.version !== 1 || manifest.encrypted !== true || JSON.stringify(manifest.schemas) !== JSON.stringify(backupSchemas) || !/^[a-f0-9]{64}$/.test(manifest.sha256 ?? "") || manifest.bytes !== (await stat(archive)).size || manifest.bytes < 100 || manifest.bytes > maxBackupBytes || manifest.sha256 !== await ciphertextHash(archive)) throw Error("Backup manifest or ciphertext integrity check failed.");
  return { manifest, archive };
}

/** Deliberately supports synthetic localhost drills only. Managed Supabase recovery is owner-operated. */
export async function restoreLocalBackup({ directory, identity, replayFile, input, age = "age", restore, replay, signal, syntheticDiagnostics }) {
  const env = databaseEnvironment(input, { local: true });
  const { manifest, archive } = await validateBackup(directory);
  if (manifest.synthetic !== true) throw Error("Automated restore accepts only synthetic drill archives; use the owner recovery runbook for real data.");
  await stat(identity); await stat(replayFile);
  const temporary = await mkdtemp(path.join(tmpdir(), "alpha-restore-")), plaintext = path.join(temporary, "archive.dump");
  try {
    await transfer({ producer: { command: age, args: ["--decrypt", "--identity", identity, archive] }, output: createWriteStream(plaintext, { flags: "wx", mode: 0o600 }), env, signal, syntheticDiagnostics });
    // Authenticate the complete age stream before giving SQL to a database process.
    const pg = restore ?? postgresCommand("pg_restore");
    const writeEnv = { ...env, PGOPTIONS: "-c statement_timeout=600000 -c lock_timeout=10000" };
    await transfer({ input: createReadStream(plaintext), consumer: { ...pg, args: [...pg.args, "--no-owner", "--exit-on-error", "--single-transaction", "--no-password", "--dbname", env.PGDATABASE] }, env: writeEnv, signal, syntheticDiagnostics });
    const sql = replay ?? postgresCommand("psql");
    await transfer({ input: createReadStream(replayFile), consumer: { ...sql, args: [...sql.args, "--no-password", "--no-psqlrc", "--single-transaction", "--set=ON_ERROR_STOP=1"] }, env: writeEnv, signal, syntheticDiagnostics });
    return { restored: true, deletionsReplayed: true, synthetic: true };
  } finally {
    if (!path.basename(temporary).startsWith("alpha-restore-") || path.dirname(temporary) !== path.resolve(tmpdir())) throw Error("Unexpected restore temporary path.");
    await rm(temporary, { recursive: true, force: true });
  }
}

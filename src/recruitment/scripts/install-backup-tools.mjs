import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

if (process.platform !== "linux" || process.arch !== "x64") throw Error("The workflow installer supports Linux x64; install age 1.3.2 manually on other platforms.");
const directory = path.resolve(".next", "backup-tools");
await mkdir(directory, { recursive: true });
const response = await fetch("https://github.com/FiloSottile/age/releases/download/v1.3.2/age-v1.3.2-linux-amd64.tar.gz", { signal: AbortSignal.timeout(60000) });
if (!response.ok) throw Error("Official age download failed.");
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== "cbe24006683f8eb669266162894b9a522a1af52f2665fbc63a4bb032ed26ac10") throw Error("Official age archive checksum mismatch.");
const archive = path.join(directory, "age.tar.gz");
await writeFile(archive, bytes);
execFileSync("tar", ["-xzf", archive, "-C", directory], { stdio: "inherit" });
console.log("Verified age 1.3.2 installed.");

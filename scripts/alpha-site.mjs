import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2];
if (!["dev", "build", "start"].includes(mode)) {
  throw new Error("Choose dev, build or start.");
}
const projects = [root, path.join(root, "apps/recruitment")];
for (const project of projects) {
  if (!existsSync(path.join(project, "node_modules/next/dist/bin/next"))) {
    throw new Error(`Install locked dependencies with npm ci in ${project}`);
  }
}
const children = new Set();
let stopping = false;
function stop() {
  stopping = true;
  for (const child of children) child.kill();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

function run(project, port) {
  const args = mode === "build" ? ["build", "--webpack"] : [mode, "-H", "127.0.0.1", "-p", String(port)];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(project, "node_modules/next/dist/bin/next"), ...args], {
      cwd: project,
      stdio: "inherit",
      env: { ...process.env, NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW: "1", NEXT_PUBLIC_ENABLE_STATIC_EXPORT: "false" },
    });
    children.add(child);
    child.once("error", reject);
    child.once("exit", code => {
      children.delete(child);
      if (code === 0 || stopping) resolve();
      else reject(new Error(`${path.basename(project)} ${mode} exited with ${code}`));
    });
  });
}

try {
  if (mode === "build") {
    for (const project of projects) await run(project);
  } else {
    console.log("Alpha website: http://127.0.0.1:4300 — recruitment is available at /recruitment");
    await Promise.all(projects.map((project, index) => run(project, 4300 + index)));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stop();
}

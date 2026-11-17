import { createBackup } from "./backup-tools.mjs";

const controller = new AbortController(), abort = () => controller.abort();
process.once("SIGINT", abort); process.once("SIGTERM", abort);
try {
  const directory = await createBackup({ signal: controller.signal });
  console.log("Encrypted backup completed:", directory);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { process.removeListener("SIGINT", abort); process.removeListener("SIGTERM", abort); }

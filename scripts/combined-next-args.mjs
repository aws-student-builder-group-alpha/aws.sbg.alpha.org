/** Keep the recruitment dev compiler on Webpack until its Turbopack HMR is stable. */
export function combinedNextArgs(mode, port, recruitment) {
  if (mode === "build") return ["build", "--webpack"];
  return [mode, ...(mode === "dev" && recruitment ? ["--webpack"] : []), "-H", "127.0.0.1", "-p", String(port)];
}

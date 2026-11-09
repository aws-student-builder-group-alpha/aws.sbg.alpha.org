import { recruitmentPath } from "./site-paths.ts";

export const READ_TIMEOUT_MS = 8_000;
export const COMMAND_TIMEOUT_MS = 15_000;
export const STAFF_COMMAND_TIMEOUT_MS = COMMAND_TIMEOUT_MS;

/** The deadline covers both response headers and the JSON body. */
export async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = READ_TIMEOUT_MS): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(recruitmentPath(url), { ...init, signal: controller.signal, cache: "no-store" });
    const data: unknown = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", abort);
  }
}

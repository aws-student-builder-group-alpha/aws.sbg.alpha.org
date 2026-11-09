import test from "node:test";
import assert from "node:assert/strict";
import { applicationCommand, applicationState, saveApplicantDraft } from "../lib/application-client.ts";
import { COMMAND_TIMEOUT_MS, READ_TIMEOUT_MS } from "../lib/http-request.ts";
import { validSubmission } from "./fixtures/submission.mjs";
const id = crypto.randomUUID();
const receipt = () => ({ id: crypto.randomUUID(), reference: "ALPHA-2026-ABCDEF123456", email: "applicant@example.test", data: validSubmission(), status: "Submitted", version: 1, submittedAt: "2026-11-01T00:00:00Z", withdrawnAt: null, history: [{ status: "Submitted", createdAt: "2026-11-01T00:00:00Z" }] });
const aborted = signal => new Promise((_, reject) => { if (signal.aborted) reject(new DOMException("Aborted", "AbortError")); else signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }); });
test("submission timeout retains exact retry input and validates the committed receipt", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const bodies = [], app = receipt();
  t.mock.method(globalThis, "fetch", async (_, init) => { bodies.push(JSON.parse(init.body)); return bodies.length === 1 ? aborted(init.signal) : Response.json({ ok: true, data: app }); });
  const request = { action: "submit", accountId: id, expectedVersion: 3, mutationId: crypto.randomUUID() };
  const first = applicationCommand(request);
  t.mock.timers.tick(COMMAND_TIMEOUT_MS);
  assert.equal((await first).code, "UNAVAILABLE");
  assert.deepEqual(await applicationCommand(request), { ok: true, data: app });
  assert.deepEqual(bodies[0], bodies[1]);
});
test("draft save HTTP deadline includes body parsing and preserves retry input", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const requests = [], payload = validSubmission();
  const request = { accountId: id, payload, expectedVersion: 0, mutationId: crypto.randomUUID() };
  t.mock.method(globalThis, "fetch", async (_, init) => { requests.push(JSON.parse(init.body)); return requests.length === 1 ? { ok: true, json: () => aborted(init.signal) } : Response.json({ ok: true, draft: { ...payload, profile: { ...payload.profile, email: "applicant@example.test" }, id, status: "Draft", version: 1, savedAt: "2026-10-19T00:00:00Z" } }); });
  const first = saveApplicantDraft(request);
  await Promise.resolve(); t.mock.timers.tick(COMMAND_TIMEOUT_MS);
  assert.equal((await first).code, "UNAVAILABLE");
  assert.equal((await saveApplicantDraft(request)).draft.version, 1);
  assert.deepEqual(requests[0], requests[1]);
});
test("application reads are bounded and malformed responses never become success", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", async (_, init) => aborted(init.signal));
  const first = applicationState(id); t.mock.timers.tick(READ_TIMEOUT_MS);
  assert.equal((await first).code, "UNAVAILABLE");
  for (const data of [{ ok: true, data: { status: "Accepted" } }, { ok: false, code: ["CONFLICT"], message: "Invalid" }]) {
    t.mock.method(globalThis, "fetch", async () => Response.json(data));
    assert.equal((await applicationState(id)).code, "UNAVAILABLE");
    assert.equal((await applicationCommand({})).code, "UNAVAILABLE");
  }
});

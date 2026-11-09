import test from "node:test";
import assert from "node:assert/strict";
import { fetchJson, READ_TIMEOUT_MS, STAFF_COMMAND_TIMEOUT_MS } from "../lib/http-request.ts";
import { getStaffData, postStaffChange, mergeStaffMembers } from "../lib/staff-client.ts";
import { isStaffMember } from "../lib/staff.ts";

const accountId = "00000000-0000-4000-8000-000000000001";
const member = { userId: "00000000-0000-4000-8000-000000000002", email: "evaluator@example.test", role: "evaluator", status: "active", version: 1, createdAt: "2026-10-19T00:00:00Z", updatedAt: "2026-10-19T00:00:00Z" };
const command = () => ({ action: "suspend", email: "", targetId: member.userId, role: "evaluator", expectedVersion: 1, mutationId: crypto.randomUUID(), reason: "Synthetic timeout verification" });
const aborted = signal => new Promise((_, reject) => {
  const fail = () => reject(new DOMException("Aborted", "AbortError"));
  if (signal.aborted) fail(); else signal.addEventListener("abort", fail, { once: true });
});

test("a missing acknowledgement releases the command at its deadline and preserves the exact retry", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const bodies = [], committed = new Map();
  t.mock.method(globalThis, "fetch", async (_, init) => {
    const body = JSON.parse(init.body); bodies.push(body);
    if (!committed.has(body.request.mutationId)) committed.set(body.request.mutationId, { ...member, status: "suspended", version: 2 });
    if (bodies.length === 1) return aborted(init.signal);
    return Response.json({ ok: true, data: committed.get(body.request.mutationId) });
  });
  const request = command();
  const first = postStaffChange(accountId, request);
  t.mock.timers.tick(STAFF_COMMAND_TIMEOUT_MS);
  const uncertain = await first;
  assert.equal(uncertain.ok, false); assert.equal(uncertain.code, "UNAVAILABLE");
  assert.match(uncertain.message, /may have completed/);
  const retry = await postStaffChange(accountId, request);
  assert.equal(retry.ok, true); assert.equal(retry.data.version, 2);
  assert.deepEqual(bodies[0], bodies[1]); assert.equal(committed.size, 1);
});

test("staff reads time out and can be retried without a reload", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_, init) => ++calls === 1 ? aborted(init.signal) : Response.json({ ok: true, data: [member] }));
  const first = getStaffData(accountId, "", isStaffMember);
  t.mock.timers.tick(READ_TIMEOUT_MS);
  assert.equal((await first).code, "UNAVAILABLE");
  assert.deepEqual(await getStaffData(accountId, "", isStaffMember), { ok: true, data: [member] });
});

test("the deadline includes a stalled response body, and external cancellation is forwarded", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let receivedSignal;
  t.mock.method(globalThis, "fetch", async (_, init) => {
    receivedSignal = init.signal;
    return { ok: true, json: () => aborted(init.signal) };
  });
  const body = fetchJson("/synthetic");
  await Promise.resolve();
  t.mock.timers.tick(READ_TIMEOUT_MS);
  await assert.rejects(body, { name: "AbortError" });
  assert.equal(receivedSignal.aborted, true);
  const controller = new AbortController();
  const cancelled = fetchJson("/synthetic", { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: "AbortError" });
});

test("completed requests clear their timer and malformed responses remain unavailable", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  t.mock.method(globalThis, "fetch", async (_, init) => { signal = init.signal; return Response.json({ ok: true, data: { secret: "synthetic-invalid-dto" } }); });
  assert.equal((await postStaffChange(accountId, command())).code, "UNAVAILABLE");
  t.mock.timers.tick(STAFF_COMMAND_TIMEOUT_MS);
  assert.equal(signal.aborted, false);
  assert.equal((await getStaffData(accountId, "", isStaffMember)).code, "UNAVAILABLE");
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: false, code: ["DENIED"], message: "Malformed failure" }, { status: 403 }));
  assert.equal((await postStaffChange(accountId, command())).code, "UNAVAILABLE");
});

test("conflicts and authorization failures survive transport without becoming successes", async t => {
  for (const [status, code] of [[409, "CONFLICT"], [403, "DENIED"], [403, "MFA_REQUIRED"], [401, "AUTH_REQUIRED"]]) {
    const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: false, code, message: "Synthetic rejection" }, { status }));
    assert.equal((await postStaffChange(accountId, command())).code, code);
    fetch.mock.restore();
  }
});

test("old directory responses and recorded retry results cannot downgrade a newer membership", () => {
  const newer = { ...member, version: 3, status: "revoked" };
  assert.deepEqual(mergeStaffMembers([newer], [member]), [newer]);
  assert.deepEqual(mergeStaffMembers([member], [newer]), [newer]);
  const additional = { ...member, userId: accountId };
  assert.deepEqual(mergeStaffMembers([newer], [additional]), [newer, additional]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createStaffRoute } from "./fixtures/staff-http-runtime.mjs";
const origin = "http://localhost:3000";
const accountId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const member = { userId: targetId, email: "target@example.test", role: "evaluator", status: "suspended", version: 2, createdAt: "2026-10-19", updatedAt: "2026-10-19" };
const request = () => ({ accountId, request: { action: "suspend", email: "", targetId, role: "evaluator", expectedVersion: 1, mutationId: crypto.randomUUID(), reason: "Synthetic endpoint verification" } });
async function setup(kind = "administrator", databaseCode) {
  let rpcCalls = 0;
  const session = ["anonymous", "unavailable", "unconfigured"].includes(kind) ? { kind }
    : kind === "applicant" ? { kind, identity: { id: accountId } }
    : { kind: "staff", identity: { id: kind === "other-account" ? targetId : accountId }, membership: { role: kind === "evaluator" ? "evaluator" : "administrator", status: kind === "suspended" ? "suspended" : kind === "revoked" ? "revoked" : "active" }, needsMfa: kind === "aal1", client: { rpc: async name => {
      assert.equal(name, "manage_staff_access"); rpcCalls++;
      return databaseCode ? { data: null, error: { code: databaseCode } } : { data: member, error: null };
    } } };
  const route = await createStaffRoute(async () => session, origin);
  return { post: route.POST, calls: () => rpcCalls };
}
function http(body = request(), headers = {}) {
  return new Request(origin + "/api/staff", { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
test("the actual POST handler rejects cross-origin, malformed, oversized, and unsupported requests before RPC", async () => {
  const { post, calls } = await setup();
  for (const req of [http(request(), { origin: "https://untrusted.example" }), http(request(), { origin: "" }), http("{broken"), http(request(), { "content-type": "text/plain" }), http({ ...request(), unsupported: true }), http(" ".repeat(8193))]) {
    const response = await post(req);
    assert.ok([403, 422].includes(response.status));
    assert.equal((await response.json()).ok, false);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(calls(), 0);
});
test("the actual server authorization denies anonymous, applicant, evaluator, inactive, AAL1, and changed-account sessions", async () => {
  for (const [kind, status, code] of [["anonymous", 401, "AUTH_REQUIRED"], ["applicant", 403, "DENIED"], ["evaluator", 403, "DENIED"], ["suspended", 403, "DENIED"], ["revoked", 403, "DENIED"], ["aal1", 403, "MFA_REQUIRED"], ["other-account", 403, "ACCOUNT_CHANGED"], ["unavailable", 503, "UNAVAILABLE"]]) {
    const { post, calls } = await setup(kind);
    const response = await post(http());
    assert.equal(response.status, status, kind); assert.equal((await response.json()).code, code, kind); assert.equal(calls(), 0);
  }
});
test("an active AAL2 administrator receives the narrow RPC result and command validation remains mandatory", async () => {
  const { post, calls } = await setup();
  const invalid = request(); invalid.request.reason = " ";
  assert.equal((await post(http(invalid))).status, 422); assert.equal(calls(), 0);
  const response = await post(http());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, data: member }); assert.equal(calls(), 1);
  assert.equal(response.headers.get("vary"), "Cookie");
});
test("database conflicts and permission changes use explicit HTTP errors", async () => {
  for (const [databaseCode, status, code] of [["PT409", 409, "CONFLICT"], ["40001", 409, "CONFLICT"], ["42501", 403, "DENIED"], ["P0002", 404, "NOT_FOUND"], ["23514", 422, "VALIDATION"], ["unknown", 503, "UNAVAILABLE"]]) {
    const { post } = await setup("administrator", databaseCode);
    const response = await post(http());
    assert.equal(response.status, status); assert.equal((await response.json()).code, code);
  }
});

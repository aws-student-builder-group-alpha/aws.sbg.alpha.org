import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { applicationRuntime } from "./fixtures/application-runtime.mjs";
import { validSubmission } from "./fixtures/submission.mjs";
import { isApplicationState, isSubmittedApplication } from "../lib/applications.ts";
let runtime;
before(async () => { runtime = await applicationRuntime(); await runtime.open(); });
after(async () => runtime?.db.close());
const command = (action = "submit", expectedVersion = 1) => ({ action, accountId: runtime.identity.id, expectedVersion, mutationId: crypto.randomUUID() });
const save = (data = validSubmission(), expectedVersion = 0) => runtime.post({ action: "save", request: { accountId: runtime.identity.id, payload: data, expectedVersion, mutationId: crypto.randomUUID() } });

test("application HTTP rejects origins, types, oversized streaming bodies, and unsupported commands", async () => {
  for (const [body, options, status] of [
    [command(), { headers: { origin: "https://elsewhere.example.test" } }, 403],
    [command(), { headers: { "Content-Type": "text/plain" } }, 422],
    ["{", {}, 422], [" ".repeat(73729), {}, 422],
    [{ ...command(), status: "Accepted" }, {}, 422],
    [{ action: "save", request: { secret: "unsupported" } }, {}, 422],
  ]) {
    const response = await runtime.post(body, options);
    assert.equal(response.status, status); assert.equal((await response.json()).ok, false);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal((await runtime.db.query("select count(*)::int as count from applications")).rows[0].count, 0);
});
test("application HTTP derives ownership and denies anonymous, staff, and account changes", async () => {
  for (const [kind, code] of [["anonymous","UNAUTHENTICATED"], ["staff","STAFF_ACCOUNT"], ["unavailable","UNAVAILABLE"]]) {
    runtime.setKind(kind);
    assert.equal((await (await runtime.post(command())).json()).code, code);
    assert.equal((await (await save()).json()).code, code);
  }
  runtime.setKind("authenticated");
  assert.equal((await (await runtime.post({ ...command(), accountId: crypto.randomUUID() })).json()).code, "ACCOUNT_CHANGED");
  const get = await runtime.handlers.GET(new Request("https://application.example.test/api/application?accountId=" + crypto.randomUUID()));
  assert.equal(get.status, 403);
});
test("actual route saves, validates acknowledged SQL draft, returns one canonical receipt, and withdraws once", async () => {
  const incomplete = validSubmission(); incomplete.answers.motivation = "Too short";
  assert.equal((await save(incomplete)).status, 200);
  const validation = await runtime.post(command());
  assert.equal(validation.status, 422);
  assert.ok((await validation.json()).errors.motivation);
  const input = validSubmission();
  const saved = await (await save(input, 1)).json();
  assert.equal(saved.draft.version, 2);
  assert.equal((await runtime.post(command())).status, 409);
  const submit = command("submit", 2);
  const first = await (await runtime.post(submit)).json();
  assert.equal(isSubmittedApplication(first.data), true);
  assert.deepEqual(first.data.data, input);
  assert.deepEqual(await (await runtime.post(submit)).json(), first);
  const read = await runtime.handlers.GET(new Request("https://application.example.test/api/application?accountId=" + runtime.identity.id));
  assert.equal(isApplicationState((await read.json()).data), true);
  assert.equal((await save(input, 2)).status, 410);
  const withdrawal = command("withdraw", first.data.version);
  const withdrawn = await (await runtime.post(withdrawal)).json();
  assert.equal(withdrawn.data.status, "Withdrawn");
  assert.equal(withdrawn.data.history.length, 2);
  assert.deepEqual(await (await runtime.post(withdrawal)).json(), withdrawn);
  assert.deepEqual(await (await runtime.post(submit)).json(), withdrawn);
  assert.deepEqual(Object.keys(withdrawn.data.history[0]).sort(), ["createdAt","status"]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { emptyDraftInput } from "../lib/drafts.ts";
import { createDraftSave } from "./fixtures/staff-http-runtime.mjs";

test("the draft action reports new and legacy conflicts without retrying or changing the input", async () => {
  const accountId = crypto.randomUUID();
  for (const databaseCode of ["PT409", "40001", "unknown"]) {
    let calls = 0;
    const request = { accountId, payload: { ...emptyDraftInput(), processingConsent: true }, expectedVersion: 1, mutationId: crypto.randomUUID() };
    const before = structuredClone(request);
    const save = await createDraftSave(async () => ({
      kind: "authenticated", applicant: { id: accountId, email: "applicant@example.test" },
      client: { rpc: async (name, parameters) => {
        calls++;
        assert.equal(name, "save_applicant_draft");
        assert.equal(parameters.p_mutation_id, request.mutationId);
        assert.equal(parameters.p_expected_version, request.expectedVersion);
        assert.deepEqual(parameters.p_data, request.payload);
        return { data: null, error: { code: databaseCode } };
      } },
    }));
    const result = await save(request);
    assert.equal(result.ok, false);
    assert.equal(result.code, databaseCode === "unknown" ? "UNAVAILABLE" : "CONFLICT");
    assert.match(result.message, /preserved/);
    assert.equal(calls, 1);
    assert.deepEqual(request, before);
  }
});

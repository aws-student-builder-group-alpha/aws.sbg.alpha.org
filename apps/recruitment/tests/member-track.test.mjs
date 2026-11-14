import { test } from "node:test";
import assert from "node:assert/strict";
import { applicationRuntime } from "./fixtures/application-runtime.mjs";
import { validSimplifiedSubmission } from "./fixtures/submission.mjs";
import { validateSubmission } from "../lib/applications.ts";
import { opportunities } from "../lib/catalog.ts";
import { isAvailability, availabilityLabel } from "../lib/opportunity-availability.ts";

test("general member uses normal immutable submission, enrollment, and one-account rules", async () => {
  const rt = await applicationRuntime();
  try {
    await rt.open();
    const draft = validSimplifiedSubmission();
    Object.assign(draft, { track: "MEMBER", opportunityId: "general-member", scenarioReviewedOpportunityId: "general-member" });
    draft.profile.year = "5";
    assert.deepEqual(validateSubmission(draft), {});
    const saved = await rt.rpc("save_applicant_draft", { p_data: draft, p_expected_version: 0, p_mutation_id: crypto.randomUUID() });
    assert.equal(saved.data.track, "MEMBER");
    const args = { p_expected_version: 1, p_mutation_id: crypto.randomUUID() };
    const app = await rt.rpc("submit_applicant_application", args);
    assert.equal(app.data.opportunityId, "general-member");
    assert.deepEqual(await rt.rpc("submit_applicant_application", args), app);
    await assert.rejects(rt.rpc("save_applicant_draft", { p_data: draft, p_expected_version: 1, p_mutation_id: crypto.randomUUID() }));
    const capacity = (await rt.db.query("select capacity from opportunity_capacities where opportunity_id='general-member'")).rows[0];
    assert.equal(capacity.capacity, null);
    await assert.rejects(rt.db.exec("update opportunity_capacities set capacity=null where opportunity_id='core-finance'"));
  } finally { await rt.db.close(); }
});

test("anonymous vacancy gateway exposes only bounded catalog aggregates", async () => {
  const rt = await applicationRuntime();
  try {
    const data = await rt.db.transaction(async tx => { await tx.exec("set local role anon"); return (await tx.query("select opportunity_availability() as value")).rows[0].value; });
    assert.ok(isAvailability(data));
    assert.equal(availabilityLabel(data, "general-member"), "No fixed limit");
    assert.equal(availabilityLabel(data, "committee-finance"), "8 places remaining");
    assert.equal(availabilityLabel(null, "committee-finance"), "Vacancies temporarily unavailable");
    assert.deepEqual(Object.keys(data).sort(), ["items", "updatedAt"]);
    assert.ok(data.items.every(item => Object.keys(item).sort().join() === "capacity,id,remaining"));
    assert.equal(data.items.length, opportunities.length);
    await assert.rejects(rt.db.transaction(async tx => { await tx.exec("set local role anon"); await tx.query("select * from applications"); }));
    assert.equal(isAvailability({ ...data, items: data.items.slice(1) }), false);
  } finally { await rt.db.close(); }
});

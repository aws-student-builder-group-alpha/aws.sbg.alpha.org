import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicationRuntime } from "./fixtures/application-runtime.mjs";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { validSimplifiedSubmission } from "./fixtures/submission.mjs";
import { validateSubmission } from "../lib/applications.ts";
import { isDraftInput, validateDraft } from "../lib/drafts.ts";
import { opportunities, getOpportunity } from "../lib/catalog.ts";
import { defaultQueueFilters, isQueueFilters } from "../lib/application-queue.ts";
import { isAvailability, availabilityLabel } from "../lib/opportunity-availability.ts";

const migration = await readFile(new URL("../supabase/migrations/20261115210230_remove_member_track.sql", import.meta.url), "utf8");
const beforeRetirement = () => applicationRuntime(undefined, { throughMigration: "20261114080000_qa_member_opportunities.sql" });
const retiredDraft = () => Object.assign(validSimplifiedSubmission(), { track: "MEMBER", opportunityId: "general-member", scenarioReviewedOpportunityId: "general-member" });
const save = (rt, input) => rt.rpc("save_applicant_draft", { p_data: input, p_expected_version: 0, p_mutation_id: crypto.randomUUID() });
const retire = rt => rt.db.transaction(tx => tx.exec(migration));

async function preservedSnapshot(rt) {
  const tables = (await rt.db.query("select schemaname,tablename from pg_tables where schemaname in ('public','auth','storage') order by schemaname,tablename")).rows;
  const snapshot = {};
  for (const { schemaname, tablename } of tables) {
    if (schemaname === "public" && ["draft_opportunities", "opportunity_capacities"].includes(tablename)) continue;
    const where = tablename === "applicant_drafts" ? " where data->>'track'<>'MEMBER' and data->>'opportunityId'<>'general-member'" : "";
    snapshot[schemaname + "." + tablename] = (await rt.db.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') value from "${schemaname}"."${tablename}" t${where}`)).rows[0].value;
  }
  return snapshot;
}

test("retirement deletes the one draft and catalog entry while preserving other records and capacities", async () => {
  const rt = await beforeRetirement();
  try {
    await rt.open();
    const retiredOwner = rt.identity;
    await save(rt, retiredDraft());
    rt.setIdentity(await rt.addIdentity());
    await save(rt, validSimplifiedSubmission());
    await rt.rpc("submit_applicant_application", { p_expected_version: 1, p_mutation_id: crypto.randomUUID() });
    const other = await rt.addIdentity(); rt.setIdentity(other);
    const committee = Object.assign(validSimplifiedSubmission(), { track: "COMMITTEE", opportunityId: "committee-finance", scenarioReviewedOpportunityId: "committee-finance" });
    await save(rt, committee);
    await rt.db.query("insert into alpha_members(owner_id,full_name,position,joined_on) values($1,'Synthetic Member','Committee Member','2026-11-01')", [other.id]);
    const before = await preservedSnapshot(rt);
    await retire(rt);
    assert.deepEqual(await preservedSnapshot(rt), before);
    assert.equal((await rt.db.query("select count(*)::int total from applicant_drafts where owner_id=$1", [retiredOwner.id])).rows[0].total, 0);
    const catalog = (await rt.db.query("select id,track from draft_opportunities order by id")).rows;
    assert.deepEqual(catalog, opportunities.map(({ id, track }) => ({ id, track })).sort((a,b) => a.id.localeCompare(b.id)));
    const capacities = (await rt.db.query("select opportunity_id,capacity from opportunity_capacities order by opportunity_id")).rows;
    assert.deepEqual(capacities, opportunities.map(({ id, capacity }) => ({ opportunity_id: id, capacity })).sort((a,b) => a.opportunity_id.localeCompare(b.opportunity_id)));
    await assert.rejects(rt.db.exec("update opportunity_capacities set capacity=null where opportunity_id='core-finance'"), error => error.code === "23502");
    rt.setIdentity(retiredOwner);
    await assert.rejects(save(rt, retiredDraft()), error => error.code === "22023");
    assert.equal((await save(rt, validSimplifiedSubmission())).data.track, "CORE_TEAM", "The preserved account can start a supported application");
  } finally { await rt.db.close(); }
});

test("retirement refuses submitted Member records and rolls back without deleting their draft or catalog", async () => {
  const rt = await beforeRetirement();
  try {
    await rt.open(); await save(rt, retiredDraft());
    await rt.rpc("submit_applicant_application", { p_expected_version: 1, p_mutation_id: crypto.randomUUID() });
    const before = await preservedSnapshot(rt);
    await assert.rejects(retire(rt), /submitted applications require a separate preservation decision/);
    assert.deepEqual(await preservedSnapshot(rt), before);
    assert.equal((await rt.db.query("select count(*)::int total from draft_opportunities where id='general-member'")).rows[0].total, 1);
  } finally { await rt.db.close(); }
});

test("retirement refuses additional drafts and cross-track scenario references", async () => {
  const rt = await beforeRetirement();
  try {
    await save(rt, retiredDraft()); rt.setIdentity(await rt.addIdentity()); await save(rt, retiredDraft());
    await assert.rejects(retire(rt), /draft count exceeds the approved single draft/);
    await rt.db.query("delete from applicant_drafts where owner_id=$1", [rt.identity.id]);
    const input = validSimplifiedSubmission(); input.scenarioReviewedOpportunityId = "general-member";
    await save(rt, input);
    await assert.rejects(retire(rt), /another track references the retired scenario/);
    assert.equal((await rt.db.query("select count(*)::int total from applicant_drafts")).rows[0].total, 2);
  } finally { await rt.db.close(); }
});

test("current clients, HTTP and SQL reject the retired track and role in both form versions and staff filters", async () => {
  const rt = await evaluationRuntime();
  try {
    rt.as(await rt.addIdentity());
    const input = retiredDraft();
    assert.equal(getOpportunity("general-member"), undefined);
    assert.equal(isDraftInput(input), false); assert.ok(validateDraft(input).track); assert.ok(validateSubmission(input).track);
    for (const formVersion of [1,2]) {
      const payload = { ...input }; if (formVersion === 1) { delete payload.formVersion; delete payload.scenarioReviewedOpportunityId; }
      assert.equal((await rt.db.query("select public.valid_draft_payload($1) value", [payload])).rows[0].value, false);
      await assert.rejects(save(rt, payload), error => error.code === "22023");
    }
    const supportedTrack = { ...input, track: "COMMITTEE" };
    assert.equal((await rt.db.query("select public.valid_draft_payload($1) value", [supportedTrack])).rows[0].value, false);
    const response = await rt.applicationHandlers.POST(new Request("https://evaluations.example.test/api/application", { method: "POST", headers: { origin: "https://evaluations.example.test", "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", accountId: rt.identity.id, payload: input, expectedVersion: 0, mutationId: crypto.randomUUID() }) }));
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, "VALIDATION");
    rt.as(rt.admin);
    for (const filters of [{ ...defaultQueueFilters, track: "MEMBER" }, { ...defaultQueueFilters, opportunityId: "general-member" }]) {
      assert.equal(isQueueFilters(filters), false);
      for (const rpc of ["admin_application_queue", "admin_application_export"]) await assert.rejects(rt.rpc(rpc, { p_filters: filters }), error => error.code === "22023");
    }
  } finally { await rt.db.close(); }
});

test("anonymous vacancy gateway exposes exactly sixteen bounded aggregates and no private records", async () => {
  const rt = await applicationRuntime();
  try {
    const data = await rt.db.transaction(async tx => { await tx.exec("set local role anon"); return (await tx.query("select opportunity_availability() value")).rows[0].value; });
    assert.ok(isAvailability(data)); assert.equal(data.items.length, 16);
    assert.equal(availabilityLabel(data, "committee-finance"), "8 places remaining");
    assert.equal(availabilityLabel(null, "committee-finance"), "Vacancies temporarily unavailable");
    assert.deepEqual(Object.keys(data).sort(), ["items", "updatedAt"]);
    assert.ok(data.items.every(item => Object.keys(item).sort().join() === "capacity,id,remaining"));
    assert.equal(isAvailability({ ...data, items: data.items.map((item,index) => index ? item : { ...item, capacity: null, remaining: null }) }), false);
    assert.equal(isAvailability({ ...data, items: data.items.slice(1) }), false);
    await assert.rejects(rt.db.transaction(async tx => { await tx.exec("set local role anon"); await tx.query("select * from applications"); }));
  } finally { await rt.db.close(); }
});

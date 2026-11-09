import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { opportunities } from "../lib/catalog.ts";
import { isSubmittedApplication } from "../lib/applications.ts";
import { isDecisionState, isDecisionHistory, isDecisionReceipt } from "../lib/decisions.ts";
let rt;
before(async () => { rt = await evaluationRuntime(); });
after(async () => rt?.db.close());
const rpc = (name, args) => rt.rpc(name, args);
async function ready(review = true) {
  const created = await rt.createApplication(); rt.as(rt.admin);
  const assignment = await rpc("manage_evaluation", { p_request: { action: "assign", applicationId: created.app.id, evaluatorId: rt.first.id, expectedApplicationVersion: 1, expectedAssignmentId: null, reason: "", mutationId: crypto.randomUUID() } });
  if (review) { rt.as(rt.first); await rpc("manage_evaluation", { p_request: { action: "save_review", applicationId: created.app.id, assignmentId: assignment.assignmentId, expectedVersion: 0, recommendation: "Waitlisted", notes: "Private synthetic review", mutationId: crypto.randomUUID() } }); }
  rt.as(rt.admin); return { ...created, assignment };
}
async function request(appId, outcome = "Waitlisted", action = "publish", reason = "") {
  rt.as(rt.admin); const state = await rpc("decision_state", { p_application_id: appId });
  return { action, applicationId: appId, assignmentId: state.assignmentId, expectedApplicationVersion: state.applicationVersion, expectedReviewVersion: state.reviewVersion, outcome, reason, mutationId: crypto.randomUUID() };
}
const change = p_request => rpc("manage_decision", { p_request });
const state = applicationId => rpc("decision_state", { p_application_id: applicationId });

test("all sixteen server capacities exactly match the catalog and are inaccessible directly", async () => {
  const rows = (await rt.db.query("select opportunity_id,capacity from opportunity_capacities order by opportunity_id")).rows;
  assert.deepEqual(rows, opportunities.map(o => ({ opportunity_id: o.id, capacity: o.capacity })).sort((a,b) => a.opportunity_id.localeCompare(b.opportunity_id)));
  for (const table of ["opportunity_capacities", "decision_history", "decision_commands"]) for (const role of ["anon", "authenticated"]) {
    await assert.rejects(rt.db.transaction(async tx => { await tx.exec(`set local role ${role}`); return tx.query(`select * from ${table}`); }), e => e.code === "42501");
  }
});
test("publication requires the exact current saved review and never accepts a stale revision or generation", async () => {
  const { app, assignment } = await ready(false); const initial = await state(app.id); assert.ok(isDecisionState(initial)); assert.equal(initial.canPublish,false);
  const missing = { ...await request(app.id), expectedReviewVersion: 1 };
  await assert.rejects(change(missing), e => e.code === "PT409");
  rt.as(rt.first); await rpc("manage_evaluation", { p_request: { action:"save_review", applicationId:app.id, assignmentId:assignment.assignmentId, expectedVersion:0, recommendation:"Accepted", notes:"First", mutationId:crypto.randomUUID() } });
  const old = await request(app.id); rt.as(rt.first); await rpc("manage_evaluation", { p_request: { action:"save_review", applicationId:app.id, assignmentId:assignment.assignmentId, expectedVersion:1, recommendation:"Waitlisted", notes:"Newer", mutationId:crypto.randomUUID() } });
  rt.as(rt.admin); await assert.rejects(change(old),e=>e.code==="PT409");
  await rpc("manage_evaluation", { p_request: { action:"assign", applicationId:app.id,evaluatorId:rt.second.id,expectedApplicationVersion:2,expectedAssignmentId:assignment.assignmentId,reason:"Change evaluator",mutationId:crypto.randomUUID() } });
  await assert.rejects(change({...old,expectedReviewVersion:2}),e=>e.code==="PT409"); assert.equal((await state(app.id)).canPublish,false);
});
test("publication is independent of intake, can differ from the recommendation, and retries append only one event", async () => {
  const { app, owner } = await ready(); const req = await request(app.id,"Not Selected");
  await rt.db.exec("update recruitment_settings set intake_state='closed'");
  const result = await change(req); assert.ok(isDecisionReceipt(result)); assert.equal(result.status,"Not Selected"); assert.equal(result.applicationVersion,3);
  assert.deepEqual(await change(req),result);
  await assert.rejects(change({...req,outcome:"Waitlisted"}),e=>e.code==="22023");
  rt.as(owner); const publicApp=(await rpc("get_application_state")).application; assert.ok(isSubmittedApplication(publicApp)); assert.equal(publicApp.status,"Not Selected");
  assert.deepEqual(publicApp.data,app.data); assert.equal(publicApp.reference,app.reference); assert.equal(publicApp.history.length,3);
  assert.equal(JSON.stringify(publicApp).includes("Private synthetic review"),false);
  rt.as(rt.admin); const history=await rpc("decision_history_page",{p_application_id:app.id}); assert.ok(isDecisionHistory(history));assert.equal(history.items.length,1);assert.equal(history.items[0].reason,"");
  await rt.open?.(); await rt.db.exec("update recruitment_settings set intake_state='open'");
});
test("saved reviews stay valid after evaluator suspension; active assigned evaluators retain read-only published access", async () => {
  const { app, assignment }=await ready(); const req=await request(app.id);
  await rt.db.query("update staff_memberships set status='suspended' where user_id=$1",[rt.first.id]);
  await change(req); rt.as(rt.first); await assert.rejects(rpc("evaluation_detail",{p_application_id:app.id}),e=>e.code==="42501");
  await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.first.id]);
  const detail=await rpc("evaluation_detail",{p_application_id:app.id});assert.equal(detail.canEdit,false);assert.equal(detail.application.status,"Waitlisted");
  assert.ok((await rpc("evaluation_list")).items.some(i=>i.id===app.id));
  await assert.rejects(rpc("manage_evaluation",{p_request:{action:"save_review",applicationId:app.id,assignmentId:assignment.assignmentId,expectedVersion:1,recommendation:"Accepted",notes:"Too late",mutationId:crypto.randomUUID()}}),e=>e.code==="PT409");
  rt.as(rt.admin);await assert.rejects(rpc("manage_evaluation",{p_request:{action:"assign",applicationId:app.id,evaluatorId:rt.second.id,expectedApplicationVersion:3,expectedAssignmentId:assignment.assignmentId,reason:"Too late",mutationId:crypto.randomUUID()}}),e=>e.code==="PT409");
});
test("last-place acceptance, capacity release on amendment and withdrawal, and no automatic promotion", async () => {
  const first=await ready(),second=await ready();const a=await request(first.app.id,"Accepted"),b=await request(second.app.id,"Accepted");
  const attempts=await Promise.allSettled([change(a),change(b)]);assert.equal(attempts.filter(v=>v.status==="fulfilled").length,1);assert.equal(attempts.find(v=>v.status==="rejected").reason.detail,"CAPACITY_FULL");
  const accepted=attempts[0].status==="fulfilled"?first:second,waiting=accepted===first?second:first;
  assert.equal((await state(accepted.app.id)).accepted,1);
  const amend=await request(accepted.app.id,"Waitlisted","amend","Release place");await change(amend);
  assert.equal((await state(waiting.app.id)).status,"Under Review");assert.equal((await state(waiting.app.id)).accepted,0);
  await change(await request(waiting.app.id,"Accepted"));rt.as(waiting.owner);const withdrawn=await rpc("withdraw_applicant_application",{p_expected_version:3,p_mutation_id:crypto.randomUUID()});assert.equal(withdrawn.status,"Withdrawn");
  rt.as(rt.admin);assert.equal((await state(accepted.app.id)).accepted,0);assert.equal((await state(accepted.app.id)).status,"Waitlisted");
  await change(await request(accepted.app.id,"Accepted","amend","Fill released place"));
  rt.as(accepted.owner);await rpc("withdraw_applicant_application",{p_expected_version:5,p_mutation_id:crypto.randomUUID()});rt.as(rt.admin);
});
test("amendments require bounded nonblank reasons, preserve audit basis, and old receipts cannot alter later outcomes", async () => {
  const {app}=await ready();const publish=await request(app.id,"Waitlisted");const receipt=await change(publish);
  for(const reason of ["","\u00a0\u2003","x".repeat(501)])await assert.rejects(change(await request(app.id,"Not Selected","amend",reason)),e=>e.code==="22023");
  await assert.rejects(change(await request(app.id,"Waitlisted","amend","Same outcome")),e=>e.code==="22023");
  const amend=await request(app.id,"Not Selected","amend","Private correction reason");await change(amend);assert.deepEqual(await change(publish),receipt);
  assert.equal((await state(app.id)).status,"Not Selected");const history=await rpc("decision_history_page",{p_application_id:app.id});assert.equal(history.items.length,2);assert.equal(history.items[0].reason,"Private correction reason");
  rt.as((await rt.createApplication()).owner); await assert.rejects(rpc("decision_history_page",{p_application_id:app.id}),e=>e.code==="42501");
});
test("administrator MFA and current authority are checked before both reads and cached receipts", async () => {
  const {app,owner}=await ready();const req=await request(app.id);await change(req);
  for(const person of [rt.first,owner]){rt.as(person);await assert.rejects(state(app.id),e=>e.code==="42501");await assert.rejects(change(req),e=>e.code==="42501");}
  rt.as(rt.admin,"aal1");await assert.rejects(state(app.id),e=>e.code==="42501");await assert.rejects(change(req),e=>e.code==="42501");
  rt.as(rt.admin);await rt.db.query("update staff_memberships set status='revoked' where user_id=$1",[rt.admin.id]);await assert.rejects(change(req),e=>e.code==="42501");await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
});
test("withdrawal is terminal for all outcomes, rejects stale revisions and blocks publication or amendments", async () => {
  for(const outcome of ["Accepted","Waitlisted","Not Selected"]){const {app,owner}=await ready();const req=await request(app.id,outcome);await change(req);const amend=await request(app.id,"Waitlisted","amend","Before withdrawal");
    rt.as(owner);await assert.rejects(rpc("withdraw_applicant_application",{p_expected_version:2,p_mutation_id:crypto.randomUUID()}),e=>e.code==="PT409");await rpc("withdraw_applicant_application",{p_expected_version:3,p_mutation_id:crypto.randomUUID()});
    rt.as(rt.admin);await assert.rejects(change(amend),e=>e.code==="PT409");assert.equal((await state(app.id)).canAmend,false);rt.as(rt.first);await assert.rejects(rpc("evaluation_detail",{p_application_id:app.id}),e=>e.code==="42501");
  }
});
test("private decision history uses deterministic bounded pages without leaking into applicant history", async () => {
  const {app,owner}=await ready();await change(await request(app.id));for(let i=0;i<26;i++)await change(await request(app.id,i%2?"Waitlisted":"Not Selected","amend","Synthetic revision "+i));
  const one=await rpc("decision_history_page",{p_application_id:app.id}),two=await rpc("decision_history_page",{p_application_id:app.id,p_offset:25});assert.equal(one.items.length,25);assert.equal(one.nextOffset,25);assert.equal(two.items.length,2);assert.equal(two.nextOffset,null);
  assert.equal(new Set([...one.items,...two.items].map(e=>e.id)).size,27);
  rt.as(owner);assert.equal(JSON.stringify((await rpc("get_application_state")).application).includes("Synthetic revision"),false);
});
test("logical overlaps of publication with review, reassignment and withdrawal cannot commit incompatible transitions", async () => {
  for (const competing of ["review", "reassign", "withdraw"]) {
    const {app,owner,assignment}=await ready();const publish=await request(app.id);
    const rival=async()=>{
      if(competing==="withdraw") { rt.as(owner);return rpc("withdraw_applicant_application",{p_expected_version:2,p_mutation_id:crypto.randomUUID()}); }
      if(competing==="review") { rt.as(rt.first);return rpc("manage_evaluation",{p_request:{action:"save_review",applicationId:app.id,assignmentId:assignment.assignmentId,expectedVersion:1,recommendation:"Not Selected",notes:"Concurrent review",mutationId:crypto.randomUUID()}}); }
      rt.as(rt.admin);return rpc("manage_evaluation",{p_request:{action:"assign",applicationId:app.id,evaluatorId:rt.second.id,expectedApplicationVersion:2,expectedAssignmentId:assignment.assignmentId,reason:"Concurrent reassignment",mutationId:crypto.randomUUID()}});
    };
    // Capture actor per transaction; the shared runtime's mutable identity is only
    // a session stub. Each SQL transaction uses its explicitly supplied actor.
    const run=(person,name,args)=>rt.db.transaction(async tx=>{await tx.exec("set local role authenticated");await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[person.id,JSON.stringify({sub:person.id,aal:"aal2"})]);return (await tx.query(`select public.${name}($1) value`,[args])).rows[0].value;});
    const publishPromise=run(rt.admin,"manage_decision",publish);
    const other=await Promise.allSettled([publishPromise,rival()]);assert.equal(other.filter(v=>v.status==="fulfilled").length,1);assert.equal(other.find(v=>v.status==="rejected").reason.code,"PT409");
    rt.as(rt.admin);const detail=await rpc("evaluation_detail",{p_application_id:app.id});assert.equal(detail.application.status,"Waitlisted");assert.equal(detail.application.history.length,3);
  }
});

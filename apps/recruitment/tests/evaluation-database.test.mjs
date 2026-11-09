import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { applicationRuntime } from "./fixtures/application-runtime.mjs";
import { validSubmission } from "./fixtures/submission.mjs";
import { isEvaluationList, isEvaluationDetail, isEvaluationHistory, isEvaluationReceipt } from "../lib/evaluations.ts";
let runtime, admin, first, second, outsider;
before(async()=>{
  runtime=await applicationRuntime();await runtime.open();
  [admin,first,second,outsider]=await Promise.all(Array.from({length:4},()=>runtime.addIdentity()));
  for(const [id,role] of [[admin.id,"administrator"],[first.id,"evaluator"],[second.id,"evaluator"],[outsider.id,"evaluator"]])await runtime.db.query("insert into staff_memberships(user_id,role,status) values($1,$2,'active')",[id,role]);
});
after(async()=>runtime?.db.close());
async function call(person,name,args=[],aal="aal2",role="authenticated"){
  return runtime.db.transaction(async tx=>{
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[person?.id||"",JSON.stringify({sub:person?.id,aal})]);
    return (await tx.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args)).rows[0].value;
  });
}
async function application(){const owner=await runtime.addIdentity();runtime.setIdentity(owner);await runtime.rpc("save_applicant_draft",{p_data:validSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});return {owner,app:await runtime.rpc("submit_applicant_application",{p_expected_version:1,p_mutation_id:crypto.randomUUID()})};}
const assign=(app,evaluator=first,assignment=null,reason="",mutationId=crypto.randomUUID())=>({action:"assign",applicationId:app.id,evaluatorId:evaluator.id,expectedApplicationVersion:app.version,expectedAssignmentId:assignment,reason,mutationId});
const review=(receipt,expectedVersion=0,notes="Private synthetic notes",recommendation="Accepted")=>({action:"save_review",applicationId:receipt.applicationId,assignmentId:receipt.assignmentId,expectedVersion,notes,recommendation,mutationId:crypto.randomUUID()});
const command=(who,request)=>call(who,"manage_evaluation",[request]);
const count=async(table,applicationId)=>Number((await runtime.db.query(`select count(*)::int as n from ${table} where application_id=$1`,[applicationId])).rows[0].n);

test("assignment creates one Under Review transition while applicant DTO excludes all private data",async()=>{
  const {owner,app}=await application(),request=assign(app),result=await command(admin,request);
  assert.ok(isEvaluationReceipt(result));assert.equal(result.status,"Under Review");assert.equal(result.applicationVersion,2);assert.equal(result.reviewVersion,0);
  assert.deepEqual(await command(admin,request),result);assert.equal(await count("evaluation_assignments",app.id),1);
  const state=await call(owner,"get_application_state");assert.equal(state.application.status,"Under Review");assert.deepEqual(state.application.history.map(e=>e.status),["Submitted","Under Review"]);
  assert.deepEqual(Object.keys(state.application).sort(),["id","reference","email","data","status","version","submittedAt","withdrawnAt","history"].sort());
  const detail=await call(first,"evaluation_detail",[app.id]);assert.ok(isEvaluationDetail(detail));assert.equal(detail.review,null);
  assert.ok(isEvaluationList(await call(admin,"evaluation_list",[0,app.reference])));
  assert.ok((await call(first,"evaluation_list")).items.some(i=>i.id===app.id));
  await assert.rejects(call(second,"evaluation_detail",[app.id]),e=>e.code==="42501");
});
test("review revisions are optimistic, idempotent, bounded, and do not change public history",async()=>{
  const {app}=await application(),receipt=await command(admin,assign(app));const request=review(receipt);
  const saved=await command(first,request);assert.equal(saved.reviewVersion,1);assert.deepEqual(await command(first,request),saved);
  await assert.rejects(command(first,{...request,notes:"different payload"}),e=>e.code==="22023");
  await assert.rejects(command(first,review(receipt,0)),e=>e.code==="PT409");
  const revised=await command(first,review(receipt,1,"Revised private notes","Waitlisted"));assert.equal(revised.reviewVersion,2);
  const detail=await call(admin,"evaluation_detail",[app.id]);assert.equal(detail.review.notes,"Revised private notes");assert.equal(detail.application.version,2);assert.equal(detail.application.history.length,2);
  const history=await call(admin,"evaluation_history",[app.id,0]);assert.ok(isEvaluationHistory(history));assert.equal(history.items.filter(e=>e.kind==="review").length,2);
  for(const patch of [{notes:"x".repeat(5001)},{recommendation:"Score 100"},{expectedVersion:-1},{extra:"untrusted"}])await assert.rejects(command(first,{...review(receipt,2),...patch}),e=>e.code==="22023");
});
test("reassignment requires a reason, preserves prior reviews read-only, and requires a fresh review even on return",async()=>{
  const {app}=await application(),r=await command(admin,assign(app));const savedRequest=review(r);await command(first,savedRequest);await command(first,review(r,1,"Latest prior notes","Waitlisted"));
  const active={...app,version:2};await assert.rejects(command(admin,assign(active,second,r.assignmentId)),e=>e.code==="22023");
  const moved=await command(admin,assign(active,second,r.assignmentId,"Balance workload"));assert.equal(moved.generation,2);assert.equal(moved.reviewVersion,0);
  await assert.rejects(call(first,"evaluation_detail",[app.id]),e=>e.code==="42501");
  await assert.rejects(command(first,savedRequest),e=>e.code==="42501");
  const detail=await call(second,"evaluation_detail",[app.id]);assert.equal(detail.review,null);
  const history=await call(second,"evaluation_history",[app.id,0]);assert.equal(history.items.length,1);assert.equal(history.items[0].notes,"Latest prior notes");assert.equal(history.items[0].reason,null);
  const back=await command(admin,assign(active,first,moved.assignmentId,"Return to original evaluator"));assert.equal(back.generation,3);assert.equal((await call(first,"evaluation_detail",[app.id])).review,null);
  assert.equal((await call(admin,"evaluation_detail",[app.id])).application.history.length,2);
  const unchanged=await command(admin,assign(active,first,back.assignmentId));assert.equal(unchanged.assignmentId,back.assignmentId);assert.equal(await count("evaluation_assignments",app.id),3);
});
test("staff roles, MFA, active membership and RLS are checked before reads and retries",async()=>{
  const {owner,app}=await application(),request=assign(app),r=await command(admin,request),saved=review(r);await command(first,saved);
  await assert.rejects(call(admin,"evaluation_list",[],"aal1"),e=>e.code==="42501");
  await assert.rejects(command(first,assign({...app,version:2},second,r.assignmentId,"Forbidden")),e=>e.code==="42501");
  await assert.rejects(command(admin,review(r)),e=>e.code==="42501");
  for(const who of [owner,null])for(const name of ["evaluation_list","evaluation_detail","evaluation_history"]){await assert.rejects(call(who,name,name==="evaluation_list"?[]:[app.id],"aal1",who?"authenticated":"anon"),e=>e.code==="42501");}
  for(const table of ["evaluation_assignments","evaluation_reviews","evaluation_review_history","evaluation_commands"]){await assert.rejects(runtime.db.transaction(async tx=>{await tx.exec("set local role authenticated");return tx.query(`select * from public.${table}`);}),e=>e.code==="42501");}
  await runtime.db.query("update staff_memberships set status='suspended' where user_id=$1",[first.id]);
  await assert.rejects(command(first,saved),e=>e.code==="42501");await assert.rejects(call(first,"evaluation_history",[app.id]),e=>e.code==="42501");
  await assert.rejects(command(admin,assign({...app,version:2},first,r.assignmentId)),e=>e.code==="22023");
  await runtime.db.query("update staff_memberships set status='active' where user_id=$1",[first.id]);
});
test("withdrawal during review is terminal and clears evaluator access without changing snapshots",async()=>{
  const {owner,app}=await application(),r=await command(admin,assign(app));await command(first,review(r));
  await assert.rejects(call(owner,"withdraw_applicant_application",[1,crypto.randomUUID()]),e=>e.code==="PT409");
  const withdrawn=await call(owner,"withdraw_applicant_application",[2,crypto.randomUUID()]);assert.equal(withdrawn.version,3);assert.deepEqual(withdrawn.data,app.data);assert.equal(withdrawn.reference,app.reference);
  assert.deepEqual(withdrawn.history.map(e=>e.status),["Submitted","Under Review","Withdrawn"]);
  await assert.rejects(call(first,"evaluation_detail",[app.id]),e=>e.code==="42501");await assert.rejects(command(first,review(r,1)),e=>e.code==="42501");
  assert.equal((await call(first,"evaluation_list")).items.some(i=>i.id===app.id),false);
  assert.equal((await call(admin,"evaluation_detail",[app.id])).canEdit,false);
  await assert.rejects(command(admin,assign({...app,version:3},second,r.assignmentId,"Too late")),e=>e.code==="PT409");
  await assert.rejects(runtime.db.query("update applications set data=$1 where id=$2",[{...app.data,resumeUrl:"https://example.test/changed"},app.id]),e=>e.code==="42501");
});
test("overlapping assignment and review commands retain one current generation and bounded public history",async()=>{
  const {app}=await application();const attempts=await Promise.allSettled([command(admin,assign(app)),command(admin,assign(app,second))]);
  assert.equal(attempts.filter(r=>r.status==="fulfilled").length,1);assert.equal(attempts.find(r=>r.status==="rejected").reason.code,"PT409");
  const detail=await call(admin,"evaluation_detail",[app.id]),who=detail.assignment.evaluator.id===first.id?first:second,other=who===first?second:first;
  await Promise.allSettled([command(who,review({applicationId:app.id,assignmentId:detail.assignment.id})),command(admin,assign({...app,version:2},other,detail.assignment.id,"Concurrent reassignment"))]);
  const latest=await call(admin,"evaluation_detail",[app.id]);assert.equal(latest.assignment.generation,2);assert.equal(latest.review,null);assert.equal(latest.application.history.length,2);
  assert.equal(Number((await runtime.db.query("select count(*)::int n from evaluation_assignments where application_id=$1 and superseded_at is null",[app.id])).rows[0].n),1);
  // Logical overlap in a single PGlite engine is distinct from hosted multi-connection testing.
});
test("list and history use deterministic bounded pages and literal search",async()=>{
  const {app}=await application(),r=await command(admin,assign(app));let version=0;
  for(let i=0;i<27;i++){await command(first,review(r,version++,"Revision "+i));}
  const page=await call(admin,"evaluation_history",[app.id,0]);assert.equal(page.items.length,25);assert.equal(page.nextOffset,25);
  const next=await call(admin,"evaluation_history",[app.id,25]);assert.equal(next.items.length,3);assert.equal(next.nextOffset,null);
  assert.equal(new Set([...page.items,...next.items].map(e=>e.id)).size,28);
  assert.equal((await call(admin,"evaluation_list",[0,"%"])).items.length,0);
  await assert.rejects(call(admin,"evaluation_list",[-1,""]),e=>e.code==="22023");
});
test("a submitted applicant later granted staff access cannot be assigned their own application",async()=>{
  const {owner,app}=await application();await runtime.db.query("insert into staff_memberships(user_id,role,status) values($1,'evaluator','active')",[owner.id]);
  await assert.rejects(command(admin,assign(app,owner)),e=>e.code==="22023");
  assert.equal(await count("evaluation_assignments",app.id),0);
});

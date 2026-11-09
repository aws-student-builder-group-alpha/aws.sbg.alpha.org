import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { validSubmission } from "./fixtures/submission.mjs";
import { isIntakeState, isIntakeReceipt, isIntakeHistory } from "../lib/intake.ts";
let rt;
const origin="https://intake.example.test";
before(async()=>{rt=await evaluationRuntime(origin);});
after(async()=>rt?.db.close());
const state=()=>rt.rpc("intake_state");
const change=request=>rt.rpc("manage_intake",{p_request:request});
const command=async(action="pause",reason="Synthetic private intake reason")=>({action,expectedVersion:(await state()).version,reason,mutationId:crypto.randomUUID()});
// Isolated owner setup only; ordinary clients cannot edit settings or reopen Closed.
async function windowState(value="open",when="during") {
  rt.as(rt.admin);
  await rt.db.query(`update recruitment_settings set intake_state=$1,opens_at=clock_timestamp()+$2::interval,closes_at=clock_timestamp()+$3::interval`,[value,when==="before"?"1 day":"-2 days",when==="after"?"-1 day":"2 days"]);
}
const get=(values={})=>rt.intakeHandlers.GET(new Request(origin+"/api/intake?"+new URLSearchParams({accountId:rt.identity.id,...values})));
const post=(request,headers={},raw=false)=>rt.intakeHandlers.POST(new Request(origin+"/api/intake",{method:"POST",headers:{origin,"content-type":"application/json",...headers},body:raw?request:JSON.stringify({accountId:rt.identity.id,request})}));

test("intake state and empty history are admin-only, and direct settings/history/receipt reads and writes are denied",async()=>{
  assert.ok(isIntakeState(await state()));assert.deepEqual(await rt.rpc("intake_history_page"),{items:[],nextOffset:null});
  for(const table of ["recruitment_settings","intake_history","intake_commands"])for(const role of ["anon","authenticated"])for(const query of [`select * from ${table}`,`delete from ${table}`])await assert.rejects(rt.db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return tx.exec(query);}),e=>e.code==="42501");
  for(const name of ["intake_state()","intake_history_page(0)","manage_intake('{}')"])await assert.rejects(rt.db.transaction(async tx=>{await tx.exec("set local role anon");return tx.exec(`select public.${name}`);}),e=>e.code==="42501");
});
test("pause/resume respect scheduled opening and closure, increment revisions and preserve every fixed date",async()=>{
  await windowState("open","before");const before=(await rt.db.query("select opens_at,closes_at,finalized_at from recruitment_settings")).rows;
  const pause=await change(await command());assert.ok(isIntakeReceipt(pause));assert.equal((await state()).accepting,false);
  const resume=await change(await command("resume"));assert.equal(resume.version,pause.version+1);assert.equal((await state()).accepting,false);
  assert.deepEqual((await rt.db.query("select opens_at,closes_at,finalized_at from recruitment_settings")).rows,before);
  await windowState();assert.equal((await state()).accepting,true);await change(await command());assert.equal((await state()).accepting,false);await change(await command("resume"));assert.equal((await state()).accepting,true);
});
test("required reasons use Unicode code points and all command fields are closed and strictly typed",async()=>{
  const req=await command();
  for(const patch of [{reason:""},{reason:"\u00a0\u2003\ufeff"},{reason:"x".repeat(501)},{reason:3},{expectedVersion:1.5},{expectedVersion:0},{expectedVersion:2147483647},{expectedVersion:"1"},{mutationId:"bad"},{action:"reopen"},{opensAt:new Date().toISOString()},{reason:"x".repeat(9000)}])await assert.rejects(change({...req,...patch}),e=>e.code==="22023");
  await change({...req,reason:"\u{1f600}".repeat(500)});await change(await command("resume","  Trimmed private reason \u00a0"));const history=await rt.rpc("intake_history_page");assert.equal(history.items[0].reason,"Trimmed private reason");assert.ok(isIntakeHistory(history));
});
test("stale confirmations conflict; exact retry survives newer final closure without another event",async()=>{
  const stale=await command(),pause=await command();const receipt=await change(pause);
  await assert.rejects(change(stale),e=>e.code==="PT409");await assert.rejects(change({...pause,reason:"Changed payload"}),e=>e.code==="22023");
  await change(await command("close"));const count=(await rt.db.query("select count(*) n from intake_history")).rows[0].n;
  assert.deepEqual(await change(pause),receipt);assert.equal((await state()).state,"closed");assert.equal((await rt.db.query("select count(*) n from intake_history")).rows[0].n,count);
  for(const action of ["pause","resume","close"])await assert.rejects(change(await command(action)),e=>e.code==="PT409");
});
test("deadline permits final close only, including paused state; opening dates are never advanced by resume",async()=>{
  for(const value of ["open","paused"]){await windowState(value,"after");const d=await state();assert.equal(d.canPause,false);assert.equal(d.canResume,false);assert.equal(d.canClose,true);
    for(const action of ["pause","resume"])await assert.rejects(change(await command(action)),e=>e.code==="PT409");await change(await command("close"));assert.equal((await state()).canClose,false);}
});
test("current administrator, Google identity and MFA are checked before reads and cached intake receipts",async()=>{
  await windowState();const req=await command();await change(req);const applicant=await rt.addIdentity();
  for(const person of [rt.first,applicant]){rt.as(person);await assert.rejects(state(),e=>e.code==="42501");await assert.rejects(change(req),e=>e.code==="42501");await assert.rejects(rt.rpc("intake_history_page"),e=>e.code==="42501");}
  rt.as(rt.admin,"aal1");await assert.rejects(change(req),e=>e.code==="42501");rt.as(rt.admin);
  for(const status of ["suspended","revoked"]){await rt.db.query("update staff_memberships set status=$1 where user_id=$2",[status,rt.admin.id]);await assert.rejects(change(req),e=>e.code==="42501");}await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
  await rt.db.query("delete from auth.identities where user_id=$1",[rt.admin.id]);await assert.rejects(change(req),e=>e.code==="42501");await rt.db.query("insert into auth.identities values($1,'google')",[rt.admin.id]);
});
test("pause/close block new submissions while draft saving and original successful submission retry remain available",async()=>{
  await windowState();const submitted=await rt.createApplication(),owner=await rt.addIdentity();rt.as(owner);
  await rt.rpc("save_applicant_draft",{p_data:validSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});
  for(const action of ["pause","close"]){rt.as(rt.admin);await change(await command(action));rt.as(owner);
    await assert.rejects(rt.rpc("submit_applicant_application",{p_expected_version:1,p_mutation_id:crypto.randomUUID()}),e=>e.code==="PT423");
    const version=(await rt.db.query("select version from applicant_drafts where owner_id=$1",[owner.id])).rows[0].version;
    await rt.rpc("save_applicant_draft",{p_data:validSubmission(),p_expected_version:version,p_mutation_id:crypto.randomUUID()});
    const publicState=await rt.rpc("get_application_state");assert.equal(publicState.intake.state,action==="pause"?"paused":"closed");assert.equal(publicState.intake.accepting,false);assert.deepEqual(Object.keys(publicState.intake).sort(),["accepting","closesAt","opensAt","serverNow","state"]);
    assert.equal(JSON.stringify(publicState).includes("Synthetic private intake reason"),false);
    rt.as(submitted.owner);assert.equal((await rt.rpc("submit_applicant_application",{p_expected_version:1,p_mutation_id:submitted.app.submitMutationId??crypto.randomUUID()})).id,submitted.app.id);
  }
  rt.as(submitted.owner);assert.equal((await rt.rpc("withdraw_applicant_application",{p_expected_version:1,p_mutation_id:crypto.randomUUID()})).status,"Withdrawn");rt.as(rt.admin);
});
test("private future-change audit has deterministic bounded pages",async()=>{
  await windowState();for(let i=0;i<28;i++)await change(await command(i%2?"resume":"pause","Private audit "+i));
  const first=await rt.rpc("intake_history_page"),next=await rt.rpc("intake_history_page",{p_offset:first.nextOffset});assert.equal(first.items.length,25);assert.ok(next.items.length);assert.ok(first.items.at(-1).version>next.items[0].version);assert.equal(new Set([...first.items,...next.items].map(e=>e.id)).size,first.items.length+next.items.length);
  for(const p_offset of [-1,100001,null])await assert.rejects(rt.rpc("intake_history_page",{p_offset}),e=>e.code==="22023");
});
test("intake HTTP guards origin, content type, bounded streamed bodies, unknown fields and duplicate queries",async()=>{
  const req=await command();for(const [body,headers,raw,status] of [[req,{origin:"https://other.example.test"},false,403],[req,{"content-type":"text/plain"},false,422],["{",{},true,422],[" ".repeat(8193),{},true,422],[{...req,actor:rt.admin.id},{},false,422]]){const response=await post(body,headers,raw);assert.equal(response.status,status);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal(response.headers.get("vary"),"Cookie");}
  for(const values of [{mode:"unknown"},{offset:"100001"},{offset:"01"},{mode:"state",offset:"1"},{search:"x"}])assert.equal((await get(values)).status,422);
  assert.equal((await rt.intakeHandlers.GET(new Request(origin+"/api/intake?accountId="+rt.admin.id+"&accountId="+rt.admin.id))).status,422);
});
test("actual intake HTTP reauthorizes and maps acknowledged writes, conflicts and lost access",async()=>{
  const req=await command();
  for(const [kind,status] of [["anonymous",401],["unavailable",503]]){rt.setAvailability(kind);assert.equal((await get()).status,status);assert.equal((await post(req)).status,status);}
  for(const person of [rt.first,await rt.addIdentity()]){rt.as(person);assert.equal((await get()).status,403);assert.equal((await post(req)).status,403);}
  rt.as(rt.admin,"aal1");assert.equal((await post(req)).status,403);rt.as(rt.admin);assert.equal((await get({accountId:rt.first.id})).status,403);
  const response=await post(req);assert.equal(response.status,200);assert.ok(isIntakeReceipt((await response.json()).data));assert.equal((await post({...req,mutationId:crypto.randomUUID()})).status,409);assert.equal((await get({mode:"history"})).status,200);
});

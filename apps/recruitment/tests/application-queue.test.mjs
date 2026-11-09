import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { validSubmission } from "./fixtures/submission.mjs";
import { applicationStatuses } from "../lib/applications.ts";
import { defaultQueueFilters, isApplicationQueue, isQueueFilters, changeQueueTrack } from "../lib/application-queue.ts";
import { isEvaluationList } from "../lib/evaluations.ts";
let rt, rows=[];
before(async()=>{
  rt=await evaluationRuntime();
  for(let i=0;i<38;i++){
    const owner=await rt.addIdentity(),status=applicationStatuses[i%6],committee=i%2===1;
    const data={...validSubmission(),track:committee?"COMMITTEE":"CORE_TEAM",opportunityId:committee?"committee-secretariat":"core-secretariat"};
    data.profile.fullName=i===0?"Literal %_ Applicant":"Queue Applicant "+i;
    const row=(await rt.db.query("insert into applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id,status,withdrawn_at,withdraw_mutation_id,submitted_at) values($1,$2,$3,$4,'synthetic',now(),1,$5,$6,$7,$8,$9) returning id,reference",[owner.id,"ALPHA-2026-"+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),owner.email,data,crypto.randomUUID(),status,status==="Withdrawn"?new Date():null,status==="Withdrawn"?crypto.randomUUID():null,new Date(1793000000000+i*1000)])).rows[0];
    await rt.db.query("insert into application_public_history(application_id,version,status) values($1,1,$2)",[row.id,status]);
    let assignment=null,review=false;
    if(i%3!==0){assignment=crypto.randomUUID();await rt.db.query("insert into evaluation_assignments(id,application_id,generation,evaluator_id,assigned_by) values($1,$2,1,$3,$4)",[assignment,row.id,rt.first.id,rt.admin.id]);if(i%4!==0){review=true;await rt.db.query("insert into evaluation_reviews(assignment_id,recommendation,notes,version) values($1,'Waitlisted','Synthetic private notes',1)",[assignment]);}}
    rows.push({...row,owner,status,track:data.track,opportunityId:data.opportunityId,assignment,review});
  }
});
after(async()=>rt?.db.close());
const queue=(filters={},offset=0)=>rt.rpc("admin_application_queue",{p_offset:offset,p_filters:filters});
function expected(filters){return rows.filter(row=>(!filters.status||filters.status==='all'||row.status===filters.status)&&(!filters.track||filters.track==='all'||row.track===filters.track)&&(!filters.opportunityId||row.opportunityId===filters.opportunityId)&&(!filters.assignment||filters.assignment==='all'||Boolean(row.assignment)===(filters.assignment==='assigned'))&&(!filters.review||filters.review==='all'||row.review===(filters.review==='saved')));}

test("administrator queue counts cover all matching pages including Withdrawn and totals equal every status",async()=>{
  rt.as(rt.admin);const first=await queue(),second=await queue({},25);assert.ok(isEvaluationList(first));assert.ok(isApplicationQueue(first.queue));assert.equal(first.items.length,25);assert.equal(first.nextOffset,25);assert.equal(first.queue.total,38);assert.equal(second.items.length,13);assert.equal(second.nextOffset,null);assert.deepEqual(second.queue,first.queue);
  const ids=[...first.items,...second.items].map(row=>row.id);assert.equal(new Set(ids).size,38);assert.deepEqual(ids,[...rows].reverse().map(row=>row.id));assert.equal(first.queue.statusCounts.Withdrawn,6);assert.equal(Object.values(first.queue.statusCounts).reduce((sum,n)=>sum+n,0),38);
  assert.equal((await queue({},100)).items.length,0);assert.equal((await queue({},100)).queue.total,38);
});
test("status, track, opportunity, assignment and current-review filters combine identically for pages and counts",async()=>{
  for(const filters of [{status:'Accepted'},{track:'CORE_TEAM'},{track:'COMMITTEE',opportunityId:'committee-secretariat'},{assignment:'unassigned'},{assignment:'assigned',review:'missing'},{review:'saved'},{status:'Under Review',track:'COMMITTEE',assignment:'assigned',review:'saved'},{status:'Withdrawn'}]){
    const result=await queue(filters),match=expected(filters);assert.equal(result.queue.total,match.length,JSON.stringify(filters));assert.deepEqual(result.items.map(row=>row.id),[...match].reverse().slice(0,25).map(row=>row.id));for(const status of applicationStatuses)assert.equal(result.queue.statusCounts[status],match.filter(row=>row.status===status).length);assert.equal(result.queue.filters.status,filters.status??'all');
  }
});
test("search is literal and bounded; unknown values, incompatible opportunities, nulls and forged keys are rejected",async()=>{
  assert.equal((await queue({search:'%_'})).queue.total,1);assert.equal((await queue({search:rows[8].reference.toLowerCase()})).queue.total,1);assert.equal((await queue({search:rows[4].owner.email})).queue.total,1);
  const empty=await queue({search:'Not a matching applicant'});assert.equal(empty.queue.total,0);assert.equal(empty.nextOffset,null);assert.deepEqual(empty.items,[]);
  for(const filters of [null,[],{status:'Draft'},{track:'OTHER'},{opportunityId:'made-up'},{track:'CORE_TEAM',opportunityId:'committee-secretariat'},{assignment:'inactive'},{review:'previous'},{search:'x'.repeat(101)},{review:null},{actor:rt.admin.id}])await assert.rejects(queue(filters),e=>e.code==='22023');
  for(const offset of [-1,100001])await assert.rejects(queue({},offset),e=>e.code==='22023');
});
test("only current assignment reviews satisfy Saved, including after switching back; inactive assignments stay Assigned",async()=>{
  const row=rows.find(row=>row.status==='Under Review'&&row.review),old=row.assignment;
  await rt.db.query("update evaluation_assignments set superseded_at=now() where id=$1",[old]);
  const fresh=crypto.randomUUID();await rt.db.query("insert into evaluation_assignments(id,application_id,generation,evaluator_id,assigned_by) values($1,$2,2,$3,$4)",[fresh,row.id,rt.second.id,rt.admin.id]);
  assert.equal((await queue({search:row.reference,review:'saved'})).queue.total,0);assert.equal((await queue({search:row.reference,assignment:'assigned',review:'missing'})).queue.total,1);
  await rt.db.query("update staff_memberships set status='suspended' where user_id=$1",[rt.second.id]);assert.equal((await queue({search:row.reference,assignment:'assigned'})).queue.total,1);
  await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.second.id]);
});
test("administrator AAL2 and current access protect direct RPC counts and evaluator HTTP filters",async()=>{
  rt.as(rt.admin,'aal1');await assert.rejects(queue(),e=>e.code==='42501');rt.as(rt.first);await assert.rejects(queue(),e=>e.code==='42501');assert.equal((await rt.get({status:'all'})).status,403);const evaluator=(await (await rt.get()).json()).data;assert.equal(evaluator.role,'evaluator');assert.equal(evaluator.queue,undefined);
  rt.as(rows[0].owner);await assert.rejects(queue(),e=>e.code==='42501');rt.as(rt.admin);await rt.db.query("update staff_memberships set status='revoked' where user_id=$1",[rt.admin.id]);await assert.rejects(queue(),e=>e.code==='42501');await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
  await assert.rejects(rt.db.transaction(async tx=>{await tx.exec('set local role anon');return tx.query('select public.admin_application_queue()');}),e=>e.code==='42501');
});
test("actual HTTP list validates filter modes/duplicates and returns bounded no-store matching metadata",async()=>{
  rt.as(rt.admin);const response=await rt.get({status:'Accepted',track:'CORE_TEAM',review:'all'});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const list=(await response.json()).data;assert.ok(isEvaluationList(list));assert.equal(list.queue.total,expected({status:'Accepted',track:'CORE_TEAM'}).length);
  for(const values of [{status:'Draft'},{track:'x'},{opportunityId:'bad'},{review:'x'},{mode:'detail',applicationId:rows[0].id,status:'all'},{mode:'history',applicationId:rows[0].id,assignment:'all'},{track:'CORE_TEAM',opportunityId:'committee-secretariat'}])assert.equal((await rt.get(values)).status,422);
  const query=new URLSearchParams({accountId:rt.admin.id,status:'Accepted'});query.append('status','Waitlisted');assert.equal((await rt.handlers.GET(new Request('https://evaluations.example.test/api/evaluations?'+query))).status,422);
  assert.equal((await rt.get({accountId:rt.first.id})).status,403);
});
test("queue DTOs reject incomplete/wrong counts and track changes clear only incompatible opportunity choices",()=>{
  const filters={...defaultQueueFilters,track:'CORE_TEAM',opportunityId:'core-secretariat'};assert.ok(isQueueFilters(filters));assert.equal(changeQueueTrack(filters,'COMMITTEE').opportunityId,'');assert.equal(changeQueueTrack(filters,'all').opportunityId,'core-secretariat');assert.equal(isQueueFilters({...filters,track:'COMMITTEE'}),false);assert.equal(isQueueFilters({...filters,hidden:'x'}),false);
  const counts=Object.fromEntries(applicationStatuses.map(status=>[status,0]));assert.ok(isApplicationQueue({filters,total:0,statusCounts:counts}));assert.equal(isApplicationQueue({filters,total:1,statusCounts:counts}),false);assert.equal(isApplicationQueue({filters,total:0,statusCounts:{Submitted:0}}),false);
});

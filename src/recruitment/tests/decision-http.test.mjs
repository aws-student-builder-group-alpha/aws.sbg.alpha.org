import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
let rt, created, assignment;
before(async () => {
  rt=await evaluationRuntime();created=await rt.createApplication();
  assignment=await rt.rpc("manage_evaluation",{p_request:{action:"assign",applicationId:created.app.id,evaluatorId:rt.first.id,expectedApplicationVersion:1,expectedAssignmentId:null,reason:"",mutationId:crypto.randomUUID()}});
  rt.as(rt.first);await rt.rpc("manage_evaluation",{p_request:{action:"save_review",applicationId:created.app.id,assignmentId:assignment.assignmentId,expectedVersion:0,recommendation:"Waitlisted",notes:"Private synthetic notes",mutationId:crypto.randomUUID()}});rt.as(rt.admin);
});
after(async()=>rt?.db.close());
const command=()=>({action:"publish",applicationId:created.app.id,assignmentId:assignment.assignmentId,expectedApplicationVersion:2,expectedReviewVersion:1,outcome:"Accepted",reason:"",mutationId:crypto.randomUUID()});
test("decision HTTP rejects forged origin, media type, oversized chunked body, unknown keys and malformed queries",async()=>{
  for(const [body,options,status] of [[command(),{headers:{origin:"https://elsewhere.example.test"}},403],[command(),{headers:{"Content-Type":"text/plain"}},422],["{",{},422],[" ".repeat(8193),{},422],[{...command(),actor:rt.admin.id},{},422]]){
    const result=await rt.postDecision(body,options);assert.equal(result.status,status);assert.equal(result.headers.get("cache-control"),"private, no-store");assert.equal(result.headers.get("vary"),"Cookie");
  }
  for(const values of [{mode:"unknown"},{offset:"100001"},{offset:"01"},{mode:"state",offset:"1"},{search:"x"},{accountId:rt.admin.id+"&"}])assert.equal((await rt.getDecision(created.app.id,values)).status,422);
  const duplicate=new URLSearchParams({accountId:rt.admin.id,applicationId:created.app.id});duplicate.append("accountId",rt.first.id);assert.equal((await rt.decisionHandlers.GET(new Request("https://evaluations.example.test/api/decisions?"+duplicate))).status,422);
});
test("actual decision HTTP authorization denies applicants, evaluators, inactive administrators, AAL1 and changed accounts",async()=>{
  for(const [kind,status] of [["anonymous",401],["unavailable",503]]){rt.setAvailability(kind);assert.equal((await rt.getDecision(created.app.id)).status,status);assert.equal((await rt.postDecision(command())).status,status);}
  for(const person of [created.owner,rt.first]){rt.as(person);assert.equal((await rt.getDecision(created.app.id)).status,403);assert.equal((await rt.postDecision(command())).status,403);}
  rt.as(rt.admin,"aal1");assert.equal((await rt.postDecision(command())).status,403);
  rt.as(rt.admin);assert.equal((await rt.getDecision(created.app.id,{accountId:rt.first.id})).status,403);
  await rt.db.query("update staff_memberships set status='suspended' where user_id=$1",[rt.admin.id]);assert.equal((await rt.postDecision(command())).status,403);await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
});
test("HTTP publication, exact retry, amendment, private audit and final conflict use narrow results",async()=>{
  rt.as(rt.admin);const req=command(),response=await rt.postDecision(req);assert.equal(response.status,200);const result=(await response.json()).data;assert.equal(result.status,"Accepted");assert.equal(result.applicationVersion,3);
  assert.deepEqual((await (await rt.postDecision(req)).json()).data,result);
  const stale=await rt.postDecision({...req,mutationId:crypto.randomUUID()});assert.equal(stale.status,409);assert.equal((await stale.json()).code,"CONFLICT");
  const amended=await rt.postDecision({...req,action:"amend",expectedApplicationVersion:3,outcome:"Waitlisted",reason:"Private synthetic correction",mutationId:crypto.randomUUID()});assert.equal(amended.status,200);
  const history=(await (await rt.getDecision(created.app.id,{mode:"history"})).json()).data;assert.equal(history.items.length,2);assert.equal(history.items[0].reason,"Private synthetic correction");
  rt.as(created.owner);const publicApp=(await rt.rpc("get_application_state")).application;assert.equal(publicApp.status,"Waitlisted");assert.equal(JSON.stringify(publicApp).includes("Private synthetic"),false);
});
test("capacity conflict is distinguishable from a stale confirmation and cannot create decision history",async()=>{
  rt.as(rt.admin);await rt.postDecision({...command(),action:"amend",expectedApplicationVersion:4,outcome:"Accepted",reason:"Fill place",mutationId:crypto.randomUUID()});
  const other=await rt.createApplication();rt.as(rt.admin);const assigned=await rt.rpc("manage_evaluation",{p_request:{action:"assign",applicationId:other.app.id,evaluatorId:rt.first.id,expectedApplicationVersion:1,expectedAssignmentId:null,reason:"",mutationId:crypto.randomUUID()}});rt.as(rt.first);await rt.rpc("manage_evaluation",{p_request:{action:"save_review",applicationId:other.app.id,assignmentId:assigned.assignmentId,expectedVersion:0,recommendation:"Accepted",notes:"",mutationId:crypto.randomUUID()}});rt.as(rt.admin);
  const response=await rt.postDecision({...command(),applicationId:other.app.id,assignmentId:assigned.assignmentId});assert.equal(response.status,409);assert.equal((await response.json()).code,"CAPACITY_FULL");assert.equal((await rt.rpc("decision_history_page",{p_application_id:other.app.id})).items.length,0);
});

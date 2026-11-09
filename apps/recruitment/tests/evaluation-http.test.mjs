import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { isEvaluationDetail } from "../lib/evaluations.ts";
let runtime, app, owner;
before(async()=>{runtime=await evaluationRuntime();({app,owner}=await runtime.createApplication());});
after(async()=>runtime?.db.close());
const assign=()=>({action:"assign",applicationId:app.id,evaluatorId:runtime.first.id,expectedApplicationVersion:1,expectedAssignmentId:null,reason:"",mutationId:crypto.randomUUID()});
test("evaluation HTTP validates bounded streaming bodies, origins and read query parameters",async()=>{
  for(const [body,options,status] of [[assign(),{headers:{origin:"https://elsewhere.example.test"}},403],[assign(),{headers:{"Content-Type":"text/plain"}},422],["{",{},422],[" ".repeat(32769),{},422],[{...assign(),actor:runtime.admin.id},{},422]]){
    const response=await runtime.post(body,options);assert.equal(response.status,status);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal((await response.json()).ok,false);
  }
  for(const values of [{mode:"unknown"},{mode:"detail",applicationId:"bad"},{offset:"100001"},{offset:"-1"},{extra:"forged"},{mode:"history",applicationId:app.id,search:"forbidden"}])assert.equal((await runtime.get(values)).status,422);
});
test("actual server authorization denies anonymous, applicants, changed accounts and administrator AAL1",async()=>{
  for(const [availability,status] of [["anonymous",401],["unavailable",503]]){runtime.setAvailability(availability);assert.equal((await runtime.get()).status,status);assert.equal((await runtime.post(assign())).status,status);}
  runtime.as(owner);assert.equal((await runtime.get()).status,403);
  runtime.as(runtime.admin,"aal1");assert.equal((await runtime.get()).status,403);
  runtime.as(runtime.admin);assert.equal((await runtime.get({accountId:crypto.randomUUID()})).status,403);
});
test("actual HTTP assignment, fresh evaluator review, private history and stale conflict",async()=>{
  runtime.as(runtime.admin);const request=assign(),response=await runtime.post(request);assert.equal(response.status,200);const assigned=(await response.json()).data;
  assert.deepEqual((await (await runtime.post(request)).json()).data,assigned);
  const detail=await (await runtime.get({mode:"detail",applicationId:app.id})).json();assert.ok(isEvaluationDetail(detail.data));
  runtime.as(runtime.first);const save={action:"save_review",applicationId:app.id,assignmentId:assigned.assignmentId,expectedVersion:0,recommendation:"Accepted",notes:"Synthetic private notes",mutationId:crypto.randomUUID()};
  assert.equal((await runtime.post(save)).status,200);assert.equal((await runtime.post({...save,mutationId:crypto.randomUUID()})).status,409);
  runtime.as(runtime.second);assert.equal((await runtime.get({mode:"detail",applicationId:app.id})).status,403);
  assert.equal((await runtime.post(save)).status,403);
  runtime.as(runtime.admin);const history=await (await runtime.get({mode:"history",applicationId:app.id})).json();assert.equal(history.data.items.length,2);
  assert.equal((await runtime.post(save)).status,403);
});

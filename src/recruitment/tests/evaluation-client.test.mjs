import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationCommand, evaluationDetail } from "../lib/evaluation-client.ts";
import { acceptEvaluationDetail, evaluationTextLength, isEvaluationCommand } from "../lib/evaluations.ts";
const id=()=>crypto.randomUUID();
test("evaluation command deadline retains exact operation and malformed acknowledgements remain uncertain",async t=>{
  const original=globalThis.fetch;const request={action:"save_review",applicationId:id(),assignmentId:id(),expectedVersion:0,recommendation:"Accepted",notes:"Synthetic notes",mutationId:id()},sent=[];
  t.mock.timers.enable({apis:["setTimeout"]});
  try{
    globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("aborted"))));};
    const pending=evaluationCommand(id(),request);t.mock.timers.tick(15000);assert.equal((await pending).code,"UNAVAILABLE");assert.deepEqual(sent[0].request,request);
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:{forged:true}}));assert.equal((await evaluationCommand(id(),request)).code,"UNAVAILABLE");
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:"CONFLICT",message:"Reload"}),{status:409});assert.equal((await evaluationCommand(id(),request)).code,"CONFLICT");
  }finally{globalThis.fetch=original;t.mock.timers.reset();}
});
test("detail deadlines cover response bodies and preserve access errors",async t=>{
  const original=globalThis.fetch;t.mock.timers.enable({apis:["setTimeout"]});
  try{globalThis.fetch=async(_url,init)=>({ok:true,json:()=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("aborted"))))});const pending=evaluationDetail(id(),id());await Promise.resolve();t.mock.timers.tick(8000);assert.equal((await pending).code,"UNAVAILABLE");
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:"DENIED",message:"Access changed"}),{status:403});assert.equal((await evaluationDetail(id(),id())).code,"DENIED");
  }finally{globalThis.fetch=original;t.mock.timers.reset();}
});
test("assignment generations and review revisions merge monotonically; Unicode note bounds match SQL",()=>{
  const base={application:{id:id(),version:2},assignment:{id:id(),generation:2},review:{version:3}};
  assert.equal(acceptEvaluationDetail(base,{...base,assignment:{id:id(),generation:1}}),base);
  assert.equal(acceptEvaluationDetail(base,{...base,review:{version:2}}),base);
  const next={...base,assignment:{id:id(),generation:3},review:null};assert.equal(acceptEvaluationDetail(base,next),next);
  const request={action:"save_review",applicationId:id(),assignmentId:id(),expectedVersion:0,recommendation:"Waitlisted",notes:"\u{1F600}".repeat(5000),mutationId:id()};
  assert.equal(evaluationTextLength(request.notes),5000);assert.equal(isEvaluationCommand(request),true);assert.equal(isEvaluationCommand({...request,notes:request.notes+"x"}),false);
});

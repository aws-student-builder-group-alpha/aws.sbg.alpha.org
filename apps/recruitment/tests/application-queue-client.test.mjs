import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationList } from "../lib/evaluation-client.ts";
import { defaultQueueFilters } from "../lib/application-queue.ts";
import { applicationStatuses } from "../lib/applications.ts";
function list(filters){return {role:'administrator',items:[],evaluators:[],nextOffset:null,queue:{filters,total:0,statusCounts:Object.fromEntries(applicationStatuses.map(status=>[status,0]))}};}
test("queue transport sends only applied filters, rejects mismatched counts/filter responses and bounds stalled reads",async t=>{
  const original=globalThis.fetch,filters={...defaultQueueFilters,search:'Literal %_',status:'Under Review'};let requested;
  try{
    globalThis.fetch=async url=>{requested=new URL(url,'https://queue.example.test');return new Response(JSON.stringify({ok:true,data:list(filters)}));};
    assert.equal((await evaluationList(crypto.randomUUID(),25,filters.search,undefined,filters)).ok,true);assert.equal(requested.searchParams.get('status'),'Under Review');assert.equal(requested.searchParams.get('offset'),'25');assert.equal(requested.searchParams.get('search'),'Literal %_');
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:list(defaultQueueFilters)}));assert.equal((await evaluationList(crypto.randomUUID(),0,filters.search,undefined,filters)).code,'UNAVAILABLE');
    globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:{...list(filters),queue:{...list(filters).queue,total:5}}}));assert.equal((await evaluationList(crypto.randomUUID(),0,filters.search,undefined,filters)).code,'UNAVAILABLE');
    t.mock.timers.enable({apis:['setTimeout']});globalThis.fetch=async(_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted'))));const waiting=evaluationList(crypto.randomUUID(),0,'',undefined,defaultQueueFilters);t.mock.timers.tick(8000);assert.equal((await waiting).code,'UNAVAILABLE');
  }finally{globalThis.fetch=original;t.mock.timers.reset();}
});

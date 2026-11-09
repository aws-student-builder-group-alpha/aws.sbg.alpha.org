import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, createExportChunks, EXPORT_MAX_BYTES, ExportTooLarge, exportHeaders, exportFilename, philippineTimestamp } from "../lib/application-export.ts";
import { downloadApplicationExport } from "../lib/application-export-client.ts";
import { defaultQueueFilters } from "../lib/application-queue.ts";
import { validSubmission } from "./fixtures/submission.mjs";
function row(){const {profile,track,opportunityId,answers,accuracy,processingConsent,updatesConsent}=validSubmission();return {profile,track,opportunityId,answers,accuracy,processingConsent,updatesConsent,reference:"ALPHA-2026-ABCDEF012345",email:"synthetic@example.test",status:"Submitted",submittedAt:"2026-10-31T16:00:00Z",withdrawnAt:null};}
function snapshot(rows=[row()]){return {filters:defaultQueueFilters,generatedAt:"2026-10-31T16:00:00Z",total:rows.length,rows};}
function response(body="complete",patch={}){const bytes=new TextEncoder().encode(body);return new Response(bytes,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":'attachment; filename="alpha-applications-2026-20261101000000-PHT.csv"',"x-export-rows":"1","x-export-bytes":String(bytes.length),...patch}});}
test("CSV quotes cells and escapes separators, embedded quotes/newlines and neutralizes formula/control/Unicode prefixes",()=>{
 assert.equal(csvCell('Comma, "quote"\r\nnext'), '"Comma, ""quote""\r\nnext"');assert.equal(csvCell("José 雲"),'"José 雲"');assert.equal(csvCell(true),'"Yes"');
 for(const input of ["=1+1","+639000000000","-1","@SUM(A1)"," \t=cmd","\r\n=1","\u200b＝1","\ufeff＋1","\ttext"])assert.ok(csvCell(input).startsWith('"\''),input);
 assert.equal(csvCell("safe=answer"),'"safe=answer"');
});
test("CSV layout has fixed allowlisted column order, Philippine timezone, BOM, CRLF and exact byte-boundaries",()=>{
 const data=snapshot(),out=createExportChunks(data),bytes=Buffer.concat(out.chunks),text=bytes.toString("utf8");assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);assert.equal(bytes.length,out.bytes);assert.equal(text.split("\r\n").length,3);assert.ok(text.includes('"2026-11-01T00:00:00.000+08:00"'));assert.ok(text.includes('"Core Team"'));assert.equal(exportHeaders.length,30);assert.equal(exportHeaders[29],"Form version");assert.equal(philippineTimestamp(null),"");assert.equal(exportFilename(data.generatedAt),"alpha-applications-2026-20261101000000-PHT.csv");assert.equal(createExportChunks(data,out.bytes).bytes,out.bytes);assert.throws(()=>createExportChunks(data,out.bytes-1),ExportTooLarge);
 assert.throws(()=>createExportChunks(data,EXPORT_MAX_BYTES,undefined,Date.now()),/deadline/);
});
test("the actual 64 MiB CSV limit rejects oversized complete exports instead of truncating rows",()=>{
 const value=row();value.answers.motivation='"'.repeat(10000);assert.throws(()=>createExportChunks(snapshot(Array(4000).fill(value))),ExportTooLarge);assert.equal(EXPORT_MAX_BYTES,67108864);
});
test("download sends only applied filters and accepts a complete bounded CSV body",async()=>{
 const original=globalThis.fetch;let sent;
 try{globalThis.fetch=async(_url,init)=>{sent=JSON.parse(init.body);assert.equal(init.cache,"no-store");return response();};const result=await downloadApplicationExport("synthetic",{...defaultQueueFilters,status:"Withdrawn"});assert.equal(result.ok,true);assert.equal(await result.blob.text(),"complete");assert.equal(sent.filters.status,"Withdrawn");assert.deepEqual(Object.keys(sent).sort(),["accountId","filters"]);}finally{globalThis.fetch=original;}
});
test("download rejects partial bodies, oversized claims, unexpected content types and unsafe filenames",async()=>{
 const original=globalThis.fetch;
 try{for(const patch of [{"x-export-bytes":"99"},{"x-export-bytes":String(EXPORT_MAX_BYTES+1)},{"content-type":"text/html"},{"content-disposition":'attachment; filename="../../private.csv"'}]){globalThis.fetch=async()=>response("partial",patch);assert.equal((await downloadApplicationExport("synthetic",defaultQueueFilters)).code,"UNAVAILABLE");}}finally{globalThis.fetch=original;}
});
test("download bounds headers and body at fifteen seconds and preserves explicit errors and cancellation",async t=>{
 const original=globalThis.fetch;t.mock.timers.enable({apis:["setTimeout"]});
 try{globalThis.fetch=async(_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("abort"))));const pending=downloadApplicationExport("synthetic",defaultQueueFilters);t.mock.timers.tick(15000);assert.equal((await pending).code,"UNAVAILABLE");
 globalThis.fetch=async()=>{const original=response();return new Response(new ReadableStream({start(){},cancel(){return new Promise(()=>{});}}),{headers:original.headers});};const stalled=downloadApplicationExport("synthetic",defaultQueueFilters);await Promise.resolve();t.mock.timers.tick(15000);assert.equal((await stalled).code,"UNAVAILABLE");
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:"TOO_LARGE",message:"Narrow filters"}),{status:413});assert.equal((await downloadApplicationExport("synthetic",defaultQueueFilters)).code,"TOO_LARGE");
 const abort=new AbortController();globalThis.fetch=async()=>new Response(new ReadableStream({start(){}}),{headers:response().headers});const cancelled=downloadApplicationExport("synthetic",defaultQueueFilters,abort.signal);await Promise.resolve();abort.abort();assert.equal((await cancelled).code,"CANCELLED");
 }finally{globalThis.fetch=original;t.mock.timers.reset();}
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { intakeCommand, intakeState } from "../lib/intake-client.ts";
import { acceptIntakeState, isIntakeCommand, isIntakeState, intakeAvailability } from "../lib/intake.ts";
import { intakeEditorReducer as reduce, initialIntakeEditor } from "../lib/intake-workspace-state.ts";
const state=()=>({state:"open",version:1,updatedAt:"2026-10-25T00:00:00Z",serverNow:"2026-10-26T00:00:00Z",opensAt:"2026-10-31T16:00:00Z",closesAt:"2026-11-30T16:00:00Z",accepting:false,canPause:true,canResume:false,canClose:true});
const command=()=>({action:"pause",expectedVersion:1,reason:"Private reason",mutationId:crypto.randomUUID()});
test("intake transport bounds command headers and read bodies, rejects malformed success and preserves exact payload",async t=>{
 const original=globalThis.fetch;t.mock.timers.enable({apis:["setTimeout"]});const sent=[],req=command();
 try{globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("abort"))));};const pending=intakeCommand(crypto.randomUUID(),req);t.mock.timers.tick(15000);assert.equal((await pending).code,"UNAVAILABLE");assert.deepEqual(sent[0].request,req);
 globalThis.fetch=async(_url,init)=>({ok:true,json:()=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("abort"))))});const read=intakeState(crypto.randomUUID());await Promise.resolve();t.mock.timers.tick(8000);assert.equal((await read).code,"UNAVAILABLE");
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:{state:"paused"}}));assert.equal((await intakeCommand(crypto.randomUUID(),req)).code,"UNAVAILABLE");
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:"CONFLICT",message:"Changed"}),{status:409});assert.equal((await intakeCommand(crypto.randomUUID(),req)).code,"CONFLICT");
 }finally{globalThis.fetch=original;t.mock.timers.reset();}
});
test("intake contracts reject unknown transitions/fields and use Unicode bounds and consistent availability",()=>{
 assert.ok(isIntakeCommand({...command(),reason:"\u{1f600}".repeat(500)}));for(const patch of [{reason:"\u2003\ufeff"},{reason:"x".repeat(501)},{action:"reopen"},{opensAt:state().opensAt}])assert.equal(isIntakeCommand({...command(),...patch}),false);
 assert.ok(isIntakeState(state()));assert.equal(isIntakeState({...state(),accepting:true}),false);assert.equal(isIntakeState({...state(),canResume:true}),false);
});
test("public availability distinguishes scheduled opening, pause, deadline and final close without audit data",()=>{
 const d=state();assert.match(intakeAvailability(d),/not opened yet/);assert.match(intakeAvailability({...d,state:"paused"}),/paused/);assert.match(intakeAvailability({...d,serverNow:d.closesAt}),/deadline has passed/);assert.match(intakeAvailability({...d,state:"closed"}),/closed/);assert.match(intakeAvailability({...d,serverNow:d.opensAt,accepting:true}),/Submit once/);
});
test("uncertain intake operation and reason survive reconciliation, including explicit reload, until its exact receipt",()=>{
 const d=state(),req=command();let editor=reduce(initialIntakeEditor,{type:"read",data:d});editor=reduce(editor,{type:"edit",field:"action",value:"pause"});editor=reduce(editor,{type:"edit",field:"reason",value:req.reason});editor=reduce(editor,{type:"confirm",command:req});editor=reduce(editor,{type:"start",command:req});editor=reduce(editor,{type:"failure",command:true,failure:{ok:false,code:"UNAVAILABLE",message:"Unconfirmed"}});
 const closed={...d,state:"closed",version:3,canPause:false,canClose:false};editor=reduce(editor,{type:"read",data:closed,discard:true});assert.equal(editor.pending,req);assert.equal(editor.confirmation,req);assert.equal(editor.reason,req.reason);assert.equal(editor.base,d);assert.equal(reduce(editor,{type:"edit",field:"reason",value:"Changed"}),editor);
 editor=reduce(editor,{type:"saved",receipt:{state:"paused",version:2,updatedAt:d.updatedAt}});assert.equal(editor.pending,null);assert.equal(editor.data.state,"closed");assert.equal(acceptIntakeState(editor.data,d),editor.data);
});
test("stale reads cannot downgrade revisions/time; conflicts preserve reason until explicit discard",()=>{
 const d=state();let editor=reduce(initialIntakeEditor,{type:"read",data:d});editor=reduce(editor,{type:"edit",field:"reason",value:"Preserve"});editor=reduce(editor,{type:"read",data:{...d,state:"paused",version:2,canPause:false,canResume:true}});assert.equal(editor.conflict,true);assert.equal(editor.reason,"Preserve");assert.equal(editor.base,d);
 editor=reduce(editor,{type:"read",data:d,discard:true});assert.equal(editor.data.version,2);assert.equal(editor.reason,"");assert.equal(editor.conflict,false);assert.equal(acceptIntakeState(d,{...d,serverNow:d.updatedAt}),d);
});
test("intake outage hides private state without losing edits, while known access loss permanently clears and ignores late replies",()=>{
 let editor=reduce(initialIntakeEditor,{type:"read",data:state()});editor=reduce(editor,{type:"edit",field:"reason",value:"Preserve"});editor=reduce(editor,{type:"failure",failure:{ok:false,code:"UNAVAILABLE",message:"Outage"}});assert.equal(editor.verified,false);assert.equal(editor.reason,"Preserve");editor=reduce(editor,{type:"read",data:state()});assert.equal(editor.verified,true);
 editor=reduce(editor,{type:"failure",failure:{ok:false,code:"DENIED",message:"Lost access"}});assert.equal(editor.reason,"");assert.equal(editor.data,null);assert.equal(reduce(editor,{type:"read",data:state(),discard:true}),editor);assert.equal(reduce(editor,{type:"saved",receipt:{state:"open",version:2,updatedAt:state().updatedAt}}),editor);
});
test("explicit discard reload prevents a fresh edit from racing with the requested replacement",()=>{
 let editor=reduce(initialIntakeEditor,{type:"read",data:state()});editor=reduce(editor,{type:"refresh"});assert.equal(editor.verified,false);assert.equal(reduce(editor,{type:"edit",field:"reason",value:"Too early"}),editor);editor=reduce(editor,{type:"read",data:state(),discard:true});assert.equal(editor.verified,true);assert.equal(editor.reason,"");
});

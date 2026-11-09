import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionCommand, decisionState } from "../lib/decision-client.ts";
import { acceptDecisionState, isDecisionCommand } from "../lib/decisions.ts";
import { decisionEditorReducer as reduce, initialDecisionEditor } from "../lib/decision-workspace-state.ts";
const id=()=>crypto.randomUUID();
function state(){return {applicationId:id(),applicationVersion:2,status:"Under Review",assignmentId:id(),assignmentGeneration:1,reviewVersion:1,recommendation:"Accepted",capacity:1,accepted:0,canPublish:true,canAmend:false};}
function command(d=state()){return {action:"publish",applicationId:d.applicationId,assignmentId:d.assignmentId,expectedApplicationVersion:2,expectedReviewVersion:1,outcome:"Accepted",reason:"",mutationId:id()};}
test("decision transport bounds headers/body and preserves exact uncertain commands and explicit capacity errors",async t=>{
 const original=globalThis.fetch;t.mock.timers.enable({apis:["setTimeout"]});const sent=[],req=command();
 try{globalThis.fetch=async(_url,init)=>{sent.push(JSON.parse(init.body));return new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("abort"))));};const pending=decisionCommand(id(),req);t.mock.timers.tick(15000);assert.equal((await pending).code,"UNAVAILABLE");assert.deepEqual(sent[0].request,req);
 globalThis.fetch=async(_url,init)=>({ok:true,json:()=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(Error("abort"))))});const read=decisionState(id(),id());await Promise.resolve();t.mock.timers.tick(8000);assert.equal((await read).code,"UNAVAILABLE");
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,code:"CAPACITY_FULL",message:"No places"}),{status:409});assert.equal((await decisionCommand(id(),req)).code,"CAPACITY_FULL");
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:true,data:{status:"Accepted"}}));assert.equal((await decisionCommand(id(),req)).code,"UNAVAILABLE");
 }finally{globalThis.fetch=original;t.mock.timers.reset();}
});
test("amendment reasons count Unicode code points and decisions cannot introduce unapproved fields",()=>{
 const req={...command(),action:"amend",reason:"\u{1F600}".repeat(500)};assert.equal(isDecisionCommand(req),true);assert.equal(isDecisionCommand({...req,reason:req.reason+"x"}),false);assert.equal(isDecisionCommand({...req,reason:"\u00a0\u2003"}),false);assert.equal(isDecisionCommand({...req,actor:id()}),false);
});
test("newer decision/review/assignment reads cannot downgrade state or discard a frozen operation",()=>{
 const d=state(),req=command(d);let editor=reduce(initialDecisionEditor,{type:"read",data:d});editor=reduce(editor,{type:"edit",field:"outcome",value:"Accepted"});editor=reduce(editor,{type:"confirm",command:req});editor=reduce(editor,{type:"start",command:req});editor=reduce(editor,{type:"failure",command:true,failure:{ok:false,code:"UNAVAILABLE",message:"Unconfirmed"}});
 const published={...d,status:"Accepted",applicationVersion:3,accepted:1,canPublish:false,canAmend:true};editor=reduce(editor,{type:"read",data:published});assert.equal(editor.pending,req);assert.equal(editor.confirmation,req);assert.equal(editor.base,d);assert.equal(reduce(editor,{type:"edit",field:"outcome",value:"Waitlisted"}),editor);
 editor=reduce(editor,{type:"saved",receipt:{applicationId:d.applicationId,applicationVersion:3,status:"Accepted",updatedAt:new Date().toISOString()}});assert.equal(editor.pending,null);assert.equal(editor.data.status,"Accepted");assert.equal(editor.data.accepted,1);assert.equal(acceptDecisionState(editor.data,d),editor.data);
 const next={...d,assignmentId:id(),assignmentGeneration:2,reviewVersion:0};assert.equal(acceptDecisionState(next,d),next);
});
test("conflicts preserve choice/reason until discard; outages hide but denied reads clear data and cannot be revived",()=>{
 const d={...state(),status:"Waitlisted",applicationVersion:3,canPublish:false,canAmend:true};let editor=reduce(initialDecisionEditor,{type:"read",data:d});editor=reduce(editor,{type:"edit",field:"outcome",value:"Not Selected"});editor=reduce(editor,{type:"edit",field:"reason",value:"Private local correction"});const next={...d,applicationVersion:4,status:"Accepted"};editor=reduce(editor,{type:"read",data:next});assert.equal(editor.conflict,true);assert.equal(editor.reason,"Private local correction");
 editor=reduce(editor,{type:"read",data:next,discard:true});assert.equal(editor.reason,"");assert.equal(editor.conflict,false);editor=reduce(editor,{type:"edit",field:"reason",value:"Preserve"});editor=reduce(editor,{type:"failure",failure:{ok:false,code:"UNAVAILABLE",message:"Outage"}});assert.equal(editor.verified,false);assert.equal(editor.reason,"Preserve");
 editor=reduce(editor,{type:"failure",failure:{ok:false,code:"DENIED",message:"Lost access"}});assert.equal(editor.reason,"");assert.equal(editor.data,null);assert.equal(reduce(editor,{type:"read",data:next}),editor);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluationEditorReducer as reduce, initialEvaluationEditor } from "../lib/evaluation-workspace-state.ts";
const id=()=>crypto.randomUUID();
function detail(){return {role:"evaluator",application:{id:id(),version:2,status:"Under Review",history:[]},assignment:{id:id(),generation:1,evaluator:{id:id(),email:"evaluator@example.test"},assignedAt:new Date().toISOString()},review:null,canEdit:true};}
test("missing review acknowledgement freezes the exact command across reconciliation and permits same-operation acknowledgement",()=>{
  const d=detail();let state=reduce(initialEvaluationEditor,{type:"read",detail:d});state=reduce(state,{type:"edit",field:"notes",value:"Local synthetic notes"});
  const command={action:"save_review",applicationId:d.application.id,assignmentId:d.assignment.id,expectedVersion:0,mutationId:id(),notes:state.notes,recommendation:"Accepted"};
  state=reduce(state,{type:"start",command});state=reduce(state,{type:"failure",command:true,failure:{ok:false,code:"UNAVAILABLE",message:"Retry the same request"}});
  const receipt={applicationId:d.application.id,applicationVersion:2,assignmentId:d.assignment.id,generation:1,reviewVersion:1,status:"Under Review",updatedAt:new Date().toISOString()};
  state=reduce(state,{type:"read",detail:{...d,review:{version:1,recommendation:"Accepted",notes:command.notes,updatedAt:receipt.updatedAt}}});
  assert.equal(state.pending,command);assert.equal(state.notes,command.notes);assert.equal(state.baseReviewVersion,0);
  assert.equal(reduce(state,{type:"edit",field:"notes",value:"unsafe edit"}),state);
  state=reduce(state,{type:"saved",command,receipt});assert.equal(state.pending,null);assert.equal(state.detail.review.version,1);assert.equal(state.dirty,false);
});
test("newer review reads preserve unsaved text and expected revision until explicit discard",()=>{
  const d=detail();let state=reduce(initialEvaluationEditor,{type:"read",detail:d});state=reduce(state,{type:"edit",field:"notes",value:"Unsaved local text"});
  const latest={...d,review:{version:2,recommendation:"Waitlisted",notes:"Other tab's saved notes",updatedAt:new Date().toISOString()}};
  state=reduce(state,{type:"read",detail:latest});assert.equal(state.notes,"Unsaved local text");assert.equal(state.baseReviewVersion,0);assert.equal(state.conflict,true);
  state=reduce(state,{type:"read",detail:latest,discard:true});assert.equal(state.notes,latest.review.notes);assert.equal(state.baseReviewVersion,2);assert.equal(state.conflict,false);
});
test("confirmed assignment loss clears all private notes and pending commands; outage only hides until reverified",()=>{
  const d=detail();let state=reduce(initialEvaluationEditor,{type:"read",detail:d});state=reduce(state,{type:"edit",field:"notes",value:"Private text"});
  const hidden=reduce(state,{type:"failure",failure:{ok:false,code:"UNAVAILABLE",message:"Unavailable"}});assert.equal(hidden.verified,false);assert.equal(hidden.notes,"Private text");
  const cleared=reduce(hidden,{type:"failure",failure:{ok:false,code:"DENIED",message:"Assignment changed"}});assert.equal(cleared.detail,null);assert.equal(cleared.notes,"");assert.equal(cleared.pending,null);assert.equal(cleared.blocked,true);
  assert.equal(reduce(cleared,{type:"read",detail:d}),cleared);assert.equal(reduce(cleared,{type:"read",detail:d,discard:true}).blocked,false);
  const next={...d,assignment:{...d.assignment,id:id(),generation:3}};state=reduce(state,{type:"read",detail:next});assert.equal(state.notes,"");assert.equal(state.baseReviewVersion,0);assert.equal(state.dirty,false);
});

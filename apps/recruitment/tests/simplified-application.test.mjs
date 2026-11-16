import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { validSubmission, validSimplifiedSubmission } from "./fixtures/submission.mjs";
import { validateSubmission } from "../lib/applications.ts";
import { validateDraft, editableDraft, upgradeDraft } from "../lib/drafts.ts";
import { DraftSaveQueue } from "../lib/draft-save-queue.ts";
import { blockedDestination } from "../lib/application-progress.ts";
import { createExportChunks, exportHeaders, isExportSnapshot } from "../lib/application-export.ts";
let rt;
before(async()=>{ rt=await evaluationRuntime(); });
after(async()=>rt?.db.close());
const save=(data,version=0,mutation=crypto.randomUUID())=>rt.rpc("save_applicant_draft",{p_data:data,p_expected_version:version,p_mutation_id:mutation});
const submit=(version=1,mutation=crypto.randomUUID())=>rt.rpc("submit_applicant_application",{p_expected_version:version,p_mutation_id:mutation});

test("three required responses accept one word through 150 words across Unicode boundaries",async()=>{
  for(const track of ["CORE_TEAM","COMMITTEE"]){
    const data=validSimplifiedSubmission();data.track=track;data.opportunityId=track==="CORE_TEAM"?"core-secretariat":"committee-secretariat";data.scenarioReviewedOpportunityId=data.opportunityId;
    assert.deepEqual(validateSubmission(data),{});
    for(const field of ["motivation","collaboration","scenario"]){
      for(const words of [0,1,150,151]){
        data.answers[field]=Array(words).fill("学习").join("\u00a0\u2003");
        const errors=validateSubmission(data),sql=(await rt.db.query("select private.submission_errors($1) errors",[data])).rows[0].errors;
        assert.equal(Boolean(errors[field]),words===0||words===151);assert.equal(Boolean(sql[field]),Boolean(errors[field]));
      }
      data.answers[field]="My answer";
    }
  }
});
test("storage accepts unfinished v2 work, final gates retain availability, resume and scenario review",()=>{
  const data=validSimplifiedSubmission();data.answers.motivation="";data.resumeUrl="";data.scenarioReviewedOpportunityId="";
  assert.deepEqual(validateDraft(data),{});assert.equal(blockedDestination(data,5).stage,3);
  data.answers.motivation="Brief";data.scenarioReviewedOpportunityId=data.opportunityId;
  assert.equal(blockedDestination(data,5).stage,3);assert.ok(blockedDestination(data,5).errors.resumeUrl);assert.ok(validateSubmission(data).resumeUrl);
  data.resumeUrl="https://example.test/resume";assert.equal(blockedDestination(data,5),null);
  data.profile.availability=[];assert.ok(blockedDestination(data,5).errors.availabilityDays);
  assert.ok(validateDraft({...data,formVersion:3}).form);assert.ok(validateDraft({...data,unexpected:true}).form);
});
test("upgrade preserves every old string and pending save retries before writing the new shape",async()=>{
  const data=validSubmission();data.stage=4;
  const initial={...data,id:crypto.randomUUID(),version:1,savedAt:new Date().toISOString(),status:"Draft",profile:{...data.profile,email:"synthetic@example.test"}};
  const requests=[];const queue=new DraftSaveQueue("synthetic",initial,async request=>{requests.push(structuredClone(request));if(requests.length===1)return {ok:false,code:"UNAVAILABLE",message:"Uncertain"};return {ok:true,draft:{...initial,version:request.expectedVersion+1}};});
  queue.patch({portfolioUrl:"https://example.test/work"});assert.equal(await queue.save(),false);
  queue.patch(upgradeDraft(queue.getSnapshot().draft));assert.equal(await queue.save(),true);
  assert.deepEqual(requests[0],requests[1]);assert.equal(requests[0].payload.formVersion,undefined);assert.equal(requests[2].payload.formVersion,2);assert.equal(requests[2].expectedVersion,2);
  assert.deepEqual(requests[2].payload.answers,data.answers);assert.equal(requests[2].payload.profile.experience,data.profile.experience);assert.equal(requests[2].payload.stage,5);
});
test("v2 saves are monotonic; exact legacy saves work before upgrade and cannot downgrade it",async()=>{
  const owner=await rt.addIdentity();rt.as(owner);const data=validSubmission(),id=crypto.randomUUID();const first=await save(data,0,id);
  assert.deepEqual(await save(data,0,id),first);
  const upgraded=upgradeDraft({...first.data,profile:{...first.data.profile,email:owner.email}});const input=editableDraft(upgraded);
  const second=await save(input,first.version);assert.equal(second.data.formVersion,2);
  await assert.rejects(save(data,second.version),error=>error.code==="PT409");
  const result=await rt.db.transaction(async tx=>{await tx.exec("set local role authenticated");return tx.query("select public.valid_draft_payload($1) valid",[input]);});assert.equal(result.rows[0].valid,true);
});
test("v2 snapshots omit retired draft text and retries remain exact after intake closes",async()=>{
  rt.as(await rt.addIdentity());const data=validSimplifiedSubmission();data.profile.experience="Old experience";data.answers.availability="Old commitment";data.answers.pathway="Old contribution";
  await save(data);const id=crypto.randomUUID(),app=await submit(1,id);
  assert.equal(app.data.profile.experience,"");assert.equal(app.data.answers.availability,"");assert.equal(app.data.answers.pathway,"");
  const stored=(await rt.db.query("select data from applicant_drafts where owner_id=$1",[rt.identity.id])).rows[0].data;assert.equal(stored.profile.experience,data.profile.experience);
  await rt.db.exec("update recruitment_settings set intake_state='closed'");assert.deepEqual(await submit(1,id),app);await rt.db.exec("update recruitment_settings set intake_state='open'");
});
test("legacy answers above 150 words remain readable, retryable and withdrawable",async()=>{
  rt.as(await rt.addIdentity());const data=validSubmission();data.answers.scenario=Array(240).fill("learning").join(" ");await save(data);const id=crypto.randomUUID(),app=await submit(1,id);
  assert.equal(app.data.formVersion,undefined);assert.equal(app.data.answers.scenario,data.answers.scenario);assert.deepEqual(await submit(1,id),app);
  const withdrawn=await rt.rpc("withdraw_applicant_application",{p_expected_version:1,p_mutation_id:crypto.randomUUID()});assert.equal(withdrawn.status,"Withdrawn");
});
test("mixed CSV keeps original column positions and identifies form versions without review markers",async()=>{
  rt.as(rt.admin);const result=await rt.rpc("admin_application_export",{p_filters:{}});assert.equal(isExportSnapshot(result),true);
  assert.ok(result.rows.some(row=>row.formVersion===1));assert.ok(result.rows.some(row=>row.formVersion===2));assert.equal(exportHeaders.length,30);assert.equal(exportHeaders[29],"Form version");
  assert.equal(JSON.stringify(result).includes("scenarioReviewedOpportunityId"),false);
  const text=new TextDecoder().decode(Buffer.concat(createExportChunks(result).chunks));assert.match(text,/"Form version"/);assert.equal(text.includes("Old experience"),false);
});

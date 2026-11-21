import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicationRuntime } from './fixtures/application-runtime.mjs';
import { createDraftLoader } from './fixtures/staff-http-runtime.mjs';
import { validSimplifiedSubmission } from './fixtures/submission.mjs';

test('one account applies to different roles with isolated receipts, documents, withdrawals and safe retries',async()=>{
 const rt=await applicationRuntime();
 try {
  await rt.open();
  const command=(action,version,extra={})=>({action,accountId:rt.identity.id,expectedVersion:version,mutationId:crypto.randomUUID(),...extra});
  const save=async(payload,version)=>{
   const response=await rt.post({action:'save',request:{accountId:rt.identity.id,payload,expectedVersion:version,mutationId:crypto.randomUUID()}});
   assert.equal(response.status,200,JSON.stringify(await response.clone().json()));return (await response.json()).draft;
  };
  const read=async(id)=>rt.handlers.GET(new Request('https://application.example.test/recruitment/api/application?accountId='+rt.identity.id+(id?'&applicationId='+id:'')));
  const input=validSimplifiedSubmission();
  const firstDraft=await save(input,0), firstCommand=command('submit',firstDraft.version);
  const first=(await (await rt.post(firstCommand)).json()).data;
  assert.ok(first.id);
  const firstDocument=(await rt.db.query('select id,path from enrollment_documents where application_id=$1',[first.id])).rows[0];
  assert.ok(firstDocument);
  // Fresh consent starts another draft at a higher revision; previous snapshots remain immutable.
  const next=validSimplifiedSubmission();next.opportunityId='core-operations';next.scenarioReviewedOpportunityId=next.opportunityId;
  const nextDraft=await save(next,firstDraft.version);
  const consent=(await rt.db.query('select consented_at from public.applicant_drafts where owner_id=$1',[rt.identity.id])).rows[0].consented_at;
  const submittedConsent=(await rt.db.query('select consented_at from public.applications where id=$1',[first.id])).rows[0].consented_at;
  assert.ok(new Date(consent)>new Date(submittedConsent),'A new application records its new consent without changing the first snapshot');
  assert.ok(nextDraft.version>firstDraft.version);
  const secondCommand=command('submit',nextDraft.version);
  assert.equal((await rt.post(secondCommand)).status,422,'Each application needs its own enrollment document');
  const nextPath=rt.identity.id+'/'+crypto.randomUUID()+'.pdf';
  await rt.db.transaction(async tx=>{
   await tx.exec('set local role authenticated');
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[rt.identity.id]);
   await tx.query("insert into storage.objects values('alpha-enrollment',$1,'{\"size\":100,\"mimetype\":\"application/pdf\"}')",[nextPath]);
   await tx.query('select public.alpha_save_enrollment($1,$2,$3,$4)',[nextPath,'Second role proof.pdf','application/pdf',100]);
  });
  const secondResponse=await rt.post(secondCommand);assert.equal(secondResponse.status,200);
  const second=(await secondResponse.json()).data;
  assert.notEqual(first.id,second.id);assert.notEqual(first.reference,second.reference);
  const docs=(await rt.db.query('select id,application_id,path from enrollment_documents where owner_id=$1',[rt.identity.id])).rows;
  assert.equal(docs.length,2);assert.equal(docs.find(d=>d.application_id===first.id).path,firstDocument.path);
  assert.notEqual(docs[0].path,docs[1].path);
  assert.equal((await (await rt.post(firstCommand)).json()).data.id,first.id,'An old exact retry must return its own receipt');
  assert.equal((await (await read(first.id)).json()).data.application.id,first.id);
  const state=(await (await read()).json()).data;
  assert.equal(state.applications.length,2);assert.equal(state.draftSubmitted,true);
  assert.equal((await rt.post(command('withdraw',first.version))).status,409,'An old client cannot withdraw an arbitrary application');
  const withdrawal=command('withdraw',first.version,{applicationId:first.id});
  const withdrawn=(await (await rt.post(withdrawal)).json()).data;
  assert.equal(withdrawn.id,first.id);assert.equal(withdrawn.status,'Withdrawn');
  assert.deepEqual((await (await rt.post(withdrawal)).json()).data,withdrawn);
  assert.equal((await (await read(second.id)).json()).data.application.status,'Submitted');
  const duplicate=await rt.post({action:'save',request:{accountId:rt.identity.id,payload:input,expectedVersion:nextDraft.version,mutationId:crypto.randomUUID()}});
  assert.equal(duplicate.status,410,'Withdrawal does not allow another submission to the same role');
  // A stale second tab cannot overwrite the new working draft.
  const third=validSimplifiedSubmission();third.opportunityId='core-finance';third.scenarioReviewedOpportunityId=third.opportunityId;
  await save(third,nextDraft.version);
  assert.equal((await rt.post({action:'save',request:{accountId:rt.identity.id,payload:third,expectedVersion:nextDraft.version,mutationId:crypto.randomUUID()}})).status,409);
  const other=await rt.addIdentity();rt.setIdentity(other);
  assert.equal((await read(first.id)).status,404);
  const denied=await rt.post({...withdrawal,accountId:other.id,mutationId:crypto.randomUUID()});assert.equal(denied.status,404);
  const otherState=(await (await read()).json()).data;assert.deepEqual(otherState.applications,[]);
 } finally {await rt.db.close();}
});

test('a newer working draft is not hidden by an older application-state read',async()=>{
 const applicant={id:crypto.randomUUID(),email:'loader@example.test',name:'Synthetic Applicant'};
 const now=new Date().toISOString(), data=validSimplifiedSubmission();
 const application={id:crypto.randomUUID(),reference:'ALPHA-2026-AAAAAAAAAAAA',email:applicant.email,data,sourceDraftVersion:1,status:'Submitted',version:1,submittedAt:now,withdrawnAt:null,history:[{status:'Submitted',createdAt:now}]};
 const state={application,applications:[application],draftSubmitted:true,intake:{opensAt:'2026-11-01T00:00:00+08:00',closesAt:'2026-12-01T00:00:00+08:00',serverNow:now,state:'open',accepting:true}};
 let version=2;
 const row={id:crypto.randomUUID(),data,status:'Draft',updated_at:now};
 const query={select(){return this},eq(){return this},async maybeSingle(){return {data:{...row,version},error:null}}};
 const loader=await createDraftLoader(async()=>({kind:'authenticated',applicant,client:{rpc:async()=>({data:state,error:null}),from:()=>query}}));
 const next=await loader();assert.equal(next.kind,'ready');assert.equal(next.draft.version,2);
 version=1;
 const submitted=await loader();assert.equal(submitted.draft,null);assert.equal(submitted.previousDraft.version,1);
 assert.equal(submitted.applications[0].id,application.id);
});

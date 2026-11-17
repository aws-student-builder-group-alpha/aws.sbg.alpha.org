import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {applicationRuntime} from './fixtures/application-runtime.mjs';
import {validSimplifiedSubmission} from './fixtures/submission.mjs';
import {uploadType,isCalendly} from '../lib/community.ts';
let runtime,db,admin,head,other,applicant,application;
async function actor(id,query,args=[],aal='aal2',role='authenticated'){
 return db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id,JSON.stringify({sub:id,aal})]);return(await tx.query(query,args)).rows});
}
before(async()=>{
 runtime=await applicationRuntime();db=runtime.db;await runtime.open();applicant=runtime.identity;
 admin=await runtime.addIdentity();head=await runtime.addIdentity();other=await runtime.addIdentity();
 await db.query("insert into public.staff_memberships(user_id,role,status,version) values($1,'administrator','active',1),($2,'evaluator','active',1)",[admin.id,head.id]);
 await runtime.rpc('save_applicant_draft',{p_data:validSimplifiedSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});
});
after(async()=>{await db?.close()});
test('file signatures and scheduling links reject disguised or off-domain inputs',()=>{
 assert.equal(uploadType(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');assert.equal(uploadType(new TextEncoder().encode('<svg>')) ,null);assert.equal(uploadType(new TextEncoder().encode('%PDF-1.7')),'application/pdf');
 for(const value of ['https://evil.com','https://calendly.com.evil.com/a','https://a@calendly.com/a','javascript:alert(1)'])assert.equal(isCalendly(value),false);assert.equal(isCalendly('https://calendly.com/alpha/interview'),true);
});
test('proof is mandatory at the database boundary, saves require a real owned object and submission locks it',async()=>{
 await db.query('delete from public.enrollment_documents where owner_id=$1',[applicant.id]);
 await assert.rejects(runtime.rpc('submit_applicant_application',{p_expected_version:1,p_mutation_id:crypto.randomUUID()}),e=>e.code==='PT422'&&!!JSON.parse(e.detail).proofOfEnrollment);
 const path=applicant.id+'/'+crypto.randomUUID()+'.pdf';
 await assert.rejects(actor(applicant.id,'select public.alpha_save_enrollment($1,$2,$3,$4)',[path,'proof.pdf','application/pdf',100]),e=>e.code==='22023');
 await actor(applicant.id,"insert into storage.objects values('alpha-enrollment',$1,'{\"size\":100,\"mimetype\":\"application/pdf\"}')",[path]);
 await actor(applicant.id,'select public.alpha_save_enrollment($1,$2,$3,$4)',[path,'proof.pdf','application/pdf',100]);
 await actor(applicant.id,"delete from storage.objects where bucket_id='alpha-enrollment' and name=$1",[path]);
 assert.equal((await db.query('select count(*)::int as count from storage.objects where name=$1',[path])).rows[0].count,1,'Current draft proof cannot be removed behind the form');
 await db.query("delete from storage.objects where bucket_id='alpha-enrollment' and name=$1",[path]);
 await assert.rejects(runtime.rpc('submit_applicant_application',{p_expected_version:1,p_mutation_id:crypto.randomUUID()}),e=>e.code==='PT422');
 await db.query("insert into storage.objects values('alpha-enrollment',$1,'{\"size\":100,\"mimetype\":\"application/pdf\"}')",[path]);
 application=await runtime.rpc('submit_applicant_application',{p_expected_version:1,p_mutation_id:crypto.randomUUID()});
 assert.equal((await db.query('select application_id from public.enrollment_documents where owner_id=$1',[applicant.id])).rows[0].application_id,application.id);
 await assert.rejects(actor(applicant.id,'select public.alpha_save_enrollment($1,$2,$3,$4)',[path,'replacement.pdf','application/pdf',100]),e=>e.code==='42501');
 await actor(applicant.id,"delete from storage.objects where bucket_id='alpha-enrollment' and name=$1",[path]);
 assert.equal((await db.query('select count(*)::int as count from storage.objects where name=$1',[path])).rows[0].count,1,'RLS locks the submitted file');
});
test('notifications and files isolate applicants; only a current assigned head or MFA admin can review',async()=>{
 const owner=await actor(applicant.id,'select public.alpha_notifications() as value');assert.equal(owner[0].value.length,1);
 const stranger=await actor(other.id,'select public.alpha_notifications() as value');assert.equal(stranger[0].value.length,0);
 await actor(other.id,'select public.alpha_notifications($1)',[owner[0].value[0].id]);assert.equal((await actor(applicant.id,'select public.alpha_notifications() as value'))[0].value[0].read_at,null);
 await assert.rejects(actor(head.id,'select public.alpha_enrollment($1)',[application.id]),e=>e.code==='42501');
 await assert.rejects(actor(admin.id,'select public.alpha_enrollment($1)',[application.id],'aal1'),e=>e.code==='42501');
 await db.query("insert into public.evaluation_assignments(application_id,generation,evaluator_id,assigned_by) values($1,1,$2,$3)",[application.id,head.id,admin.id]);
 await db.query("update public.applications set status='Under Review',version=version+1 where id=$1",[application.id]);
 assert.ok((await actor(head.id,'select public.alpha_enrollment($1) as value',[application.id]))[0].value.path);
 await assert.rejects(actor(other.id,'select public.alpha_enrollment($1)',[application.id]),e=>e.code==='42501');
});
test('outreach enforces assignment, published outcomes, exact retries, single claim and private receipts',async()=>{
 const id=crypto.randomUUID(),args=[id,application.id,2,'interview','Interview invitation','Please choose a schedule.','https://calendly.com/alpha/interview'];
 await assert.rejects(actor(other.id,'select public.alpha_prepare_message($1,$2,$3,$4,$5,$6,$7)',args),e=>e.code==='42501');
 await assert.rejects(actor(head.id,'select public.alpha_prepare_message($1,$2,$3,$4,$5,$6,$7)',[...args.slice(0,3),'accepted',...args.slice(4)]),e=>e.code==='PT409');
 await actor(head.id,'select public.alpha_prepare_message($1,$2,$3,$4,$5,$6,$7)',args);
 await actor(head.id,'select public.alpha_prepare_message($1,$2,$3,$4,$5,$6,$7)',args);
 assert.equal((await db.query('select count(*)::int as count from public.applicant_messages where id=$1',[id])).rows[0].count,1);
 assert.equal((await actor(head.id,'select public.alpha_claim_message($1) as claimed',[id]))[0].claimed,true);assert.equal((await actor(head.id,'select public.alpha_claim_message($1) as claimed',[id]))[0].claimed,false);
 await assert.rejects(actor(head.id,"select public.alpha_finish_message($1,'sent')",[id]),e=>e.code==='42501');
 await db.query("select public.alpha_finish_message($1,'sent')",[id]);
 assert.equal((await actor(head.id,'select public.alpha_messages($1) as value',[application.id]))[0].value[0].state,'sent');
 await db.query("update public.staff_memberships set status='suspended' where user_id=$1",[head.id]);
 await assert.rejects(actor(head.id,'select public.alpha_messages($1)',[application.id]),e=>e.code==='42501');
});
test('membership is admin-issued, applicant-scoped, and cannot self-assign position or alter others; audit is private',async()=>{
 const args=[other.email,'Existing Member','Committee Member','2026-11-01','Verified existing membership','active'];
 assert.equal((await db.query('select count(*)::int as count from public.applications where owner_id=$1',[other.id])).rows[0].count,0,'An existing member does not need a recruitment application');
 await assert.rejects(actor(admin.id,'select public.alpha_issue_member($1,$2,$3,$4,$5,$6)',['not-signed-in@example.test',...args.slice(1)]),e=>e.code==='P0002');
 await assert.rejects(actor(other.id,'select public.alpha_issue_member($1,$2,$3,$4,$5,$6)',args),e=>e.code==='42501');
 await assert.rejects(actor(admin.id,'select public.alpha_issue_member($1,$2,$3,$4,$5,$6)',args,'aal1'),e=>e.code==='42501');
 const member=(await actor(admin.id,'select public.alpha_issue_member($1,$2,$3,$4,$5,$6) as value',args))[0].value;
 assert.match(member.id,/^ALPHA-\d{4}-[A-F0-9]{12}$/);
 assert.equal((await actor(applicant.id,'select public.alpha_member($1) as value',[member.id]))[0].value,null);
 await actor(other.id,'select public.alpha_update_member($1)', ['Member Corrected Name']);
 const own=(await actor(other.id,'select public.alpha_member() as value'))[0].value;assert.equal(own.full_name,'Member Corrected Name');assert.equal(own.position,'Committee Member');
 await assert.rejects(actor(other.id,"update public.alpha_members set position='President' where owner_id=$1",[other.id]),e=>e.code==='42501');
 await assert.rejects(actor(other.id,'select public.alpha_security_log()'),e=>e.code==='42501');
 assert.ok((await actor(admin.id,'select public.alpha_security_log() as value'))[0].value.some(e=>e.action==='membership.active'));
 await actor(admin.id,'select public.alpha_issue_member($1,$2,$3,$4,$5,$6)',[...args.slice(0,4),'Membership ended','revoked']);
 assert.equal((await actor(other.id,'select public.alpha_member() as value'))[0].value,null);
});

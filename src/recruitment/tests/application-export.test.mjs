import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { evaluationRuntime } from "./fixtures/evaluation-runtime.mjs";
import { validSubmission } from "./fixtures/submission.mjs";
import { applicationStatuses } from "../lib/applications.ts";
import { defaultQueueFilters } from "../lib/application-queue.ts";
import { isExportSnapshot, exportHeaders } from "../lib/application-export.ts";
let rt, rows=[];
before(async()=>{
  rt=await evaluationRuntime();
  for(let i=0;i<38;i++){
    const owner=await rt.addIdentity(),status=applicationStatuses[i%6],committee=i%2===1;
    const data={...validSubmission(),track:committee?"COMMITTEE":"CORE_TEAM",opportunityId:committee?"committee-secretariat":"core-secretariat"};
    data.profile.fullName=i===0?"Literal %_ Applicant":"Queue Applicant "+i;
    data.resumeUrl="https://evidence.example.test/private-resume";data.portfolioUrl="https://evidence.example.test/private-portfolio";
    const row=(await rt.db.query("insert into applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id,status,withdrawn_at,withdraw_mutation_id,submitted_at) values($1,$2,$3,$4,'synthetic',now(),1,$5,$6,$7,$8,$9) returning id,reference",[owner.id,"ALPHA-2026-"+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),owner.email,data,crypto.randomUUID(),status,status==="Withdrawn"?new Date():null,status==="Withdrawn"?crypto.randomUUID():null,new Date(1793000000000+i*1000)])).rows[0];
    await rt.db.query("insert into application_public_history(application_id,version,status) values($1,1,$2)",[row.id,status]);
    let assignment=null,review=false;
    if(i%3!==0){assignment=crypto.randomUUID();await rt.db.query("insert into evaluation_assignments(id,application_id,generation,evaluator_id,assigned_by) values($1,$2,1,$3,$4)",[assignment,row.id,rt.first.id,rt.admin.id]);if(i%4!==0){review=true;await rt.db.query("insert into evaluation_reviews(assignment_id,recommendation,notes,version) values($1,'Waitlisted','Synthetic private notes',1)",[assignment]);}}
    rows.push({...row,owner,status,track:data.track,opportunityId:data.opportunityId,assignment,review});
  }
});
after(async()=>rt?.db.close());

const filters=(patch={})=>({...defaultQueueFilters,...patch});
const snapshot=(patch={})=>rt.rpc("admin_application_export",{p_filters:filters(patch)});
const post=(values={},headers={},raw=false)=>rt.exportHandlers.POST(new Request("https://evaluations.example.test/api/applications/export",{method:"POST",headers:{origin:"https://evaluations.example.test","content-type":"application/json",...headers},body:raw?values:JSON.stringify({accountId:rt.identity.id,filters:filters(),...values})}));

test("export includes all filtered pages and every public status, with no draft or private/evidence data",async()=>{
 const result=await snapshot();assert.ok(isExportSnapshot(result));assert.equal(result.total,38);assert.deepEqual(result.rows.map(r=>r.reference),[...rows].reverse().map(r=>r.reference));
 const text=JSON.stringify(result);for(const secret of ["Synthetic private notes","resumeUrl","portfolioUrl","evidence.example.test","assigned_by","evaluator","mutationId","privacy_version"])assert.equal(text.includes(secret),false,secret);
 assert.ok(result.rows.some(r=>r.status==="Withdrawn"));const owner=await rt.addIdentity();rt.as(owner);await rt.rpc("save_applicant_draft",{p_data:validSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});rt.as(rt.admin);assert.equal((await snapshot()).total,38);
});
test("export and queue share exact combined filter/search semantics and stable ordering across all pages",async()=>{
 for(const patch of [{},{status:"Withdrawn"},{status:"Accepted",track:"CORE_TEAM"},{track:"COMMITTEE",assignment:"assigned",review:"saved"},{review:"missing"},{assignment:"unassigned"},{opportunityId:"committee-secretariat"},{search:"Literal %_"},{search:"no match"}]){
  const result=await snapshot(patch),page=await rt.rpc("admin_application_queue",{p_filters:filters(patch)});let items=page.items;
  if(page.nextOffset!==null)items.push(...(await rt.rpc("admin_application_queue",{p_filters:filters(patch),p_offset:page.nextOffset})).items);
  assert.equal(result.total,page.queue.total);assert.deepEqual(result.rows.map(r=>r.reference),items.map(r=>r.reference));
 }
});
test("export RPC rejects invalid filters, anonymous access, evaluator/applicant access and stale administrator authority",async()=>{
 for(const p_filters of [null,[],{status:"Draft"},{track:"x"},{search:"x".repeat(101)},{review:"no"},{unknown:"value"},{status:null},{track:"CORE_TEAM",opportunityId:"committee-secretariat"}])await assert.rejects(rt.rpc("admin_application_export",{p_filters}),e=>e.code==="22023");
 for(const person of [rt.first,rows[0].owner]){rt.as(person);await assert.rejects(snapshot(),e=>e.code==="42501");}
 rt.as(rt.admin,"aal1");await assert.rejects(snapshot(),e=>e.code==="42501");rt.as(rt.admin);
 await rt.db.query("update staff_memberships set status='revoked' where user_id=$1",[rt.admin.id]);await assert.rejects(snapshot(),e=>e.code==="42501");await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
 await assert.rejects(rt.db.transaction(async tx=>{await tx.exec("set local role anon");return tx.query("select public.admin_application_export()");}),e=>e.code==="42501");
});
test("CSV HTTP streams only the complete allowlist with download/no-store metadata and header-only empty results",async()=>{
 const response=await post();assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal(response.headers.get("vary"),"Cookie");assert.equal(response.headers.get("x-content-type-options"),"nosniff");assert.match(response.headers.get("content-disposition"),/^attachment; filename="alpha-applications-2026-\d{14}-PHT.csv"$/);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(bytes.byteLength,Number(response.headers.get("x-export-bytes")));assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);assert.equal(Number(response.headers.get("x-export-rows")),38);
 const empty=await post({filters:filters({search:"nothing matches"})});assert.equal(empty.status,200);assert.equal(empty.headers.get("x-export-rows"),"0");assert.equal((await empty.text()).split("\r\n").length,2);
});
test("actual export HTTP rejects forged origins/media types, oversize bodies, extra keys and malformed filters",async()=>{
 for(const [values,headers,raw,status] of [[{},{origin:"https://other.example.test"},false,403],[{},{"content-type":"text/plain"},false,422],["{",{},true,422],[" ".repeat(8193),{},true,422],[{actor:rt.admin.id},{},false,422],[{filters:filters({limit:1})},{},false,422],[{accountId:rt.first.id},{},false,403]])assert.equal((await post(values,headers,raw)).status,status);
 const response=await rt.exportHandlers.POST(new Request("https://evaluations.example.test/api/applications/export?limit=25",{method:"POST",headers:{origin:"https://evaluations.example.test","content-type":"application/json"},body:"{}"}));assert.equal(response.status,422);
});
test("actual export HTTP verifies Google account, active administrator role and MFA for every download",async()=>{
 for(const [availability,status] of [["anonymous",401],["unavailable",503]]){rt.setAvailability(availability);assert.equal((await post()).status,status);}
 for(const person of [rt.first,rows[0].owner]){rt.as(person);assert.equal((await post()).status,403);}
 rt.as(rt.admin,"aal1");assert.equal((await post()).status,403);rt.as(rt.admin);
 await rt.db.query("update staff_memberships set status='suspended' where user_id=$1",[rt.admin.id]);assert.equal((await post()).status,403);await rt.db.query("update staff_memberships set status='active' where user_id=$1",[rt.admin.id]);
 await rt.db.query("delete from auth.identities where user_id=$1",[rt.admin.id]);assert.equal((await post()).status,403);await rt.db.query("insert into auth.identities values($1,'google')",[rt.admin.id]);
});
test("export request-body timeout remains bounded even if stream cleanup never settles",async t=>{
 t.mock.timers.enable({apis:["setTimeout"]});
 try{const body=new ReadableStream({start(){},cancel(){return new Promise(()=>{});}});const result=rt.exportHandlers.POST(new Request("https://evaluations.example.test/api/applications/export",{method:"POST",headers:{origin:"https://evaluations.example.test","content-type":"application/json"},body,duplex:"half"}));t.mock.timers.tick(15000);assert.equal((await result).status,503);}finally{t.mock.timers.reset();}
});
test("snapshot contract fails closed on unexpected private fields, mismatched totals and invalid catalog/profile values",async()=>{
 const data=await snapshot();assert.equal(isExportSnapshot({...data,total:1}),false);assert.equal(isExportSnapshot({...data,extra:"private"}),false);for(const patch of [{notes:"private"},{opportunityId:"missing"},{profile:{...data.rows[0].profile,secret:"private"}}])assert.equal(isExportSnapshot({...data,rows:[{...data.rows[0],...patch}],total:1}),false);
});
test("synthetic 1,000-application export exceeds 4.5 MB, remains complete and does not write workflow data",async t=>{
 const data=validSubmission();data.profile.fullName="Scale export synthetic";data.answers.motivation=("longsyntheticword".repeat(5)+" ").repeat(60).trim();
 await rt.db.query(`with owners as (insert into auth.users(id,email,email_confirmed_at) select gen_random_uuid(),'scale-'||i||'@example.test',now() from generate_series(1,1000) i returning id)
 insert into public.enrollment_documents(owner_id,path,filename,mime_type,size_bytes)
 select id,id::text||'/'||gen_random_uuid()::text||'.pdf','Synthetic enrollment.pdf','application/pdf',100 from owners`);
 await rt.db.query(`insert into storage.objects(bucket_id,name,metadata) select 'alpha-enrollment',d.path,'{"size":100,"mimetype":"application/pdf"}'::jsonb from public.enrollment_documents d join auth.users u on u.id=d.owner_id where u.email like 'scale-%@example.test'`);
 await rt.db.query(`insert into applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id)
 select u.id,'ALPHA-2026-'||upper(substr(replace(u.id::text,'-',''),1,12)),u.email,$1,'synthetic',now(),1,gen_random_uuid() from auth.users u join public.enrollment_documents d on d.owner_id=u.id where u.email like 'scale-%@example.test' and d.application_id is null`,[data]);
 const started=Date.now(),response=await post({filters:filters({search:"Scale export synthetic"})});assert.equal(response.status,200);const bytes=await response.arrayBuffer();assert.equal(response.headers.get("x-export-rows"),"1000");assert.ok(bytes.byteLength>4.5*1024*1024);assert.equal(bytes.byteLength,Number(response.headers.get("x-export-bytes")));assert.ok(Date.now()-started<15000);t.diagnostic(`Synthetic export: 1000 rows, ${bytes.byteLength} bytes, ${Date.now()-started} ms`);assert.equal((await rt.db.query("select count(*) n from intake_history")).rows[0].n,0);
 const decoded=new TextDecoder().decode(bytes);assert.ok(decoded.includes(exportHeaders[0]));assert.equal(decoded.split("\r\n").length,1002);
});

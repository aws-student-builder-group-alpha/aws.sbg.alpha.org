import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {applicationRuntime} from './fixtures/application-runtime.mjs';
import {createCommunityRoutes} from './fixtures/staff-http-runtime.mjs';
import {validSimplifiedSubmission} from './fixtures/submission.mjs';
let rt,routes,original,admin,head,other,application;const origin='https://alpha.example.test',objects=new Map(),sent=[];let anonymous=false,uploads=0;
async function sql(query,args=[]){return rt.db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[rt.identity.id,JSON.stringify({sub:rt.identity.id,aal:'aal2'})]);return(await tx.query(query,args)).rows})}
async function rpc(name,args={}){
 const calls={alpha_invite_member:["select public.alpha_invite_member($1,$2,$3,$4,$5,$6) value",[args.p_id,args.p_email,args.p_name,args.p_position,args.p_joined,args.p_reason]],alpha_member_invitations:["select public.alpha_member_invitations($1) value",[args.p_admin||false]],alpha_claim_member_invitation:["select public.alpha_claim_member_invitation($1) value",[args.p_id]],alpha_accept_membership:["select public.alpha_accept_membership($1) value",[args.p_id]],alpha_enrollment:['select public.alpha_enrollment($1) value',[args.p_application||null]],alpha_notifications:['select public.alpha_notifications($1) value',[args.p_read||null]],alpha_member:['select public.alpha_member($1) value',[args.p_id||null]],alpha_save_enrollment:['select public.alpha_save_enrollment($1,$2,$3,$4) value',[args.p_path,args.p_filename,args.p_type,args.p_size]],alpha_update_member:['select public.alpha_update_member($1,$2) value',[args.p_name,args.p_photo||null]],alpha_messages:['select public.alpha_messages($1) value',[args.p_application]],alpha_prepare_message:['select public.alpha_prepare_message($1,$2,$3,$4,$5,$6,$7) value',[args.p_id,args.p_application,args.p_version,args.p_kind,args.p_subject,args.p_body,args.p_calendly||null]],alpha_claim_message:['select public.alpha_claim_message($1) value',[args.p_id]],alpha_issue_member:['select public.alpha_issue_member($1,$2,$3,$4,$5,$6) value',[args.p_email,args.p_name,args.p_position,args.p_joined,args.p_reason,args.p_status]]};
 try{if(!calls[name])throw new Error('Unexpected fixture RPC');return{data:(await sql(...calls[name]))[0].value,error:null}}catch(error){return{data:null,error:{code:error.code,message:error.message}}}
}
const client={rpc,storage:{from(bucket){return{
 async upload(path,bytes,options){try{uploads++;await sql('insert into storage.objects values($1,$2,$3)',[bucket,path,{size:bytes.byteLength,mimetype:options.contentType}]);objects.set(bucket+'/'+path,new Blob([bytes],{type:options.contentType}));return{error:null}}catch(error){return{error}}},
 async remove(paths){for(const path of paths){const deleted=await sql('delete from storage.objects where bucket_id=$1 and name=$2 returning name',[bucket,path]);if(deleted.length)objects.delete(bucket+'/'+path)}return{error:null}},
 async download(path){const found=await sql('select name from storage.objects where bucket_id=$1 and name=$2',[bucket,path]);return{data:found.length?objects.get(bucket+'/'+path)||null:null,error:null}},
}}}};
before(async()=>{
 rt=await applicationRuntime();await rt.open();original=rt.identity;admin=await rt.addIdentity();head=await rt.addIdentity();other=await rt.addIdentity();
 await rt.db.query("insert into public.staff_memberships(user_id,role,status,version) values($1,'administrator','active',1),($2,'evaluator','active',1)",[admin.id,head.id]);
 await rt.rpc('save_applicant_draft',{p_data:validSimplifiedSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});
 routes=await createCommunityRoutes(async()=>{if(anonymous)return{kind:'anonymous'};const row=(await rt.db.query('select role,status,version from staff_memberships where user_id=$1',[rt.identity.id])).rows[0];return row?{kind:'staff',identity:rt.identity,membership:row,needsMfa:false,client}:{kind:'applicant',identity:rt.identity,client}},origin,{
  sendMail:async message=>{sent.push(message);return{accepted:[message.to]}},serviceRpc:async(name,args)=>{await rt.db.query(name==='alpha_finish_member_invitation'?'select public.alpha_finish_member_invitation($1,$2)':'select public.alpha_finish_message($1,$2)',[args.p_id,args.p_state]);return{data:null,error:null}},
 });
});
after(async()=>{delete process.env.ALPHA_GMAIL_APP_PASSWORD;delete process.env.ALPHA_SUPABASE_SECRET_KEY;await rt?.db.close()});
function request(action,extra={}){return new Request(origin+'/api/community',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({accountId:rt.identity.id,action,...extra})})}
function upload(file,extra={}){const form=new FormData();form.set('accountId',rt.identity.id);form.set('kind','enrollment');form.set('file',file);for(const[k,v]of Object.entries(extra))form.set(k,v);return new Request(origin+'/api/community/upload',{method:'POST',headers:{origin},body:form})}
test('community HTTP rejects anonymous, cross-origin and changed-account mutations without uploading',async()=>{
 anonymous=true;assert.equal((await routes.route.GET(new Request(origin+'/api/community?action=enrollment&accountId='+original.id))).status,401);anonymous=false;
 const foreign=request('read',{id:crypto.randomUUID()});foreign.headers.set('origin','https://other.example');assert.equal((await routes.route.POST(foreign)).status,403);
 assert.equal((await routes.upload.POST(upload(new File(['%PDF-1.7'],'proof.pdf',{type:'application/pdf'}),{accountId:other.id}))).status,403);assert.equal(uploads,0);
});
test('request body deadline does not wait for stalled stream cleanup',async()=>{
 const stream=new ReadableStream({pull(){return new Promise(()=>{})},cancel(){return new Promise(()=>{})}});
 const request=new Request(origin+'/api/community/upload',{method:'POST',body:stream,duplex:'half'});
 await assert.rejects(routes.http.boundedBody(request,1024,15),error=>error.status===408);
});
test('actual upload handler validates bytes and size, stores private proof, and downloads only for its owner',async()=>{
 for(const file of [new File(['<svg>'],'fake.pdf',{type:'application/pdf'}),new File(['%PDF-1.7'],'fake.png',{type:'image/png'}),new File([new Uint8Array(3145729)],'large.pdf',{type:'application/pdf'})])assert.equal((await routes.upload.POST(upload(file))).status,422);
 assert.equal(uploads,0);
 const response=await routes.upload.POST(upload(new File(['%PDF-1.7 synthetic enrollment'],'registration.pdf',{type:'application/pdf'})));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal((await response.json()).data.filename,'registration.pdf');
 const ownerDownload=await routes.file.GET(new Request(origin+'/api/community/file?kind=enrollment&accountId='+original.id));assert.equal(ownerDownload.status,200);assert.match(ownerDownload.headers.get('content-disposition'),/^attachment/);assert.equal(ownerDownload.headers.get('x-content-type-options'),'nosniff');assert.equal(await ownerDownload.text(),'%PDF-1.7 synthetic enrollment');
 application=await rt.rpc('submit_applicant_application',{p_expected_version:1,p_mutation_id:crypto.randomUUID()});
 rt.setIdentity(other);assert.equal((await routes.file.GET(new Request(origin+'/api/community/file?kind=enrollment&accountId='+other.id+'&applicationId='+application.id))).status,403);rt.setIdentity(original);
});
test('email handler is disabled without credentials and exact retries call the transport once with the verified recipient',async()=>{
 await rt.db.query("insert into evaluation_assignments(application_id,generation,evaluator_id,assigned_by) values($1,1,$2,$3)",[application.id,head.id,admin.id]);await rt.db.query("update applications set status='Under Review',version=2 where id=$1",[application.id]);rt.setIdentity(head);
 const message={id:crypto.randomUUID(),applicationId:application.id,version:2,kind:'interview',subject:'Interview invitation',body:'Please select an interview schedule.',calendly:'https://calendly.com/alpha/interview',recipient:'attacker@example.test'};
 assert.equal((await routes.route.POST(request('send',message))).status,503);assert.equal(sent.length,0);
 process.env.ALPHA_GMAIL_APP_PASSWORD='synthetic-only';process.env.ALPHA_SUPABASE_SECRET_KEY='synthetic-only';process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.supabase.co';
 for(let i=0;i<2;i++){const response=await routes.route.POST(request('send',message));assert.equal(response.status,200);assert.equal((await response.json()).data.state,'sent')}
 assert.equal(sent.length,1);assert.equal(sent[0].from.address,'awslc.alpha@gmail.com');assert.equal(sent[0].to,original.email);assert.match(sent[0].text,/https:\/\/calendly.com\/alpha\/interview/);assert.equal(sent[0].html,undefined);assert.equal(sent[0].disableUrlAccess,true);
 assert.equal((await routes.route.POST(request('send',{...message,body:'Changed request'}))).status,409);
});


test('membership HTTP derives the invite recipient, requires admin access and sends once across exact retries',async()=>{
 rt.setIdentity(admin);const id=crypto.randomUUID();const payload={id,email:other.email,name:'Existing Builder',position:'Member',joined:'2026-11-01',reason:'Verified existing member'};
 const created=await routes.route.POST(request('inviteMember',payload));assert.equal(created.status,200);assert.equal((await created.json()).data.state,'pending');
 const before=sent.length;rt.setIdentity(other);assert.equal((await routes.route.POST(request('sendMemberInvitation',{id}))).status,403);assert.equal(sent.length,before);
 rt.setIdentity(admin);for(let n=0;n<2;n++)assert.equal((await routes.route.POST(request('sendMemberInvitation',{id,recipient:'attacker@example.test'}))).status,200);
 assert.equal(sent.length,before+1);assert.equal(sent.at(-1).to,other.email);assert.match(sent.at(-1).text,/https:\/\/alpha\.example\.test\/membership/);assert.equal(sent.at(-1).html,undefined);
 rt.setIdentity(other);assert.equal((await routes.route.POST(request('acceptMemberInvitation',{id}))).status,200);
 const own=await routes.route.GET(new Request(origin+'/api/community?action=member&accountId='+other.id));assert.equal((await own.json()).data.status,'active');
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { applicationRuntime } from './fixtures/application-runtime.mjs';
import { memberEntry } from '../lib/member-entry.ts';
let runtime, db, admin, member, stranger;
async function actor(id,sql,args=[],aal='aal2',role='authenticated') {
  return db.transaction(async tx=>{
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id,JSON.stringify({sub:id,aal})]);
    return (await tx.query(sql,args)).rows[0]?.value;
  });
}
const invite=(id,email)=>[id,email,'Alpha Builder','Committee Member','2026-11-01','Verified existing organization member'];
const invitationSql='select public.alpha_invite_member($1,$2,$3,$4,$5,$6) as value';
before(async()=>{runtime=await applicationRuntime();db=runtime.db;admin=await runtime.addIdentity();member=await runtime.addIdentity();stranger=await runtime.addIdentity();await db.query("insert into public.staff_memberships(user_id,role,status,version) values($1,'administrator','active',1)",[admin.id])});
after(async()=>{await db?.close()});

test('member entry selects existing membership or an invitation before an application and fails closed',async()=>{
  const active={id:'ALPHA-2026-000000000001',full_name:'Builder',position:'Member',joined_on:'2026-11-01',photo_path:null,status:'active',version:1};
  for(const [data,pending,expected] of [[active,[],'membership'],[null,[{id:'invite'}],'membership'],[null,[],'application'],[{},[],'unavailable']]) {
    assert.equal(await memberEntry({rpc:async name=>({data:name==='alpha_member'?data:pending,error:null})}),expected);
  }
  assert.equal(await memberEntry({rpc:async()=>({data:null,error:{code:'unavailable'}})}),'unavailable');
});
test('only an MFA admin can invite an email before first sign-in; retries retain one exact invitation',async()=>{
  const args=invite(crypto.randomUUID(),'not-yet-signed-in@example.test');
  await assert.rejects(actor(stranger.id,invitationSql,args),e=>e.code==='42501');
  await assert.rejects(actor(admin.id,invitationSql,args,'aal1'),e=>e.code==='42501');
  const result=await actor(admin.id,invitationSql,args);assert.equal(result.state,'pending');assert.equal(result.reason,undefined);
  assert.equal((await actor(admin.id,invitationSql,args)).id,result.id);
  await assert.rejects(actor(admin.id,invitationSql,[...args.slice(0,2),'Changed',...args.slice(3)]),e=>e.code==='PT409');
  await assert.rejects(actor(admin.id,invitationSql,[crypto.randomUUID(),...args.slice(1)]),e=>e.code==='PT409');
  assert.equal((await db.query('select count(*)::int as n from auth.users where email=$1',[args[1]])).rows[0].n,0);
});
test('only the invited verified account can see and accept; acceptance issues an ID exactly once without an application',async()=>{
  const id=crypto.randomUUID();await actor(admin.id,invitationSql,invite(id,member.email));
  assert.equal(await actor(member.id,'select public.alpha_member() as value'),null);
  const pending=await actor(member.id,'select public.alpha_member_invitations() as value');assert.equal(pending.length,1);assert.equal(pending[0].email,undefined);assert.equal(pending[0].reason,undefined);
  assert.equal((await actor(stranger.id,'select public.alpha_member_invitations() as value')).length,0);
  await assert.rejects(actor(stranger.id,'select public.alpha_accept_membership($1) as value',[id]),e=>e.code==='42501');
  const first=await actor(member.id,'select public.alpha_accept_membership($1) as value',[id]);
  const second=await actor(member.id,'select public.alpha_accept_membership($1) as value',[id]);
  assert.equal(first.id,second.id);assert.equal(first.version,second.version);assert.equal(first.owner_id,undefined);
  assert.equal((await db.query('select count(*)::int as n from public.applications where owner_id=$1',[member.id])).rows[0].n,0);
  assert.equal((await actor(stranger.id,'select public.alpha_member($1) as value',[first.id])),null);
});
test('cancellation and revocation prevent pending invitations from restoring access',async()=>{
  let id=crypto.randomUUID();await actor(admin.id,invitationSql,invite(id,stranger.email));
  await actor(admin.id,'select public.alpha_cancel_member_invitation($1) as value',[id]);
  await assert.rejects(actor(stranger.id,'select public.alpha_accept_membership($1) as value',[id]),e=>e.code==='42501');
  id=crypto.randomUUID();await actor(admin.id,invitationSql,invite(id,member.email));
  await actor(admin.id,"select public.alpha_issue_member($1,'Builder','Member','2026-11-01','Membership ended','revoked') as value",[member.email]);
  await assert.rejects(actor(member.id,'select public.alpha_accept_membership($1) as value',[id]),e=>e.code==='42501');
  assert.equal(await actor(member.id,'select public.alpha_member() as value'),null);
});
test('invitation delivery has one claim; browser roles cannot forge a sent receipt or read private tables',async()=>{
  const id=crypto.randomUUID();await actor(admin.id,invitationSql,invite(id,stranger.email));
  const first=await actor(admin.id,'select public.alpha_claim_member_invitation($1) as value',[id]);assert.equal(first.email,stranger.email);
  assert.equal(await actor(admin.id,'select public.alpha_claim_member_invitation($1) as value',[id]),null);
  await assert.rejects(actor(admin.id,"select public.alpha_finish_member_invitation($1,'sent') as value",[id]),e=>e.code==='42501');
  await db.query("select public.alpha_finish_member_invitation($1,'sent')",[id]);
  assert.equal((await actor(admin.id,'select public.alpha_member_invitations(true) as value')).find(i=>i.id===id).delivery,'sent');
  await assert.rejects(actor(stranger.id,'select public.alpha_member_invitations(true) as value'),e=>e.code==='42501');
  await assert.rejects(actor(stranger.id,'select * from public.alpha_member_invitations'),e=>e.code==='42501');
});

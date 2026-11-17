import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validSubmission } from "./fixtures/submission.mjs";
import { validateSubmission } from "../lib/applications.ts";
import { communityStorage, enrollmentFixture } from "./fixtures/community-storage.mjs";
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid,provider text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to anon,authenticated;`);
  await communityStorage(db);
  for (const file of (await readdir(new URL("../supabase/migrations/",import.meta.url))).filter(file => file.endsWith(".sql")).sort()) await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
});
after(async () => { await db?.close(); });
async function identity(provider="google",confirmed=true) {
  const id=crypto.randomUUID();
  await db.query("insert into auth.users values($1,$2,$3)",[id,`${id}@example.test`,confirmed?new Date().toISOString():null]);
  await db.query("insert into auth.identities values($1,$2)",[id,provider]);await enrollmentFixture(db,id);return id;
}
async function actor(id,run,role="authenticated") {
  return db.transaction(async tx => {await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[id||"",JSON.stringify({sub:id,aal:"aal2"})]);return run(tx);});
}
const save=(id,data=validSubmission(),version=0,mutation=crypto.randomUUID())=>actor(id,async tx=>(await tx.query("select public.save_applicant_draft($1,$2,$3) as value",[data,version,mutation])).rows[0].value);
const submit=(id,version=1,mutation=crypto.randomUUID())=>actor(id,async tx=>(await tx.query("select public.submit_applicant_application($1,$2) as value",[version,mutation])).rows[0].value);
const withdraw=(id,version=1,mutation=crypto.randomUUID())=>actor(id,async tx=>(await tx.query("select public.withdraw_applicant_application($1,$2) as value",[version,mutation])).rows[0].value);
const state=id=>actor(id,async tx=>(await tx.query("select public.get_application_state() as value")).rows[0].value);
const open=()=>db.exec("update public.recruitment_settings set opens_at=clock_timestamp()-interval '1 day',closes_at=clock_timestamp()+interval '1 day',intake_state='open'");
test("official dates use Philippine midnight; drafts work before intake",async()=>{
  const row=(await db.query("select opens_at,closes_at from public.recruitment_settings")).rows[0];
  assert.equal(new Date(row.opens_at).toISOString(),"2026-10-31T16:00:00.000Z");assert.equal(new Date(row.closes_at).toISOString(),"2026-11-30T16:00:00.000Z");
  const id=await identity();await save(id);await db.exec("update public.recruitment_settings set opens_at=clock_timestamp()+interval '1 day',closes_at=clock_timestamp()+interval '2 days'");
  await assert.rejects(submit(id),e=>e.code==="PT423");assert.equal((await state(id)).application,null);
});
test("submit snapshots acknowledged answers and consent once; retries survive close and withdrawal",async()=>{
  await open();const id=await identity(),input=validSubmission(),mutation=crypto.randomUUID();const draft=await save(id,input);
  const first=await submit(id,1,mutation);assert.match(first.reference,/^ALPHA-2026-[A-F0-9]{12}$/);assert.deepEqual(first.data,input);assert.equal(first.history.length,1);
  await db.exec("update public.recruitment_settings set intake_state='closed'");
  assert.deepEqual(await submit(id,1,mutation),first);assert.deepEqual(await submit(id,1),first);
  await assert.rejects(submit(id,2,mutation),e=>e.code==="22023");
  await assert.rejects(save(id,input,0,draft.last_mutation_id),e=>e.code==="PT410");
  await assert.rejects(save(id,input,1),e=>e.code==="PT410");
  const withdrawal=crypto.randomUUID(),last=await withdraw(id,1,withdrawal);
  assert.equal(last.status,"Withdrawn");assert.equal(last.reference,first.reference);assert.deepEqual(last.data,input);assert.equal(last.history.length,2);
  assert.deepEqual(await withdraw(id,1,withdrawal),last);assert.deepEqual(await withdraw(id,1),last);assert.deepEqual(await submit(id,1,mutation),last);
  assert.equal((await db.query("select count(*)::int as count from public.applications where owner_id=$1",[id])).rows[0].count,1);
});
test("stale final-save revision cannot submit and immutable snapshots reject even owner SQL edits",async()=>{
  await open();const id=await identity(),data=validSubmission();await save(id,data);await save(id,{...data,resumeUrl:"https://example.test/resume"},1);
  await assert.rejects(submit(id,1),e=>e.code==="PT409");const result=await submit(id,2);
  assert.equal(result.data.resumeUrl,"https://example.test/resume");
  await assert.rejects(db.query("update public.applications set data=$1 where owner_id=$2",[data,id]),e=>e.code==="42501");
  await assert.rejects(withdraw(id,2),e=>e.code==="PT409");assert.equal((await state(id)).application.status,"Submitted");
});
test("database validation agrees with production validation and returns only safe field errors",async()=>{
  await open();const id=await identity();let revision=0;
  const cases=[{profile:{fullName:" "}},{profile:{university:"Other",otherUniversity:" "}},{profile:{program:""}},{profile:{year:"other",yearExplanation:""}},{profile:{enrolled:false}},{profile:{availability:[]}},{profile:{experience:""}},{answers:{motivation:"incomplete"}},{accuracy:false},{profile:{mobile:"invalid"}}];
  for(const patch of cases){const base=validSubmission(),input={...base,...patch,profile:{...base.profile,...patch.profile},answers:{...base.answers,...patch.answers}};await save(id,input,revision++);
    const expected=Object.keys(validateSubmission(input)).sort();await assert.rejects(submit(id,revision),error=>{assert.equal(error.code,"PT422");assert.deepEqual(Object.keys(JSON.parse(error.detail)).sort(),expected);return true;});}
  const input=validSubmission();input.profile.mobile="+63 912-345-6789";await save(id,input,revision++);assert.equal((await submit(id,revision)).status,"Submitted");
});
test("Unicode word boundaries and Committee eligibility are enforced in SQL",async()=>{
  await open();const id=await identity(),data=validSubmission();data.track="COMMITTEE";data.opportunityId="skillbuilders-web";data.profile.programLevel="postgraduate";data.profile.year="other";data.profile.yearExplanation="Graduate student";
  for(const key of Object.keys(data.answers))data.answers[key]="\uFEFF"+data.answers[key].replaceAll(" ","\u00a0\u2003\u2028")+"\u3000";
  data.profile.mobile="+63\u00a0912\u2003345\u30006789";
  assert.deepEqual(validateSubmission(data),{});await save(id,data);assert.equal((await submit(id)).status,"Submitted");
});

test("overlapping same-owner commands serialize to one application and one terminal withdrawal",async()=>{
  await open();const id=await identity();await save(id);
  const submissions=await Promise.all([submit(id),submit(id)]);
  assert.equal(submissions[0].reference,submissions[1].reference);
  const withdrawals=await Promise.all([withdraw(id),withdraw(id)]);
  assert.deepEqual(withdrawals[0],withdrawals[1]);
  assert.equal(withdrawals[0].history.length,2);
  // PGlite serializes transactions; this is a logical overlap check, not multi-connection load evidence.
});
test("paused, closed, before-open and at-close submissions fail; draft saves still succeed",async()=>{
  const id=await identity();await save(id);
  for(const intake of ["paused","closed"]){await db.query("update public.recruitment_settings set intake_state=$1",[intake]);await assert.rejects(submit(id),e=>e.code==="PT423");}
  await db.exec("update public.recruitment_settings set opens_at=clock_timestamp()-interval '1 day',closes_at=clock_timestamp(),intake_state='open'");await assert.rejects(submit(id),e=>e.code==="PT423");
  await save(id,validSubmission(),1);await open();assert.equal((await submit(id,2)).status,"Submitted");
});
test("anonymous, non-Google, unconfirmed, and current/former staff cannot use applicant commands",async()=>{
  await open();for(const id of [null,await identity("email"),await identity("google",false)])await assert.rejects(submit(id),e=>e.code==="42501");
  const id=await identity();await save(id);await db.query("insert into public.staff_memberships(user_id,role,status) values($1,'evaluator','active')",[id]);
  for(const status of ["active","suspended","revoked"]){await db.query("update public.staff_memberships set status=$1 where user_id=$2",[status,id]);await assert.rejects(state(id),e=>e.code==="42501");await assert.rejects(submit(id),e=>e.code==="42501");await assert.rejects(withdraw(id),e=>e.code==="42501");}
});
test("RLS isolates application/history and denies direct writes or intake maintenance",async()=>{
  await open();const a=await identity(),b=await identity();await save(a);const submitted=await submit(a);
  assert.equal((await actor(b,tx=>tx.query("select * from public.applications"))).rows.length,0);
  assert.equal((await actor(b,tx=>tx.query("select * from public.application_public_history"))).rows.length,0);
  assert.equal((await actor(a,tx=>tx.query("select * from public.application_public_history"))).rows.length,1);
  for(const sql of ["update public.recruitment_settings set intake_state='open'","delete from public.applications","update public.applications set status='Withdrawn'","delete from public.application_public_history"])await assert.rejects(actor(a,tx=>tx.exec(sql)),e=>e.code==="42501");
  await assert.rejects(actor(null,tx=>tx.query("select public.get_application_state()"),"anon"),e=>e.code==="42501");
  const before=(await state(a)).application;await db.query("insert into public.staff_memberships(user_id,role,status) values($1,'evaluator','revoked')",[a]);
  assert.equal((await actor(a,tx=>tx.query("select * from public.applications"))).rows.length,0);await assert.rejects(submit(a),e=>e.code==="42501");
  assert.equal((await db.query("select reference from public.applications where id=$1",[submitted.id])).rows[0].reference,before.reference);
});

test("fresh submissions require a resume while legacy blank-resume snapshots remain readable, retryable and withdrawable",async()=>{
  await open();const id=await identity(),data=validSubmission();data.resumeUrl="";await save(id,data);
  await assert.rejects(submit(id),error=>error.code==="PT422"&&!!JSON.parse(error.detail).resumeUrl);
  const mutation=crypto.randomUUID();
  const legacy=(await db.query(`insert into public.applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id)
    select owner_id,'ALPHA-2026-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),email,data,privacy_version,consented_at,version,$2 from public.applicant_drafts where owner_id=$1 returning *`,[id,mutation])).rows[0];
  await db.query("insert into public.application_public_history(application_id,version,status) values($1,1,'Submitted')",[legacy.id]);
  assert.equal((await state(id)).application.data.resumeUrl,"");
  assert.equal((await submit(id,1,mutation)).id,legacy.id);
  assert.equal((await withdraw(id)).status,"Withdrawn");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { emptyDraftInput } from "../lib/drafts.ts";
import { opportunities } from "../lib/catalog.ts";

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid,provider text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    grant usage on schema auth to anon,authenticated;`);
  for (const file of ["202610180001_applicant_drafts.sql", "202610190001_staff_access.sql", "202610190002_staff_reason_validation.sql", "20261019053837_nonretryable_application_conflicts.sql", "20261019060538_applicant_submission.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
});
after(async () => { await db?.close(); });
async function identity(provider = "google", confirmed = true) {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users values ($1,$2,$3)", [id, `${id}@example.test`, confirmed ? new Date().toISOString() : null]);
  await db.query("insert into auth.identities values ($1,$2)", [id, provider]); return id;
}
async function actor(id, run, role = "authenticated") {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id || ""]);
    return run(tx);
  });
}
const payload = () => ({ ...emptyDraftInput(), processingConsent: true });
async function save(id, input, version = 0, mutation = crypto.randomUUID()) {
  return actor(id, async tx => (await tx.query("select public.save_applicant_draft($1::jsonb,$2::int,$3::uuid) as draft", [JSON.stringify(input), version, mutation])).rows[0].draft);
}
test("historical draft baseline retains its original opportunity IDs and tracks", async () => {
  const result = await db.query("select id,track from public.draft_opportunities order by id");
  assert.deepEqual(result.rows, opportunities.filter(role => role.track !== "MEMBER").map(({ id, track }) => ({ id, track })).sort((a,b) => a.id.localeCompare(b.id)));
});
test("one consented draft is created per Google identity with server-owned email and timestamps", async () => {
  const id = await identity(); const input = payload(); const mutation = crypto.randomUUID();
  const first = await save(id,input,0,mutation);
  const retry = await save(id,input,0,mutation);
  assert.equal(first.id,retry.id); assert.equal(retry.version,1); assert.equal(retry.owner_id,id);
  assert.equal(retry.email,`${id}@example.test`); assert.equal(retry.privacy_version,"2026-10-18"); assert.ok(retry.consented_at);
  await assert.rejects(save(id,input,0), error => error.code === "PT409");
});
test("RLS filters other applicants and anonymous requests; direct writes cannot change ownership or status", async () => {
  const a = await identity(), b = await identity(); const value = await save(a,payload());
  assert.equal((await actor(a,tx => tx.query("select id from public.applicant_drafts"))).rows.length,1);
  assert.equal((await actor(b,tx => tx.query("select id from public.applicant_drafts where id=$1",[value.id]))).rows.length,0);
  await assert.rejects(actor(null,tx=>tx.query("select * from public.applicant_drafts"),"anon"), error=>error.code==="42501");
  await assert.rejects(actor(a,tx=>tx.query("update public.applicant_drafts set status='Accepted' where id=$1",[value.id])), error=>error.code==="42501");
  await assert.rejects(actor(a,tx=>tx.query("update public.applicant_drafts set owner_id=$1 where id=$2",[b,value.id])), error=>error.code==="42501");
  await assert.rejects(actor(a,tx=>tx.query("delete from public.applicant_drafts where id=$1",[value.id])), error=>error.code==="42501");
});
test("save RPC rejects anonymous, non-Google, unconfirmed identities, consent omissions, and protected fields", async () => {
  await assert.rejects(actor(null,tx=>tx.query("select public.save_applicant_draft($1,0,$2)",[payload(),crypto.randomUUID()]),"anon"), error=>error.code==="42501");
  for(const id of [await identity("email"),await identity("google",false)]) await assert.rejects(save(id,payload()), error=>error.code==="42501");
  const id=await identity();
  for(const input of [{ ...payload(),processingConsent:false },{ ...payload(),status:"Accepted" },{ ...payload(),profile:{ ...payload().profile,email:"forged@example.test" } },{ ...payload(),resumeUrl:"javascript:alert(1)" },{ ...payload(),answers:{ ...payload().answers,scenario:"x".repeat(10001) } }]) await assert.rejects(save(id,input), error=>error.code==="22023");
});
test("competing revisions allow one save, reject stale writes, and preserve consent records", async () => {
  const id=await identity(); const first=await save(id,payload());
  const input={ ...payload(),answers:{ ...payload().answers,motivation:"An unfinished response" } };
  const second=await save(id,input,1);
  await assert.rejects(save(id,{ ...input,stage:3 },1), error=>error.code==="PT409");
  assert.equal(second.version,2); assert.equal(second.consented_at,first.consented_at);
  const stored=await actor(id,tx=>tx.query("select version,data from public.applicant_drafts"));
  assert.equal(stored.rows[0].version,2); assert.equal(stored.rows[0].data.answers.motivation,"An unfinished response");
});
test("retry after committed update is idempotent, but operation IDs cannot be reused with other input", async () => {
  const id=await identity(); await save(id,payload());
  const mutation=crypto.randomUUID(); const input={ ...payload(),stage:2 };
  const second=await save(id,input,1,mutation); const retry=await save(id,input,1,mutation);
  assert.equal(second.version,2); assert.equal(retry.version,2);
  await assert.rejects(save(id,{ ...input,stage:3 },2,mutation), error=>error.code==="22023");
});

test("a missing draft with a positive expected revision returns a final conflict without creating a row", async () => {
  const id = await identity();
  await assert.rejects(save(id,payload(),1), error => error.code === "PT409");
  const stored = await actor(id,tx => tx.query("select id from public.applicant_drafts"));
  assert.equal(stored.rows.length,0);
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { emptyDraftInput } from "../lib/drafts.ts";

let db, admin, secondAdmin, evaluator, applicant;
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
  admin = await identity(); secondAdmin = await identity(); evaluator = await identity(); applicant = await identity();
  await db.query("select public.bootstrap_first_staff_admin($1,$2)", [admin.email, "Initial project owner setup"]);
});
after(async () => { await db?.close(); });
async function identity(provider = "google", confirmed = true) {
  const id = crypto.randomUUID(), email = `${id}@example.test`;
  await db.query("insert into auth.users values ($1,$2,$3)", [id, email, confirmed ? new Date().toISOString() : null]);
  await db.query("insert into auth.identities values ($1,$2)", [id, provider]);
  return { id, email };
}
async function actor(user, run, aal = "aal2", role = "authenticated") {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [user?.id || "", JSON.stringify({ sub: user?.id, aal })]);
    return run(tx);
  });
}
const grant = (user, role = "evaluator") => ({ action: "grant", email: user.email, targetId: "", role, expectedVersion: 0, mutationId: crypto.randomUUID(), reason: "Recruitment access approved" });
const change = (member, action, role = member.role) => ({ action, email: "", targetId: member.userId, role, expectedVersion: member.version, mutationId: crypto.randomUUID(), reason: "Recruitment responsibility changed" });
const command = (user, request, aal = "aal2") => actor(user, async tx => (await tx.query("select public.manage_staff_access($1) as value", [request])).rows[0].value, aal);
const list = (user, aal = "aal2") => actor(user, async tx => (await tx.query("select public.list_staff_members() as value")).rows[0].value, aal);
const draftInput = () => ({ ...emptyDraftInput(), processingConsent: true });

test("only the owner can bootstrap once; ordinary users cannot grant themselves access", async () => {
  await assert.rejects(actor(applicant, tx => tx.query("select public.bootstrap_first_staff_admin($1,$2)", [applicant.email, "Self grant"])), e => e.code === "42501");
  await assert.rejects(db.query("select public.bootstrap_first_staff_admin($1,$2)", [secondAdmin.email, "Another bootstrap"]));
  await assert.rejects(command(applicant, grant(applicant, "administrator")), e => e.code === "42501");
  await assert.rejects(actor(null, tx => tx.query("select public.list_staff_members()"), "aal2", "anon"), e => e.code === "42501");
});
test("administrator AAL2 and verified Google identity are required for lists, history, and mutations", async () => {
  await assert.rejects(list(admin, "aal1"), e => e.code === "42501");
  await assert.rejects(command(admin, grant(evaluator), "aal1"), e => e.code === "42501");
  await assert.rejects(actor(applicant, tx => tx.query("select public.list_staff_history($1,null)", [admin.id])), e => e.code === "42501");
  const a = await command(admin, grant(secondAdmin, "administrator"));
  const e = await command(admin, grant(evaluator));
  assert.equal(a.role, "administrator"); assert.equal(e.role, "evaluator");
  await assert.rejects(list(evaluator), error => error.code === "42501");
  await assert.rejects(actor(admin, tx => tx.query("update public.staff_memberships set role='evaluator'")), error => error.code === "42501");
  await assert.rejects(actor(admin, tx => tx.query("delete from public.staff_access_history")), error => error.code === "42501");
  const visible = await actor(evaluator, tx => tx.query("select user_id,role from public.staff_memberships"));
  assert.equal(visible.rows.length, 1); assert.equal(visible.rows[0].user_id, evaluator.id);
});
test("grants require an existing confirmed Google account and a valid reason", async () => {
  for (const user of [await identity("email"), await identity("google", false), { email: "unknown@example.test" }]) {
    await assert.rejects(command(admin, grant(user)), error => error.code === "P0002");
  }
  for (const patch of [{ reason: " " }, { role: "owner" }, { reason: "x".repeat(501) }, { unexpected: true }, { expectedVersion: -1 }]) {
    await assert.rejects(command(admin, { ...grant(applicant), ...patch }), error => error.code === "22023");
  }
  await assert.rejects(command(admin, grant(admin)), error => error.code === "42501");
});
test("changes are versioned, retry-safe even after later changes, and create one history event", async () => {
  const user = await identity(); const request = grant(user);
  const first = await command(admin, request), retry = await command(admin, request);
  assert.deepEqual(first, retry);
  const nextRequest = change(first, "change_role", "administrator");
  const next = await command(admin, nextRequest);
  assert.equal(next.version, 2);
  assert.deepEqual(await command(admin, request), first);
  await assert.rejects(command(admin, change(first, "suspend")), e => e.code === "PT409");
  await assert.rejects(command(admin, { ...request, reason: "Different input" }), e => e.code === "22023");
  const events = await actor(admin, async tx => (await tx.query("select public.list_staff_history($1,null) as value", [user.id])).rows[0].value);
  assert.equal(events.length, 2); assert.equal(events[0].previousRole, "evaluator"); assert.equal(events[0].newRole, "administrator");
  assert.equal(events[0].actorId, admin.id); assert.equal("request" in events[0], false);
});
test("suspension and revocation take effect for old sessions; restoration is explicit", async () => {
  let member = (await list(admin)).find(m => m.userId === secondAdmin.id);
  member = await command(admin, change(member, "suspend"));
  await assert.rejects(list(secondAdmin), e => e.code === "42501");
  member = await command(admin, change(member, "reactivate")); assert.ok(await list(secondAdmin));
  member = await command(admin, change(member, "revoke"));
  await assert.rejects(list(secondAdmin), e => e.code === "42501");
  await assert.rejects(command(admin, change(member, "reactivate")), e => e.code === "22023");
  member = await command(admin, change(member, "restore")); assert.equal(member.status, "active");
  await assert.rejects(command(admin, change(member, "restore")), e => e.code === "22023");
});

test("duplicate grants and missing memberships return final conflicts without history changes", async () => {
  const user = await identity();
  const member = await command(admin, grant(user));
  const missing = await identity();
  await assert.rejects(command(admin, grant(user)), error => error.code === "PT409");
  await assert.rejects(command(admin, change({ userId: missing.id, role: "evaluator", version: 1 }, "revoke")), error => error.code === "PT409");
  const current = (await list(admin)).find(item => item.userId === user.id);
  assert.deepEqual(current, member);
  const events = await db.query("select target_id,count(*)::int as count from public.staff_access_history where target_id in ($1,$2) group by target_id", [user.id, missing.id]);
  assert.deepEqual(events.rows, [{ target_id: user.id, count: 1 }]);
});
test("administrators cannot change themselves; stale demoted authority cannot remove the remaining administrator", async () => {
  const a = (await list(admin)).find(m => m.userId === admin.id);
  for (const action of ["suspend", "revoke", "change_role"]) await assert.rejects(command(admin, change(a, action, "evaluator")), e => e.code === "42501");
  let b = (await list(admin)).find(m => m.userId === secondAdmin.id);
  b = await command(admin, change(b, "change_role", "evaluator"));
  await assert.rejects(command(secondAdmin, change(a, "revoke")), e => e.code === "42501");
  await command(admin, change(b, "change_role", "administrator"));
  assert.ok((await list(admin)).some(m => m.role === "administrator" && m.status === "active"));
});
test("current/former staff cannot read or save drafts, including retries; existing drafts are retained", async () => {
  const user = await identity(), input = draftInput(), mutation = crypto.randomUUID();
  await actor(user, tx => tx.query("select public.save_applicant_draft($1,0,$2)", [input, mutation]));
  let member = await command(admin, grant(user));
  for (const action of [null, "suspend", "revoke"]) {
    if (action) member = await command(admin, change(member, action));
    assert.equal((await actor(user, tx => tx.query("select * from public.applicant_drafts"))).rows.length, 0);
    await assert.rejects(actor(user, tx => tx.query("select public.save_applicant_draft($1,0,$2)", [input, mutation])), e => e.code === "42501");
    await assert.rejects(actor(user, tx => tx.query("select public.save_applicant_draft($1,1,$2)", [input, crypto.randomUUID()])), e => e.code === "42501");
  }
  assert.equal((await db.query("select version from public.applicant_drafts where owner_id=$1", [user.id])).rows[0].version, 1);
  await actor(applicant, tx => tx.query("select public.save_applicant_draft($1,0,$2)", [input, crypto.randomUUID()]));
  assert.equal((await actor(applicant, tx => tx.query("select * from public.applicant_drafts"))).rows.length, 1);
});

test("history pagination follows revisions without losing same-transaction timestamps", async () => {
  const user = await identity(); let member = await command(admin, grant(user));
  for (let i = 0; i < 51; i++) member = await command(admin, change(member, i % 2 === 0 ? "suspend" : "reactivate"));
  const first = await actor(admin, async tx => (await tx.query("select public.list_staff_history($1,null) as value", [user.id])).rows[0].value);
  const next = await actor(admin, async tx => (await tx.query("select public.list_staff_history($1,$2) as value", [user.id, first.at(-1).targetVersion])).rows[0].value);
  assert.equal(first.length, 50); assert.equal(next.length, 2);
  assert.deepEqual([...first, ...next].map(e => e.targetVersion), Array.from({ length: 52 }, (_, i) => 52 - i));
});

test("owner recovery procedure suspends and restores with revisions and append-only history", async () => {
  const guide = await readFile(new URL("../docs/architecture.md", import.meta.url), "utf8");
  const section = guide.split(/^### Lost-authenticator recovery\r?\n/m)[1]?.split(/^#{1,3} /m)[0];
  assert.ok(section, "Architecture must retain the named owner recovery section");
  const recovery = [...section.matchAll(/```sql\r?\n([\s\S]+?)```/g)].map(match => match[1]).find(sql => sql.startsWith("do $$"));
  assert.ok(recovery);
  const sql = recovery.replace("your-google-email@example.com", secondAdmin.email);
  const old = (await list(admin)).find(m => m.userId === secondAdmin.id);
  await db.exec(sql);
  await assert.rejects(list(secondAdmin), error => error.code === "42501");
  await db.exec(sql.replace("desired_status text := 'suspended'", "desired_status text := 'active'"));
  const restored = (await list(admin)).find(m => m.userId === secondAdmin.id);
  assert.equal(restored.version, old.version + 2); assert.equal(restored.status, "active");
  const history = await actor(admin, async tx => (await tx.query("select public.list_staff_history($1,null) as value", [secondAdmin.id])).rows[0].value);
  assert.equal(history[0].actorId, null); assert.equal(history[0].action, "reactivate");
  assert.equal(history[1].action, "suspend");
});

test("direct RPC calls with whitespace-only reasons roll back the membership and history together", async () => {
  const user = await identity();
  await assert.rejects(command(admin, { ...grant(user), reason: "\n\t\r" }), error => error.code === "23514");
  assert.equal((await list(admin)).some(member => member.userId === user.id), false);
  const result = await db.query("select count(*)::int as count from public.staff_access_history where target_id=$1", [user.id]);
  assert.equal(result.rows[0].count, 0);
});

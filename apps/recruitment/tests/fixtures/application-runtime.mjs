import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createApplicationRoute } from "./staff-http-runtime.mjs";
import { communityStorage, enrollmentFixture } from "./community-storage.mjs";

/** Isolated PostgreSQL and the real HTTP/server code, with synthetic verified identity only. */
export async function applicationRuntime(origin = "https://application.example.test") {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid,provider text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to anon,authenticated;`);
  await communityStorage(db);
  const directory = new URL("../../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter(file => file.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(file, directory), "utf8"));
  let identity, kind = "authenticated";
  async function addIdentity() {
    const id = crypto.randomUUID();
    await db.query("insert into auth.users values($1,$2,now())", [id, id + "@example.test"]);
    await db.query("insert into auth.identities values($1,'google')", [id]);
    await enrollmentFixture(db,id);
    return { id, email: id + "@example.test", name: "Synthetic Applicant" };
  }
  identity = await addIdentity();
  async function rpc(name, args = {}) {
    const calls = {
      save_applicant_draft: ["select public.save_applicant_draft($1,$2,$3) as value", [args.p_data, args.p_expected_version, args.p_mutation_id]],
      get_application_state: ["select public.get_application_state() as value", []],
      submit_applicant_application: ["select public.submit_applicant_application($1,$2) as value", [args.p_expected_version, args.p_mutation_id]],
      withdraw_applicant_application: ["select public.withdraw_applicant_application($1,$2) as value", [args.p_expected_version, args.p_mutation_id]],
    };
    if (!calls[name]) throw new Error("Unexpected application RPC");
    return db.transaction(async tx => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [identity.id, JSON.stringify({ sub: identity.id, aal: "aal1" })]);
      return (await tx.query(...calls[name])).rows[0].value;
    });
  }
  const handlers = await createApplicationRoute(async () => kind === "authenticated" ? {
    kind, applicant: identity, client: { rpc: async (name, args) => {
      try { return { data: await rpc(name, args), error: null }; }
      catch (error) { return { data: null, error: { code: error.code, details: error.detail } }; }
    } },
  } : { kind }, origin);
  return {
    db, handlers, rpc, addIdentity, get identity() { return identity; }, setIdentity: next => { identity = next; }, setKind: next => { kind = next; },
    open: () => db.exec("update public.recruitment_settings set opens_at=clock_timestamp()-interval '1 day',closes_at=clock_timestamp()+interval '1 day',intake_state='open'"),
    async post(body, options = {}) {
      return handlers.POST(new Request(origin + "/api/application", { method: "POST", headers: { origin, "Content-Type": "application/json", ...options.headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
    },
  };
}

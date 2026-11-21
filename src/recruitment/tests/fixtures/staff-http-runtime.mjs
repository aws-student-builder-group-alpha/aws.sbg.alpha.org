import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as staff from "../../lib/staff.ts";
import * as drafts from "../../lib/drafts.ts";
import * as applications from "../../lib/applications.ts";
import * as evaluations from "../../lib/evaluations.ts";
import * as decisions from "../../lib/decisions.ts";
import * as applicationQueue from "../../lib/application-queue.ts";

const require = createRequire(import.meta.url);
const { loadBindings, transform } = require("next/dist/build/swc");
const ready = loadBindings();
const sources = new Map();
export async function createCommunityRoutes(accountSession,origin,{sendMail,serviceRpc}={}) {
  const community = await load('../../lib/server/community.ts',{
    'server-only':{},'@/recruitment/lib/drafts':drafts,'./session':{accountSession},
    '@/recruitment/lib/supabase/config':{...(await import('../../lib/supabase/config.ts')),getAppOrigin:()=>origin},'@/recruitment/lib/site-paths':{recruitmentPath:path=>path},
    '@supabase/supabase-js':{createClient:()=>({rpc:serviceRpc||(async()=>({data:null,error:null}))})},
    nodemailer:{createTransport:()=>({sendMail:sendMail||(async()=>{throw new Error('No synthetic mail transport')}),close:()=>{}})},
  });
  const http=await load('../../lib/server/community-http.ts',{'server-only':{},'@/recruitment/lib/supabase/config':{getAppOrigin:()=>origin},'./community':community});
  const common={'@/recruitment/lib/server/community':community,'@/recruitment/lib/server/community-http':http,'@/recruitment/lib/drafts':drafts,'@/recruitment/lib/staff':staff};
  const shared=await import('../../lib/community.ts');
  return {
    http,
    route:await load('../../../app/(recruitment)/recruitment/api/community/route.ts',common),
    upload:await load('../../../app/(recruitment)/recruitment/api/community/upload/route.ts',{...common,'@/recruitment/lib/community':shared,sharp:require('sharp')}),
    file:await load('../../../app/(recruitment)/recruitment/api/community/file/route.ts',common),
  };
}
async function load(relative, dependencies) {
  await ready;
  const url = new URL(relative, import.meta.url);
  if (!sources.has(relative)) {
    const { code } = await transform(await readFile(url, "utf8"), { filename: fileURLToPath(url), jsc: { parser: { syntax: "typescript" } }, module: { type: "commonjs" } });
    sources.set(relative, code);
  }
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", sources.get(relative))(name => {
    if (!(name in dependencies)) throw new Error("Unexpected test dependency: " + name);
    return dependencies[name];
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

/** Actual route and authorization code; only the verified-session provider is synthetic. */
export async function createStaffRoute(accountSession, origin) {
  const server = await load("../../lib/server/staff.ts", { "server-only": {}, "./session": { accountSession }, "@/recruitment/lib/staff": staff });
  return load("../../../app/(recruitment)/recruitment/api/staff/route.ts", { "next/server": require("next/server"), "@/recruitment/lib/server/staff": server, "@/recruitment/lib/staff": staff, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

/** Actual draft action with a synthetic verified applicant session. */
export async function createDraftSave(applicantSession) {
  const actions = await load("../../../app/(recruitment)/recruitment/apply/actions.ts", { "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/server/session": { applicantSession } });
  return actions.saveApplicantDraft;
}

export async function createAuthCallback({ client, cookieStore, origin }) {
  return load("../../../app/(recruitment)/recruitment/auth/callback/route.ts", {
    "next/server": require("next/server"),
    "next/headers": { cookies: async () => cookieStore },
    "@/recruitment/lib/auth-return": await import("../../lib/auth-return.ts"),
    "@/recruitment/lib/member-entry": {memberEntry:async c=>c.rpc?(await import('../../lib/member-entry.ts')).memberEntry(c):'application'},
    "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin },
    "@/recruitment/lib/supabase/server": { createSupabaseClient: async () => client },
  });
}

export async function createMainAuthCallback({ client, origin }) {
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({data: {id: 'synthetic'}}), update() {return this;}, is: async () => ({error:null}), insert:async()=>({error:null}) };
  const wrapped = client && { ...client, auth: {...client.auth, getUser:async()=>({data:{user:{id:'synthetic',email:'synthetic@example.test',user_metadata:{}}}})} };
  return load("../../../app/(main)/auth/callback/route.ts", {
    "next/server": require("next/server"),
    "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin },
    "@/services/supabase-server.service": { getSupabaseServerClient: async () => wrapped },
    "@/services/supabase-admin.service": { getSupabaseAdminClient: () => ({from:()=>query}) },
  });
}

export async function createApplicationRoute(applicantSession, origin) {
  const server = await load("../../lib/server/applications.ts", { "server-only": {}, "./session": { applicantSession }, "@/recruitment/lib/applications": applications, "@/recruitment/lib/drafts": drafts });
  return load("../../../app/(recruitment)/recruitment/api/application/route.ts", { "next/server": require("next/server"), "@/recruitment/lib/server/applications": server, "@/app/(recruitment)/recruitment/apply/actions": { saveApplicantDraft: await createDraftSave(applicantSession) }, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createEvaluationRoute(accountSession, origin) {
  const server = await load("../../lib/server/evaluations.ts", { "server-only": {}, "./session": { accountSession }, "@/recruitment/lib/staff": staff, "@/recruitment/lib/evaluations": evaluations, "@/recruitment/lib/application-queue": applicationQueue });
  return load("../../../app/(recruitment)/recruitment/api/evaluations/route.ts", { "next/server": require("next/server"), "@/recruitment/lib/server/evaluations": server, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/staff": staff, "@/recruitment/lib/application-queue": applicationQueue, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createDecisionRoute(accountSession, origin) {
  const server = await load("../../lib/server/decisions.ts", { "server-only": {}, "./session": { accountSession }, "@/recruitment/lib/staff": staff, "@/recruitment/lib/decisions": decisions });
  return load("../../../app/(recruitment)/recruitment/api/decisions/route.ts", { "next/server": require("next/server"), "@/recruitment/lib/server/decisions": server, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/staff": staff, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createIntakeRoute(accountSession, origin) {
  const intake = await import("../../lib/intake.ts");
  const server = await load("../../lib/server/intake.ts", { "server-only": {}, "./session": { accountSession }, "@/recruitment/lib/staff": staff, "@/recruitment/lib/intake": intake });
  return load("../../../app/(recruitment)/recruitment/api/intake/route.ts", { "next/server": require("next/server"), "@/recruitment/lib/server/intake": server, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/staff": staff, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createExportRoute(accountSession, origin) {
  const exports = await import("../../lib/application-export.ts");
  const staffServer = await load("../../lib/server/staff.ts", { "server-only": {}, "./session": { accountSession }, "@/recruitment/lib/staff": staff });
  const server = await load("../../lib/server/application-export.ts", { "server-only": {}, "./staff": staffServer, "@/recruitment/lib/staff": staff, "@/recruitment/lib/application-queue": applicationQueue, "@/recruitment/lib/application-export": exports });
  return load("../../../app/(recruitment)/recruitment/api/applications/export/route.ts", { "@/recruitment/lib/server/application-export": server, "@/recruitment/lib/application-export": exports, "@/recruitment/lib/drafts": drafts, "@/recruitment/lib/staff": staff, "@/recruitment/lib/supabase/config": { getAppOrigin: () => origin } });
}

/** Real server loader with a substituted verified session. */
export async function createDraftLoader(applicantSession) {
  const server = await load("../../lib/server/drafts.ts", {
    "server-only": {}, "@/recruitment/lib/drafts": drafts,
    "@/recruitment/lib/applications": applications, "./session": { applicantSession },
    "@/recruitment/lib/member-entry": { memberEntry: async () => "application" },
  });
  return server.loadApplicantDraft;
}

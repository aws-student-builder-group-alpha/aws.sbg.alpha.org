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
    'server-only':{},'@/lib/drafts':drafts,'./session':{accountSession},
    '@/lib/supabase/config':{getAppOrigin:()=>origin},'@/lib/site-paths':{recruitmentPath:path=>path},
    '@supabase/supabase-js':{createClient:()=>({rpc:serviceRpc||(async()=>({data:null,error:null}))})},
    nodemailer:{createTransport:()=>({sendMail:sendMail||(async()=>{throw new Error('No synthetic mail transport')}),close:()=>{}})},
  });
  const http=await load('../../lib/server/community-http.ts',{'server-only':{},'@/lib/supabase/config':{getAppOrigin:()=>origin},'./community':community});
  const common={'@/lib/server/community':community,'@/lib/server/community-http':http,'@/lib/drafts':drafts,'@/lib/staff':staff};
  const shared=await import('../../lib/community.ts');
  return {
    http,
    route:await load('../../app/api/community/route.ts',common),
    upload:await load('../../app/api/community/upload/route.ts',{...common,'@/lib/community':shared,sharp:require('sharp')}),
    file:await load('../../app/api/community/file/route.ts',common),
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
  const server = await load("../../lib/server/staff.ts", { "server-only": {}, "./session": { accountSession }, "@/lib/staff": staff });
  return load("../../app/api/staff/route.ts", { "next/server": require("next/server"), "@/lib/server/staff": server, "@/lib/staff": staff, "@/lib/drafts": drafts, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

/** Actual draft action with a synthetic verified applicant session. */
export async function createDraftSave(applicantSession) {
  const actions = await load("../../app/apply/actions.ts", { "@/lib/drafts": drafts, "@/lib/server/session": { applicantSession } });
  return actions.saveApplicantDraft;
}

export async function createAuthCallback({ client, cookieStore, origin }) {
  return load("../../app/auth/callback/route.ts", {
    "next/server": require("next/server"),
    "next/headers": { cookies: async () => cookieStore },
    "@/lib/auth-return": await import("../../lib/auth-return.ts"),
    "@/lib/member-entry": {memberEntry:async client=>client.rpc?(await import('../../lib/member-entry.ts')).memberEntry(client):'application'},
    "@/lib/site-paths": await import("../../lib/site-paths.ts"),
    "@/lib/supabase/server": { createSupabaseClient: async () => client },
    "@/lib/supabase/config": { getAppOrigin: () => origin },
  });
}

export async function createApplicationRoute(applicantSession, origin) {
  const server = await load("../../lib/server/applications.ts", { "server-only": {}, "./session": { applicantSession }, "@/lib/applications": applications, "@/lib/drafts": drafts });
  return load("../../app/api/application/route.ts", { "next/server": require("next/server"), "@/lib/server/applications": server, "@/app/apply/actions": { saveApplicantDraft: await createDraftSave(applicantSession) }, "@/lib/drafts": drafts, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createEvaluationRoute(accountSession, origin) {
  const server = await load("../../lib/server/evaluations.ts", { "server-only": {}, "./session": { accountSession }, "@/lib/staff": staff, "@/lib/evaluations": evaluations, "@/lib/application-queue": applicationQueue });
  return load("../../app/api/evaluations/route.ts", { "next/server": require("next/server"), "@/lib/server/evaluations": server, "@/lib/drafts": drafts, "@/lib/staff": staff, "@/lib/application-queue": applicationQueue, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createDecisionRoute(accountSession, origin) {
  const server = await load("../../lib/server/decisions.ts", { "server-only": {}, "./session": { accountSession }, "@/lib/staff": staff, "@/lib/decisions": decisions });
  return load("../../app/api/decisions/route.ts", { "next/server": require("next/server"), "@/lib/server/decisions": server, "@/lib/drafts": drafts, "@/lib/staff": staff, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createIntakeRoute(accountSession, origin) {
  const intake = await import("../../lib/intake.ts");
  const server = await load("../../lib/server/intake.ts", { "server-only": {}, "./session": { accountSession }, "@/lib/staff": staff, "@/lib/intake": intake });
  return load("../../app/api/intake/route.ts", { "next/server": require("next/server"), "@/lib/server/intake": server, "@/lib/drafts": drafts, "@/lib/staff": staff, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

export async function createExportRoute(accountSession, origin) {
  const exports = await import("../../lib/application-export.ts");
  const staffServer = await load("../../lib/server/staff.ts", { "server-only": {}, "./session": { accountSession }, "@/lib/staff": staff });
  const server = await load("../../lib/server/application-export.ts", { "server-only": {}, "./staff": staffServer, "@/lib/staff": staff, "@/lib/application-queue": applicationQueue, "@/lib/application-export": exports });
  return load("../../app/api/applications/export/route.ts", { "@/lib/server/application-export": server, "@/lib/application-export": exports, "@/lib/drafts": drafts, "@/lib/staff": staff, "@/lib/supabase/config": { getAppOrigin: () => origin } });
}

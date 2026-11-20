import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url), { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();
async function compile(relative, dependencies) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  const { code } = await transform(await readFile(filename,"utf8"),{filename,jsc:{parser:{syntax:"typescript",tsx:true},transform:{react:{runtime:"automatic"}}},module:{type:"commonjs"}});
  const compiledModule = {exports:{}};
  new Function("require","module","exports",code)(name=>Object.hasOwn(dependencies,name)?dependencies[name]:require(name),compiledModule,compiledModule.exports);
  return compiledModule.exports;
}

test("new administrator pages retain Google-role-MFA entry boundaries", async () => {
  let session;
  const { administratorSession } = await compile("../../app/(recruitment)/recruitment/admin/access.tsx",{
    "@/app/(recruitment)/recruitment/components/workspace-skeleton":{}, "next/link":{},"@/app/(recruitment)/recruitment/components/admin-shell":{},"@/recruitment/lib/server/session":{accountSession:async()=>session},
    "next/navigation":{redirect:to=>{throw Error("redirect:"+to)},notFound:()=>{throw Error("not-found")}},
  });
  for(const value of [{kind:"anonymous"},{kind:"staff",membership:{role:"administrator",status:"suspended"}},{kind:"staff",membership:{role:"administrator",status:"active"},needsMfa:true}]){session=value;await assert.rejects(administratorSession(),/redirect:\/recruitment\/staff/)}
  for(const value of [{kind:"applicant"},{kind:"staff",membership:{role:"evaluator",status:"active"},needsMfa:false}]){session=value;await assert.rejects(administratorSession(),/not-found/)}
  for(const kind of ["unavailable","unconfigured"]){session={kind};assert.equal(await administratorSession(),null)}
  session={kind:"staff",identity:{id:"synthetic-account"},membership:{role:"administrator",status:"active"},needsMfa:false};assert.equal(await administratorSession(),session);
});

test("overview retains independent read failures and clears all results after known access loss", async () => {
  let session={identity:{id:"synthetic-account"}}, replies=[{ok:true,data:{queue:{total:36},items:Array(25).fill({})}},{ok:true,data:[{status:"active"}]},{ok:true,data:{state:"paused"}}],calls=[];
  const reader=index=>async accountId=>{calls.push(accountId);if(replies[index] instanceof Error)throw replies[index];return replies[index]};
  const page = await compile("../../app/(recruitment)/recruitment/admin/page.tsx",{
    "./access":{administratorSession:async()=>session,AdminLoading:"loading",AdminUnavailable:"unavailable"},
    "@/recruitment/lib/server/evaluations":{listEvaluations:reader(0)},"@/recruitment/lib/server/staff":{listStaff:reader(1)},"@/recruitment/lib/server/intake":{readIntake:reader(2)},
    "@/app/(recruitment)/recruitment/components/access-guard":{AccessGuard:"guard"},"./overview":{AdminOverview:"overview"},
  });
  const render=()=>page.default().props.children.type();
  let result=await render();assert.equal(result.type,"guard");assert.equal(result.props.expected,"administrator");assert.equal(result.props.children.props.applications.queue.total,36);assert.deepEqual(calls,Array(3).fill("synthetic-account"));
  replies[1]={ok:false,code:"UNAVAILABLE"};result=await render();assert.equal(result.props.children.props.staff,null);assert.equal(result.props.children.props.applications.queue.total,36);
  replies[2]=Error("Synthetic read outage");result=await render();assert.equal(result.props.children.props.intake,null);
  for(const code of ["AUTH_REQUIRED","ACCOUNT_CHANGED","MFA_REQUIRED","DENIED"]){replies[0]={ok:false,code};assert.equal((await render()).type,"unavailable")}
  calls=[];session=null;assert.equal((await render()).type,"unavailable");assert.deepEqual(calls,[]);
});

test("sidebar account display comes from the server session without inventing a pending identity", async () => {
  let session = {kind:"unavailable"};
  const layout = await compile("../../app/(recruitment)/recruitment/admin/layout.tsx", {
    "../components/recruitment-shell":{RecruitmentShell:"shell"},
    "../components/admin-shell":{AdminAccount:"account"},
    "@/recruitment/lib/server/session":{accountSession:async()=>session},
  });
  const shell = layout.default({children:"private page"});
  assert.equal(shell.props.frame,"administrator");
  assert.equal(shell.props.adminAccount.props.fallback.props.pending,true);
  const renderAccount = () => shell.props.adminAccount.props.children.type();
  let account = await renderAccount();assert.equal(account.props.signedIn,false);assert.equal(account.props.label,undefined);
  session = {kind:"staff",identity:{name:" Synthetic Admin ",email:"synthetic.admin@example.test"}};
  account = await renderAccount();assert.equal(account.props.label,"Synthetic Admin");assert.equal(account.props.signedIn,true);
  session.identity.name=" ";account=await renderAccount();assert.equal(account.props.label,"synthetic.admin@example.test");
});

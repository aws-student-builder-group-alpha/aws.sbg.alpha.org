// Actual components, HTTP authorization, transport and SQL; synthetic identity/navigation/motion only.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertProcessAppearance } from "../fixtures/browser-motion.mjs";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {validSubmission} from "../fixtures/submission.mjs";
import { evaluationRuntime } from "../fixtures/evaluation-runtime.mjs";
const require=createRequire(import.meta.url),project=fileURLToPath(new URL("../../",import.meta.url));
const {loadBindings,transform}=require("next/dist/build/swc");await loadBindings();
const modules=new Map();
for(const [name,relative] of [
  ["./application-export-control","app/components/application-export-control.tsx"],["@/lib/application-export-client","lib/application-export-client.ts"],["./application-export.ts","lib/application-export.ts"],
  ["./application-queue-controls","app/components/application-queue-controls.tsx"],["./application-queue.ts","lib/application-queue.ts"],["workspace","app/components/evaluation-workspace.tsx"],["./application-content","app/components/application-content.tsx"],["./access-guard","app/components/access-guard.tsx"],["./admin-navigation","app/components/admin-navigation.tsx"],["./ui","app/components/ui.tsx"],
  ["@/lib/evaluation-client","lib/evaluation-client.ts"],["./evaluations.ts","lib/evaluations.ts"],["@/lib/evaluation-workspace-state","lib/evaluation-workspace-state.ts"],
  ["./decision-panel","app/components/decision-panel.tsx"],["@/lib/decision-client","lib/decision-client.ts"],["@/lib/decisions","lib/decisions.ts"],["@/lib/decision-workspace-state","lib/decision-workspace-state.ts"],
  ["./applications.ts","lib/applications.ts"],["./staff.ts","lib/staff.ts"],["./drafts.ts","lib/drafts.ts"],["./catalog.ts","lib/catalog.ts"],["./http-request.ts","lib/http-request.ts"],["@/lib/format-date","lib/format-date.ts"],
]){const filename=path.join(project,relative);modules.set(name,(await transform(await readFile(filename,"utf8"),{filename,jsc:{parser:{syntax:"typescript",tsx:true},transform:{react:{runtime:"automatic"}}},module:{type:"commonjs"}})).code);}
for(const [alias,original] of [["@/lib/evaluations","./evaluations.ts"],["@/lib/catalog","./catalog.ts"],["@/lib/drafts","./drafts.ts"],["@/lib/http-request","./http-request.ts"],["@/app/components/access-guard","./access-guard"]])modules.set(alias,modules.get(original));
modules.set("./decisions.ts",modules.get("@/lib/decisions"));
modules.set("@/lib/application-queue",modules.get("./application-queue.ts"));
modules.set("@/lib/applications",modules.get("./applications.ts"));
for(const [name,pkg,file] of [["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],["scheduler","scheduler","scheduler.development.js"]])modules.set(name,await readFile(path.join(path.dirname(require.resolve(pkg+"/package.json")),"cjs",file),"utf8"));
modules.set("next/link","exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");
modules.set("next/image","exports.__esModule=true;exports.default=({priority,unoptimized,...props})=>require('react/jsx-runtime').jsx('img',props);");
modules.set("next/navigation","exports.usePathname=()=>window.shellPath||'/admin/applications';exports.useSelectedLayoutSegments=()=>(window.shellPath||'/admin/applications').split('/').filter(Boolean);");modules.set("@/app/auth/actions","exports.signOut=async()=>{};");
await installBrowserMotion(modules);
await installRecruitmentUI(modules);
const bundle=`(()=>{const process={env:{NODE_ENV:'development'}};const modules={${[...modules].map(([n,c])=>JSON.stringify(n)+":function(module,exports,require){"+c+"\n}").join(",")}};const cache={};function require(name){if(!cache[name]){if(!modules[name])throw Error('Unmocked module: '+name);const m=cache[name]={exports:{}};modules[name](m,m.exports,require);}return cache[name].exports;}const {jsx}=require('react/jsx-runtime');const root=require('react-dom/client').createRoot(document.getElementById('root'));let version=0;window.mount=props=>{window.shellPath=props.initialList.role==='administrator'?'/admin/applications':'/reviewer';root.render(jsx(require('recruitment-test-frame').Frame,{frame:props.initialList.role,staff:{role:props.initialList.role,status:'active',needsMfa:false},children:jsx(require('./access-guard').AccessGuard,{accountId:props.accountId,expected:props.initialList.role,children:jsx(require('workspace').EvaluationWorkspace,props)})},String(++version)));};})();`;
const origin="https://evaluations.example.test",runtime=await evaluationRuntime(origin),created=await runtime.createApplication();
const shell=await readFile(path.join(project,".next/server/app/admin.html"),"utf8"),styles=[...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m=>m[1]);assert.ok(styles.length,"Run npm run build first");
let browser,faults={posts:[]};const errors=[],passed=[];
const output=path.join(project,".next/verification/application-export");await mkdir(output,{recursive:true});
async function until(predicate){const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw Error("Request checkpoint timed out");await delay(10);}}
try{
 const {chromium}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:"playwright");browser=await chromium.launch({headless:true});const page=await browser.newPage({reducedMotion:"reduce"});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
 await page.route(origin+"/**",async route=>{
  const incoming=route.request(),url=new URL(incoming.url());
  if(styles.includes(url.pathname))return route.fulfill({contentType:"text/css",body:await readFile(path.join(project,".next",url.pathname.slice("/_next/".length)))});
  if(url.pathname.startsWith("/brand/"))return route.fulfill({body:await readFile(path.join(project,"public",url.pathname))});
  if(url.pathname==="/api/access")return route.fulfill({json:faults.access||await runtime.access()});
  if(!["/api/evaluations","/api/decisions","/api/applications/export"].includes(url.pathname))return route.fulfill({contentType:"text/html",body:`<html lang="en" data-theme="light"><head>${styles.map(s=>`<link rel="stylesheet" href="${s}">`).join("")}</head><body class="alpha-app"><div id="root"></div></body></html>`});
  if(faults.detailUnavailable&&url.searchParams.get("mode")==="detail")return route.fulfill({status:503,json:{ok:false,code:"UNAVAILABLE",message:"Synthetic detail outage"}});
  const body=incoming.method()==="POST"?JSON.parse(incoming.postData()):null;if(body)faults.posts.push(body);
  if(url.pathname==="/api/applications/export"){
    if(faults.exportStall){faults.exportWaiting=true;return;}
    if(faults.exportError)return route.fulfill({status:413,json:{ok:false,code:"TOO_LARGE",message:"This export exceeds the 64 MiB limit. Apply narrower filters and export again."}});
    const response=await runtime.exportHandlers.POST(new Request(incoming.url(),{method:"POST",headers:await incoming.allHeaders(),body:incoming.postData()}));
    const bytes=Buffer.from(await response.arrayBuffer());
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:faults.exportPartial?bytes.subarray(0,bytes.length-10):bytes});
  }
  const handlers=url.pathname==="/api/decisions"?runtime.decisionHandlers:runtime.handlers;
  const response=await handlers[incoming.method()](new Request(incoming.url(),{method:incoming.method(),headers:await incoming.allHeaders(),...(body?{body:incoming.postData()}:{})})),text=await response.text();
  if(incoming.method()==="GET"&&url.pathname==="/api/evaluations"&&url.searchParams.get("mode")==="list"&&faults.holdSearch===url.searchParams.get("search")){faults.held={route,status:response.status,headers:Object.fromEntries(response.headers),body:text};return;}
  if(body&&faults.stallAfter===body.request?.action){faults.committed=true;return;}
  return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:text});
 });
 await page.goto(origin);await page.addScriptTag({content:bundle});await page.clock.install();

 // Bulk rows are synthetic queue fixtures; production transitions remain covered separately.
 for(let i=0;i<35;i++){
  const owner=await runtime.addIdentity(),statuses=['Submitted','Under Review','Accepted','Waitlisted','Not Selected','Withdrawn'],status=statuses[i%6],committee=i%2===1;
  const data={...validSubmission(),track:committee?'COMMITTEE':'CORE_TEAM',opportunityId:committee?'committee-secretariat':'core-secretariat'};data.profile.fullName=i===0?'Literal %_ Applicant':'Queue Applicant '+i;
  const app=(await runtime.db.query("insert into applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id,status,withdrawn_at,withdraw_mutation_id,submitted_at) values($1,$2,$3,$4,'synthetic',now(),1,$5,$6,$7,$8,$9) returning id",[owner.id,'ALPHA-2026-'+crypto.randomUUID().replaceAll('-','').slice(0,12).toUpperCase(),owner.email,data,crypto.randomUUID(),status,status==='Withdrawn'?new Date():null,status==='Withdrawn'?crypto.randomUUID():null,new Date(1793000000000+i*1000)])).rows[0];
  await runtime.db.query('insert into application_public_history(application_id,version,status) values($1,1,$2)',[app.id,status]);
  if(!['Submitted','Withdrawn'].includes(status)){const assignment=crypto.randomUUID();await runtime.db.query('insert into evaluation_assignments(id,application_id,generation,evaluator_id,assigned_by) values($1,$2,1,$3,$4)',[assignment,app.id,runtime.first.id,runtime.admin.id]);if(status!=='Under Review'||i%12===1)await runtime.db.query("insert into evaluation_reviews(assignment_id,recommendation,notes,version) values($1,'Waitlisted','Synthetic private note',1)",[assignment]);}
 }
 async function mount(person){runtime.as(person);faults={posts:[]};const initialList=(await (await runtime.get()).json()).data;await page.evaluate(props=>window.mount(props),{accountId:person.id,initialList,redesign:true});await page.getByRole('heading',{name:initialList.role==='administrator'?'Applications':'Evaluator workspace',exact:true}).waitFor();}
 async function match(shown,total){await page.getByText(new RegExp(`^${shown} shown of ${total} matching applications`)).waitFor();assert.equal(await page.locator('.evaluation-list-item').count(),shown);}
 async function clear(){await page.getByRole('button',{name:'Clear filters',exact:true}).click();await match(25,36);}
 async function layout(label){await assertRecruitmentSurface(page,label);for(const colorScheme of ['light','dark'])for(const width of [320,375,414,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});await assertProcessAppearance(page,".recruitment-process",label);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' '+width);}}
 const downloads=[];page.on('download',download=>downloads.push(download));let unexpectedDialogs=0;page.on('dialog',async dialog=>{unexpectedDialogs++;await dialog.dismiss();});
 async function download(){const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).focus();await page.keyboard.press('Enter');const result=await event;assert.match(result.suggestedFilename(),/^alpha-applications-2026-\d{14}-PHT.csv$/);const file=await result.path();return readFile(file);}
 await mount(runtime.admin);await match(25,36);const bytes=await download();assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);const csv=bytes.toString('utf8');assert.equal(csv.split('\r\n').length,38);assert.ok(csv.includes('"Withdrawn"'));for(const secret of ['Synthetic private note','resumeUrl','portfolioUrl',runtime.first.email])assert.equal(csv.includes(secret),false);await page.getByText('CSV download started for 36 applications.',{exact:true}).waitFor();passed.push('actual CSV download exports all matching pages including Withdrawn with BOM and no private/evidence fields');
 await page.getByRole('button',{name:/^Filters\b/}).click();await page.getByLabel('Application status',{exact:true}).selectOption('Withdrawn');const unapplied=await download();assert.equal(unapplied.toString('utf8').split('\r\n').length,38);assert.equal(faults.posts.at(-1).filters.status,'all');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(5,5);const filtered=await download();assert.equal(filtered.toString('utf8').split('\r\n').length,7);assert.equal(faults.posts.at(-1).filters.status,'Withdrawn');passed.push('unapplied edits do not change export scope; applied filters export all matching rows');
 await clear();await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();await page.getByRole('heading',{name:'Submitted application',exact:true}).waitFor();await page.getByRole('tab',{name:'Review & decision',exact:true}).click();await page.getByLabel('Evaluator',{exact:true}).selectOption(runtime.first.id);await download();assert.equal(await page.getByLabel('Evaluator',{exact:true}).inputValue(),runtime.first.id);assert.equal(unexpectedDialogs,0);passed.push('download preserves dirty assignment input and bypasses leave/discard navigation prompts');
 faults.exportPartial=true;const before=downloads.length;await page.getByRole('button',{name:'Export CSV',exact:true}).click();await page.getByText(/The CSV could not be downloaded/).waitFor();assert.equal(downloads.length,before);assert.equal(await page.getByLabel('Evaluator',{exact:true}).inputValue(),runtime.first.id);delete faults.exportPartial;faults.exportError=true;await page.getByRole('button',{name:'Export CSV',exact:true}).click();await page.getByText(/exceeds the 64 MiB limit/).waitFor();assert.equal(downloads.length,before);delete faults.exportError;await download();passed.push('partial/oversized failures produce no file, preserve edits and allow a fresh retry');
 faults.exportStall=true;await page.getByRole('button',{name:'Export CSV',exact:true}).click();await until(()=>faults.exportWaiting);assert.equal(await page.getByLabel('Application status',{exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Cancel export',exact:true}).click();await page.getByText(/CSV export canceled/).waitFor();assert.equal(await page.getByLabel('Application status',{exact:true}).isDisabled(),false);const cancelledCount=downloads.length;await page.getByRole('button',{name:'Export CSV',exact:true}).click();await page.clock.fastForward(15010);await page.getByText(/The CSV could not be downloaded/).waitFor();assert.equal(downloads.length,cancelledCount);delete faults.exportStall;await download();passed.push('cancel and fifteen-second timeout restore controls without saving partial files');
 await layout('CSV export control');for(const width of [1440,375]){await page.setViewportSize({width,height:1000});if(width===375)await page.locator(".application-export").evaluate(node=>node.scrollIntoView({block:"start"}));else await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,`export-${width}.png`)});}passed.push('export controls wrap at six widths with both device preferences and reduced motion');
 await mount(runtime.first);assert.equal(await page.getByRole('button',{name:'Export CSV',exact:true}).count(),0);await mount(runtime.admin);faults.exportStall=true;await page.getByRole('button',{name:'Export CSV',exact:true}).click();await until(()=>faults.exportWaiting);faults.access={kind:'applicant',accountId:runtime.admin.id};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Your access has changed',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Export CSV',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Cancel export',exact:true}).count(),0);passed.push('evaluators have no export control and role loss cancels/unmounts a pending download');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,pageErrors:errors,screenshotDirectory:output},null,2));
}finally{await browser?.close();await runtime.db.close();}

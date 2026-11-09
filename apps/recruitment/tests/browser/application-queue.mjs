// Actual components, HTTP authorization, transport and SQL; synthetic identity/navigation/motion only.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertProcessAppearance, openDisclosure } from "../fixtures/browser-motion.mjs";
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
const output=path.join(project,".next/verification/application-queue");await mkdir(output,{recursive:true});
async function until(predicate){const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw Error("Request checkpoint timed out");await delay(10);}}
try{
 const {chromium}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:"playwright");browser=await chromium.launch({headless:true});const page=await browser.newPage({reducedMotion:"reduce"});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
 await page.route(origin+"/**",async route=>{
  const incoming=route.request(),url=new URL(incoming.url());
  if(styles.includes(url.pathname))return route.fulfill({contentType:"text/css",body:await readFile(path.join(project,".next",url.pathname.slice("/_next/".length)))});
  if(url.pathname.startsWith("/brand/"))return route.fulfill({body:await readFile(path.join(project,"public",url.pathname))});
  if(url.pathname==="/api/access")return route.fulfill({json:faults.access||await runtime.access()});
  if(!["/api/evaluations","/api/decisions"].includes(url.pathname))return route.fulfill({contentType:"text/html",body:`<html lang="en" data-theme="light"><head>${styles.map(s=>`<link rel="stylesheet" href="${s}">`).join("")}</head><body class="alpha-app"><div id="root"></div></body></html>`});
  if(faults.detailUnavailable&&url.searchParams.get("mode")==="detail")return route.fulfill({status:503,json:{ok:false,code:"UNAVAILABLE",message:"Synthetic detail outage"}});
  const body=incoming.method()==="POST"?JSON.parse(incoming.postData()):null;if(body)faults.posts.push(body);
  const handlers=url.pathname==="/api/decisions"?runtime.decisionHandlers:runtime.handlers;
  const response=await handlers[incoming.method()](new Request(incoming.url(),{method:incoming.method(),headers:await incoming.allHeaders(),...(body?{body:incoming.postData()}:{})})),text=await response.text();
  if(incoming.method()==="GET"&&url.pathname==="/api/evaluations"&&url.searchParams.get("mode")==="list"&&faults.holdSearch===url.searchParams.get("search")){faults.held={route,status:response.status,headers:Object.fromEntries(response.headers),body:text};return;}
  if(body&&faults.stallAfter===body.request.action){faults.committed=true;return;}
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
 async function clear(){if(await page.getByRole('button',{name:/^Filters\b/}).getAttribute('aria-expanded')!=='true')await page.getByRole('button',{name:/^Filters\b/}).click();await page.getByRole('button',{name:'Clear filters',exact:true}).click();await match(25,36);}
 async function layout(label){await assertRecruitmentSurface(page,label);for(const colorScheme of ['light','dark'])for(const width of [320,375,414,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});await assertProcessAppearance(page,".recruitment-process",label);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' '+width);}}
 await mount(runtime.admin);await match(25,36);assert.equal(await page.locator('.queue-status-counts div').filter({hasText:'Withdrawn'}).locator('dd').textContent(),'5');await page.getByRole('button',{name:'Load more applications',exact:true}).click();await match(36,36);assert.equal(await page.getByRole('button',{name:'Load more applications',exact:true}).count(),0);passed.push('matching counts include all pages and Withdrawn while loading more deduplicates rows');
 await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo(0,0));
 const firstRow=await page.locator('.evaluation-list-item').first().boundingBox();
 assert.ok(firstRow && firstRow.y>=81 && firstRow.y+firstRow.height<=900,'Applications appear below the landing navbar and above the fold without expanding filters');
 assert.equal(await page.locator('.site-header').evaluate(node=>node.getBoundingClientRect().height),81);
 assert.equal(await page.locator('.queue-count-disclosure').evaluate(node=>node.open),false);assert.equal(await page.locator('.queue-views-disclosure').evaluate(node=>node.open),false);assert.equal(await page.getByRole('button',{name:'Apply filters',exact:true}).isVisible(),false);await page.getByRole('button',{name:'Search',exact:true}).waitFor();
 await openDisclosure(page,'Queue views');
 for (const width of [320,375,768,1440,1920]) {
  await page.setViewportSize({width,height:1000});
  const bounds=await page.locator('.queue-shortcuts').evaluate(node=>{const row=node.getBoundingClientRect(),parent=node.closest('.workspace-queue-overview')?.getBoundingClientRect();return {left:row.left,right:row.right,parentLeft:parent?.left+parseFloat(getComputedStyle(node.closest(".workspace-queue-overview")).paddingLeft),parentRight:parent?.right,buttons:[...node.querySelectorAll('button')].map(button=>{const rect=button.getBoundingClientRect();return {left:rect.left,right:rect.right};})};});
  assert.equal(bounds.left,bounds.parentLeft,'Queue shortcuts align with the toolbar');
  assert.ok(bounds.right<=bounds.parentRight+1 && bounds.buttons.every(button=>button.left>=bounds.left-1 && button.right<=bounds.right+1),'Shortcut actions wrap inside the shared content gutters');
 }
 await page.locator('.queue-views-disclosure > summary').click();
 await page.setViewportSize({width:1440,height:900});
 const filterToggle=page.getByRole('button',{name:/^Filters\b/});
 assert.equal(await filterToggle.getAttribute('aria-expanded'),'false');
 assert.equal(await page.getByLabel('Application status',{exact:true}).isVisible(),false);
 await page.setViewportSize({width:375,height:1000});
 const mobileRow=await page.locator('.evaluation-list-item').first().boundingBox();
 assert.ok(mobileRow && mobileRow.y>=73 && mobileRow.y+mobileRow.height<=812,'The first application also fits below the landing navbar in an 812px-high mobile screen with filters collapsed');
 assert.equal(await filterToggle.getAttribute('aria-expanded'),'false');
 assert.equal(await page.getByLabel('Application status',{exact:true}).isVisible(),false);
 await filterToggle.click();await page.getByLabel('Application status',{exact:true}).selectOption('Under Review');
 await filterToggle.click();await match(36,36);await filterToggle.click();
 assert.equal(await page.getByLabel('Application status',{exact:true}).inputValue(),'Under Review');
 await page.getByLabel('Application status',{exact:true}).selectOption('all');await filterToggle.click();
 await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();
 await page.getByRole('heading',{name:'Submitted application',exact:true}).waitFor();
 const applicationTab=page.getByRole('tab',{name:'Application',exact:true});await applicationTab.focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.getByRole('tab',{name:'Review & decision',exact:true}).getAttribute('aria-selected'),'true');
 await page.getByLabel('Evaluator',{exact:true}).selectOption(runtime.first.id);
 await page.getByLabel('Assignment reason (optional)',{exact:true}).fill('Preserve my assignment draft');
 await page.getByRole('tab',{name:'History',exact:true}).click();await page.getByRole('heading',{name:'Private evaluation history',exact:true}).waitFor();
 await applicationTab.click();await page.getByRole('tab',{name:'Review & decision',exact:true}).click();
 assert.equal(await page.getByLabel('Assignment reason (optional)',{exact:true}).inputValue(),'Preserve my assignment draft');
 await page.getByRole('tab',{name:'Application',exact:true}).click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'detail-375.png')});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('tab',{name:'Review & decision',exact:true}).click();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'detail-1440.png')});
 await page.setViewportSize({width:375,height:1000});
 await page.getByRole('button',{name:'Back to list',exact:true}).click();
 await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();
 assert.equal(await page.getByLabel('Assignment reason (optional)',{exact:true}).inputValue(),'Preserve my assignment draft');
 await page.getByRole('button',{name:'Back to list',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('.evaluation-list-item').filter({hasNotText:created.app.reference}).first().click();
 await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();
 assert.equal(await page.getByLabel('Assignment reason (optional)',{exact:true}).inputValue(),'Preserve my assignment draft');
 assert.equal(faults.posts.length,0);
 await page.setViewportSize({width:1440,height:1000});await mount(runtime.admin);await match(25,36);
 await filterToggle.click();
 passed.push('mobile filters preserve unapplied values; keyboard tabs and Back to list preserve edits without writes; another record still requires discard confirmation');
 await page.getByLabel('Application status',{exact:true}).selectOption('Under Review');await page.getByLabel('Track',{exact:true}).selectOption('COMMITTEE');await page.getByText(/Filter changes have not been applied/).waitFor();await match(25,36);await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(6,6);assert.equal(await page.locator('.queue-status-counts div').filter({hasText:'Submitted'}).locator('dd').textContent(),'0');passed.push('explicit combined filters reset paging and counts follow all applied filters including status');
 await page.getByLabel('Opportunity',{exact:true}).selectOption('committee-secretariat');await page.getByLabel('Track',{exact:true}).selectOption('CORE_TEAM');assert.equal(await page.getByLabel('Opportunity',{exact:true}).inputValue(),'');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await page.getByText('No applications match the applied search and filters.',{exact:true}).waitFor();await match(0,0);await clear();passed.push('track changes clear incompatible opportunity selection and Clear filters restores defaults');
 await page.getByLabel('Evaluator assignment',{exact:true}).selectOption('assigned');await page.getByLabel('Current recommendation',{exact:true}).selectOption('missing');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(3,3);await page.getByLabel('Current recommendation',{exact:true}).selectOption('saved');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(21,21);passed.push('assignment and current-review filters distinguish Saved from Not saved without counting older reviews');
 await clear();await page.getByLabel('Search applications',{exact:true}).fill('%_');await page.getByRole('button',{name:'Search',exact:true}).click();await match(1,1);await page.getByText('Literal %_ Applicant',{exact:true}).waitFor();await layout('filtered queue');await clear();passed.push('literal search combines with filters and six widths remain usable with both device preferences');
 await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();await page.getByRole('heading',{name:'Submitted application',exact:true}).waitFor();await page.getByRole('tab',{name:'Review & decision',exact:true}).click();await page.getByLabel('Evaluator',{exact:true}).selectOption(runtime.first.id);await page.getByLabel('Application status',{exact:true}).selectOption('Accepted');page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Apply filters',exact:true}).click();assert.equal(await page.getByLabel('Evaluator',{exact:true}).inputValue(),runtime.first.id);await match(25,36);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(6,6);assert.equal(await page.getByRole('heading',{name:'Submitted application',exact:true}).count(),0);passed.push('dirty assignment survives a canceled filter change and is discarded only after confirmation');
 await clear();await page.locator('.evaluation-list-item').filter({hasText:created.app.reference}).click();await page.getByRole('heading',{name:'Submitted application',exact:true}).waitFor();await page.getByRole('tab',{name:'Review & decision',exact:true}).click();await page.getByLabel('Evaluator',{exact:true}).selectOption(runtime.first.id);await page.getByRole('button',{name:'Review evaluator assignment',exact:true}).click();faults.stallAfter='assign';await page.getByRole('button',{name:'Confirm assignment',exact:true}).click();await until(()=>faults.committed);await page.clock.fastForward(15010);await page.getByRole('button',{name:'Retry same assignment',exact:true}).waitFor();await page.evaluate(()=>document.querySelector('.application-queue-controls').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByRole('button',{name:'Back',exact:true}).isDisabled(),true);delete faults.stallAfter;await page.getByRole('button',{name:'Retry same assignment',exact:true}).click();await page.getByText('Evaluator assignment confirmed.',{exact:true}).waitFor();assert.equal(faults.posts.at(-1).request.mutationId,faults.posts.at(-2).request.mutationId);await match(25,36);passed.push('filter submission cannot discard an uncertain command; retry keeps its exact operation and refreshes matching counts');
 // Time out a delayed prior query, apply a new one, then release the obsolete response.
 faults.holdSearch='Delayed response';await page.getByLabel('Search applications',{exact:true}).fill('Delayed response');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await until(()=>faults.held);await page.clock.fastForward(8010);await page.getByRole('button',{name:'Retry applications',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Matching applications',exact:true}).count(),0);const held=faults.held;delete faults.holdSearch;await page.getByLabel('Search applications',{exact:true}).fill('%_');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await match(1,1);await held.route.fulfill({status:held.status,headers:held.headers,body:held.body}).catch(()=>{});await match(1,1);passed.push('failed reads hide old counts and an obsolete response cannot replace a newer applied query');
 await clear();if(await filterToggle.getAttribute('aria-expanded')==='true')await filterToggle.click();await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'queue-1440.png')});await page.setViewportSize({width:375,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'queue-375.png')});
 await mount(runtime.admin);await openDisclosure(page,'Queue views');
 for(const [label,status,assignment,review] of [['Unassigned','Submitted','unassigned','all'],['Awaiting recommendation','Under Review','assigned','missing'],['Ready for decision','Under Review','assigned','saved']]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForFunction(label=>document.querySelector('button[aria-pressed="true"]')?.textContent===label,label);
  const toggle=page.getByRole('button',{name:/^Filters\b/});if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  assert.equal(await page.getByLabel('Application status',{exact:true}).inputValue(),status);
  assert.equal(await page.getByLabel('Evaluator assignment',{exact:true}).inputValue(),assignment);
  assert.equal(await page.getByLabel('Current recommendation',{exact:true}).inputValue(),review);
 }
 await page.getByLabel('Track',{exact:true}).selectOption('COMMITTEE');await page.getByLabel('Opportunity',{exact:true}).selectOption('skillbuilders-web');await page.getByLabel('Search applications',{exact:true}).fill('scope-check');await page.getByRole('button',{name:'Apply filters',exact:true}).click();
 await page.getByRole('button',{name:'Unassigned',exact:true}).click();
 assert.equal(await page.getByLabel('Search applications',{exact:true}).inputValue(),'scope-check');assert.equal(await page.getByLabel('Track',{exact:true}).inputValue(),'COMMITTEE');assert.equal(await page.getByLabel('Opportunity',{exact:true}).inputValue(),'skillbuilders-web');
 await clear();passed.push('admin queue shortcuts apply actionable status filters and preserve applied scope');
 await mount(runtime.first);assert.equal(await page.getByRole('tablist').count(),0);assert.equal(await page.locator('.workspace-admin').count(),0);assert.equal(await page.locator('.queue-filter-toggle').count(),0);assert.equal(await page.getByRole('form',{name:'Application queue filters',exact:true}).count(),0);assert.equal(await page.getByRole('heading',{name:'Matching applications',exact:true}).count(),0);await page.getByRole('button',{name:'Search',exact:true}).waitFor();passed.push('evaluator keeps assigned-only search without administrator filters or counts');
 await mount(runtime.admin);faults.access={kind:'applicant',accountId:runtime.admin.id};await page.clock.runFor(100);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:'Your access has changed',exact:true}).waitFor();assert.equal(await page.locator('.application-queue-counts').count(),0);assert.equal(await page.locator('.evaluation-list-item').count(),0);passed.push('known administrator access loss unmounts queue rows, filters and counts');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,pageErrors:errors,screenshotDirectory:output},null,2));
}finally{await browser?.close();await runtime.db.close();}

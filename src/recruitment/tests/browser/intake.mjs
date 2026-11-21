import {recruitmentStyleShell} from "../fixtures/recruitment-build.mjs";
// Actual UI, transport, HTTP authorization and SQL; synthetic identity/navigation/motion only.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertInlineFailure, assertEnlargedProcess, assertProcessAppearance, openDisclosure, watchWorkspaceEntrance, assertWorkspaceEntrance, assertResponsiveEntrances } from "../fixtures/browser-motion.mjs";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { evaluationRuntime } from "../fixtures/evaluation-runtime.mjs";
const require=createRequire(import.meta.url),project=fileURLToPath(new URL("../../",import.meta.url));
const {loadBindings,transform}=require("next/dist/build/swc");await loadBindings();
const modules=new Map();
for(const [name,relative] of [
  ["workspace","../app/(recruitment)/recruitment/components/intake-workspace.tsx"],["./access-guard","../app/(recruitment)/recruitment/components/access-guard.tsx"],["./admin-navigation","../app/(recruitment)/recruitment/components/admin-navigation.tsx"],["./ui","../app/(recruitment)/recruitment/components/ui.tsx"],
  ["@/recruitment/lib/intake-client","lib/intake-client.ts"],["./intake.ts","lib/intake.ts"],["@/recruitment/lib/intake-workspace-state","lib/intake-workspace-state.ts"],
  ["./application-queue.ts","lib/application-queue.ts"],["./evaluations.ts","lib/evaluations.ts"],["./applications.ts","lib/applications.ts"],["./staff.ts","lib/staff.ts"],["./drafts.ts","lib/drafts.ts"],["./catalog.ts","lib/catalog.ts"],["./http-request.ts","lib/http-request.ts"],["@/recruitment/lib/format-date","lib/format-date.ts"],
]){const filename=path.join(project,relative);modules.set(name,(await transform(await readFile(filename,"utf8"),{filename,jsc:{parser:{syntax:"typescript",tsx:true},transform:{react:{runtime:"automatic"}}},module:{type:"commonjs"}})).code);}
for(const [alias,original] of [["@/recruitment/lib/intake","./intake.ts"],["@/recruitment/lib/evaluations","./evaluations.ts"],["@/recruitment/lib/catalog","./catalog.ts"],["@/recruitment/lib/drafts","./drafts.ts"],["@/recruitment/lib/http-request","./http-request.ts"]])modules.set(alias,modules.get(original));
for(const [name,pkg,file] of [["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],["scheduler","scheduler","scheduler.development.js"]])modules.set(name,await readFile(path.join(path.dirname(require.resolve(pkg+"/package.json")),"cjs",file),"utf8"));
modules.set("next/link","exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");modules.set("next/image","exports.__esModule=true;exports.default=({priority,unoptimized,...props})=>require('react/jsx-runtime').jsx('img',props);");
modules.set("next/navigation","exports.usePathname=()=>'/recruitment/admin/intake';exports.useSelectedLayoutSegments=()=>['admin','intake'];");modules.set("@/app/(recruitment)/recruitment/auth/actions","exports.signOut=async()=>{};");
await installBrowserMotion(modules, { realEntrances: true });
await installRecruitmentUI(modules);
const bundle=`(()=>{const process={env:{NODE_ENV:'development'}};const modules={${[...modules].map(([n,c])=>JSON.stringify(n)+":function(module,exports,require){"+c+"\n}").join(",")}};const cache={};function require(name){if(!cache[name]){if(!modules[name])throw Error('Unmocked module: '+name);const m=cache[name]={exports:{}};modules[name](m,m.exports,require);}return cache[name].exports;}const {jsx}=require('react/jsx-runtime');const root=require('react-dom/client').createRoot(document.getElementById('root'));let version=0;window.mount=props=>root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',staff:{role:'administrator',status:'active',needsMfa:false},children:jsx(require('./access-guard').AccessGuard,{accountId:props.accountId,expected:'administrator',children:jsx(require('workspace').IntakeWorkspace,props)})},String(++version)));})();`;
const origin="https://intake.example.test",runtime=await evaluationRuntime(origin);
const buildDirectory=path.resolve(project,process.env.ALPHA_BROWSER_BUILD_DIR||"../../.next");
const shell=await recruitmentStyleShell(),styles=[...shell.matchAll(/href="([^"?]+\.css)(?:\?[^\"]*)?"/g)].map(m=>m[1]);assert.ok(styles.length,"Run npm run build first");
let browser,faults={posts:[]};const errors=[],passed=[];const output=path.join(project,".next/verification/intake");await mkdir(output,{recursive:true});
async function until(predicate){const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw Error("Request checkpoint timed out");await delay(10);}}
async function change(action){runtime.as(runtime.admin);const state=await runtime.rpc("intake_state");return runtime.rpc("manage_intake",{p_request:{action,expectedVersion:state.version,reason:"Other administrator synthetic reason",mutationId:crypto.randomUUID()}});}
try{
 const {chromium}=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:"playwright");browser=await chromium.launch({headless:true});const page=await browser.newPage({reducedMotion:"reduce"});page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
 await page.route(origin+"/**",async route=>{
  const incoming=route.request(),url=new URL(incoming.url());
  if(styles.includes(url.pathname))return route.fulfill({contentType:"text/css",body:await readFile(path.join(buildDirectory,url.pathname.replace(/^\/recruitment(?=\/_next\/)/,"").slice("/_next/".length)))});
  if(url.pathname.startsWith("/recruitment/brand/"))return route.fulfill({body:await readFile(path.join(project,"../../public",url.pathname))});
  if(url.pathname==="/recruitment/api/access")return route.fulfill({json:faults.access||await runtime.access()});
  if(url.pathname!=="/recruitment/api/intake")return route.fulfill({contentType:"text/html",body:`<html lang="en" data-theme="light"><head>${styles.map(s=>`<link rel="stylesheet" href="${s}">`).join("")}</head><body class="alpha-app"><div id="root"></div></body></html>`});
  if(incoming.method()==="GET"&&url.searchParams.get("mode")==="history"&&faults.historyUnavailable)return route.fulfill({status:503,json:{ok:false,code:"UNAVAILABLE",message:"Synthetic history outage"}});
  if(incoming.method()==="GET"&&url.searchParams.get("mode")==="state"){
    if(faults.stateUnavailable)return route.fulfill({status:503,json:{ok:false,code:"UNAVAILABLE",message:"Synthetic intake outage"}});
    if(faults.oldState){const old=faults.oldState;delete faults.oldState;return route.fulfill({json:{ok:true,data:old}});}
  }
  const body=incoming.method()==="POST"?JSON.parse(incoming.postData()):null;if(body)faults.posts.push(body);
  if(body&&faults.stallBefore){faults.waiting=true;return;}
  const response=await runtime.intakeHandlers[incoming.method()](new Request(incoming.url(),{method:incoming.method(),headers:await incoming.allHeaders(),...(body?{body:incoming.postData()}:{})})),text=await response.text();
  if(body&&faults.stallAfter){faults.committed=true;return;}
  return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:text});
 });
 await page.goto(origin);await page.addScriptTag({content:bundle});await page.clock.install();
 async function mount(options={}){runtime.as(runtime.admin);faults={posts:[],...options};const initialState=await runtime.rpc("intake_state");await page.evaluate(props=>window.mount(props),{accountId:runtime.admin.id,initialState});await page.getByRole("heading",{name:"Submission availability",exact:true}).waitFor();}
 async function layout(label){await assertRecruitmentSurface(page,label);for(const colorScheme of ["light","dark"])for(const width of [320,375,414,768,1024,1280,1440]){await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});await assertProcessAppearance(page,".recruitment-process",label);assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),"light");assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+" "+width);const dialog=page.getByRole("dialog");if(await dialog.count())assert.equal(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false,label+" dialog "+width);}}
 async function openNavigation(){const button=page.getByRole("button",{name:"Admin sections",exact:true});if(await button.isVisible()&&await button.getAttribute("aria-expanded")!=="true")await button.click();}
 async function prepare(action,reason="Private synthetic intake reason"){await page.getByLabel("Intake change",{exact:true}).selectOption(action);await page.getByLabel("Private reason (required)",{exact:true}).fill(reason);await page.getByRole("button",{name:"Review intake change",exact:true}).click();await page.getByRole("dialog").waitFor().catch(async error=>{throw new Error(error.message+" UI: "+await page.locator("main").innerText());});}
 async function confirm(){await page.getByRole("button",{name:"Confirm intake change",exact:true}).click();await page.getByRole("dialog").waitFor({state:"detached"});await page.getByText("Intake change confirmed.",{exact:true}).waitFor();}
 async function assertAvailability(title, configured) {
   await page.locator(".intake-availability").getByText(title, { exact: true }).waitFor();
   assert.equal(await page.locator(".intake-configured dd").textContent(), configured);
 }
 await assertResponsiveEntrances(page, async () => {
   const panels = ".intake-workspace-columns";
   await watchWorkspaceEntrance(page, panels);
   await mount();
   await assertWorkspaceEntrance(page, panels);
 });
 passed.push("intake panels enter on desktop and phone");
 await mount({historyUnavailable:true});await page.getByRole("button",{name:"Retry intake history",exact:true}).waitFor();assert.equal(await page.locator(".workspace-disclosure").evaluate(node=>node.open),true);delete faults.historyUnavailable;await page.getByRole("button",{name:"Retry intake history",exact:true}).click();await page.getByRole("button",{name:"Retry intake history",exact:true}).waitFor({state:"detached"});
 await mount();
 const history = page.locator(".intake-history");
 assert.equal(await history.evaluate(node => node.open), false);
 await history.locator("summary").focus();
 await page.keyboard.press("Enter");
 await history.getByText("No intake changes have been recorded.", { exact: true }).waitFor();
 await runtime.db.exec("update recruitment_settings set opens_at=clock_timestamp()+interval '1 day',closes_at=clock_timestamp()+interval '31 days'");await mount();await assertAvailability("Scheduled to open", "Open");
 const schedule = await page.locator(".intake-schedule time").evaluateAll(nodes => nodes.map(node => ({ iso: node.dateTime, label: node.textContent })));
 const formatPhilippineTime = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
 assert.equal(schedule.length, 2);
 for (const { iso, label } of schedule) assert.equal(label, formatPhilippineTime.format(new Date(iso)));
 await page.getByText("Philippine time", { exact: true }).waitFor();
 await openNavigation();await page.locator(".admin-section-links:visible").getByRole("link",{name:"Intake",exact:true}).getAttribute("aria-current").then(v=>assert.equal(v,"page"));await page.keyboard.press("Escape");await layout("scheduled intake");passed.push("admin Intake tab shows configured/effective state and Philippine dates before opening");
 assert.equal(await page.locator('.site-header,.site-header-space').count(),0);
 await assertInlineFailure(page,'Review intake change','intake-action');await page.getByLabel('Intake change',{exact:true}).selectOption('pause');await assertInlineFailure(page,'Review intake change','intake-reason');await page.getByLabel('Private reason (required)',{exact:true}).fill('??'.repeat(501));await assertInlineFailure(page,'Review intake change','intake-reason');await assertEnlargedProcess(page,'intake-reason');await page.getByLabel('Private reason (required)',{exact:true}).fill('');await page.getByLabel('Intake change',{exact:true}).selectOption('');
 await mount();
 for (const width of [375, 1024, 1200, 1440]) {
   await page.setViewportSize({ width, height: 950 });
   const columns = selector => page.locator(selector).evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
   assert.equal(await columns(".intake-workspace-columns"), width >= 1200 ? 2 : 1);
   assert.equal(await columns(".intake-schedule"), width >= 480 ? 2 : 1);
   if (width === 375 || width === 1440) {
     await page.evaluate(() => { document.activeElement?.blur(); document.querySelector(".admin-workspace").scrollTop = 0; });
     await page.screenshot({ path: path.join(output, `intake-${width}.png`) });
   }
 }
 passed.push("availability and controls reflow within the admin shell, and empty private history opens by keyboard");
 await page.getByLabel("Intake change",{exact:true}).selectOption("pause");await page.getByRole("button",{name:"Review intake change",exact:true}).click();assert.equal(await page.getByRole("dialog").count(),0);await prepare("pause","Private reason "+"context ".repeat(45));await layout("pause confirmation");await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"detached"});assert.equal(await page.getByRole("button",{name:"Review intake change",exact:true}).evaluate(n=>n===document.activeElement),true);await prepare("pause");await confirm();await assertAvailability("Submissions paused", "Paused");await prepare("resume");await confirm();await assertAvailability("Scheduled to open", "Open");passed.push("required reason, responsive native confirmation, Escape focus and pause/resume preserve scheduled opening");
 await runtime.db.exec("update recruitment_settings set opens_at=clock_timestamp()-interval '1 day',closes_at=clock_timestamp()+interval '1 day'");await mount();await assertAvailability("Accepting submissions", "Open");await prepare("pause");faults.stallAfter=true;await page.getByRole("button",{name:"Confirm intake change",exact:true}).click();await until(()=>faults.committed);await page.clock.fastForward(15010);await page.getByRole("button",{name:"Retry same intake change",exact:true}).waitFor();await page.getByRole("button",{name:"Check latest intake",exact:true}).click();assert.equal(await page.getByRole("button",{name:"Back",exact:true}).isDisabled(),true);delete faults.stallAfter;await page.getByRole("button",{name:"Retry same intake change",exact:true}).click();await page.getByText("Intake change confirmed.",{exact:true}).waitFor();assert.deepEqual(faults.posts.at(-1),faults.posts.at(-2));assert.equal((await runtime.rpc("intake_history_page")).items.filter(e=>e.version===faults.posts.at(-1).request.expectedVersion+1).length,1);passed.push("lost acknowledgement times out and preserves exact command across reconciliation without duplicate audit");
 const old=await runtime.rpc("intake_state");await prepare("resume");await confirm();faults.oldState=old;await page.getByRole("button",{name:"Reload intake details",exact:true}).click();await until(()=>!faults.oldState);await assertAvailability("Accepting submissions", "Open");await prepare("pause","Local stale confirmation reason");await change("pause");await page.getByRole("button",{name:"Confirm intake change",exact:true}).click();await page.getByRole("dialog").getByText(/Intake changed in another session/).waitFor();assert.equal(await page.getByRole("button",{name:"Confirm intake change",exact:true}).isDisabled(),true);await page.getByRole("dialog").getByText("Reason: Local stale confirmation reason",{exact:true}).waitFor();page.once("dialog",d=>d.dismiss());await page.getByRole("button",{name:"Check latest intake",exact:true}).click();assert.equal(await page.getByRole("dialog").count(),1);page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Check latest intake",exact:true}).click();await page.getByRole("dialog").waitFor({state:"detached"});await page.waitForFunction(()=>document.querySelector("#intake-reason")?.value==='');assert.equal(await page.getByLabel("Private reason (required)",{exact:true}).inputValue(),"");passed.push("old reads cannot downgrade state; competing administrator confirmation preserves reason until explicit discard");
 await page.getByLabel("Private reason (required)",{exact:true}).fill("Keep during outage");faults.stateUnavailable=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole("button",{name:"Retry intake access",exact:true}).waitFor();assert.equal(await page.getByLabel("Private reason (required)").isVisible(),false);delete faults.stateUnavailable;await page.getByRole("button",{name:"Retry intake access",exact:true}).click();await page.getByLabel("Private reason (required)").waitFor();assert.equal(await page.getByLabel("Private reason (required)").inputValue(),"Keep during outage");await openNavigation();page.once("dialog",d=>d.dismiss());await page.locator(".admin-section-links:visible").getByRole("link",{name:"Applications",exact:true}).click();assert.equal(await page.getByLabel("Private reason (required)").inputValue(),"Keep during outage");passed.push("verification outage hides private content and canceled navigation preserves local input");
 await mount();for(let i=0;i<28;i++)await change(i%2?"pause":"resume");await mount();assert.equal(await page.locator(".workspace-disclosure").evaluate(node=>node.open),false);await openDisclosure(page,"Private intake history");await page.getByRole("button",{name:"Load earlier intake changes",exact:true}).click();await page.getByText("Reason: Private synthetic intake reason",{exact:true}).first().waitFor();await layout("private audit");
 const auditList = page.locator(".intake-history-list");
 assert.ok(await auditList.locator("li").count() > 25);
 for (const width of [1440, 375]) {
   await page.setViewportSize({ width, height: 1000 });
   await history.evaluate(node => node.scrollIntoView({ block: "start" }));
   assert.equal(await page.locator(".admin-workspace").evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
   assert.equal(await page.evaluate(() => scrollY), 0);
   await page.screenshot({ path: path.join(output, `intake-history-${width}.png`) });
 }
 passed.push("private paginated history and long reasons fit all seven widths in both device preferences");
 await runtime.db.exec("update recruitment_settings set closes_at=clock_timestamp()-interval '1 hour'");await mount();await assertAvailability("Deadline passed", "Paused");assert.deepEqual(await page.locator('#intake-action option').allTextContents(),["Choose a change","Close intake permanently"]);await prepare("close");await page.getByText(/Close intake permanently\?/).waitFor();await confirm();await assertAvailability("Intake closed", "Closed");await page.getByText("Intake is finally closed. Reopening is unavailable in this app.",{exact:true}).waitFor();assert.equal(await page.getByLabel("Intake change",{exact:true}).count(),0);passed.push("deadline leaves only final Close and acknowledged closure removes every transition");
 await runtime.db.exec("update recruitment_settings set intake_state='open',closes_at=clock_timestamp()+interval '1 day'");await mount();await prepare("pause","Pending role loss");faults.stallBefore=true;await page.getByRole("button",{name:"Confirm intake change",exact:true}).click();await until(()=>faults.waiting);faults.access={kind:"applicant",accountId:runtime.admin.id};await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole("heading",{name:"Your access has changed",exact:true}).waitFor();assert.equal(await page.locator('.intake-workspace').count(),0);assert.equal(await page.getByRole("dialog").count(),0);passed.push("confirmed role loss unmounts private history, reason and uncertain confirmation");
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed,pageErrors:errors,screenshotDirectory:output},null,2));
}finally{await browser?.close();await runtime.db.close();}

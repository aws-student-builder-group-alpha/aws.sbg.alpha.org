// Actual applicant components, HTTP handlers, validation, queue, and SQL. Synthetic identity and motion.
// No real applicant data, Google login, credentials, or hosted mutations.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertProcessAppearance, openDisclosure } from "../fixtures/browser-motion.mjs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { applicationRuntime } from "../fixtures/application-runtime.mjs";
import { validSubmission, validSimplifiedSubmission } from "../fixtures/submission.mjs";
import { blockedDestination } from "../../lib/application-progress.ts";
import { draftFromRow, upgradeDraft } from "../../lib/drafts.ts";
import { getOpportunity } from "../../lib/catalog.ts";

const require = createRequire(import.meta.url), project = fileURLToPath(new URL("../../", import.meta.url));
const { loadBindings, transform } = require("next/dist/build/swc");
await loadBindings();
const modules = new Map();
for (const [name, relative] of [
  ["home","app/opportunities/opportunity-directory.tsx"],
  ["@/lib/intake","lib/intake.ts"],["./staff.ts","lib/staff.ts"],["./application-queue.ts","lib/application-queue.ts"],["./evaluations.ts","lib/evaluations.ts"],["editor","app/apply/draft-editor.tsx"],["@/app/apply/start-draft","app/apply/start-draft.tsx"],["./start-draft","app/apply/start-draft.tsx"],["./apply-entry","app/apply/apply-entry.tsx"],["entry","app/components/applicant-access.tsx"],["portal","app/application/application-portal.tsx"],
  ["@/app/components/application-content","app/components/application-content.tsx"],["@/app/components/access-guard","app/components/access-guard.tsx"],
  ["@/app/components/ui","app/components/ui.tsx"],["@/lib/application-client","lib/application-client.ts"],["@/app/components/process-shell","app/components/process-shell.tsx"],
  ["./wave-gradient","app/components/wave-gradient.tsx"],
  ["@/app/components/application-introduction","app/components/application-introduction.tsx"],
  ["./immersive-card","app/components/immersive-card.tsx"],["./home-preparation","app/components/home-preparation.tsx"],
  ["@/lib/application-progress","lib/application-progress.ts"],["./applications.ts","lib/applications.ts"],["./catalog.ts","lib/catalog.ts"],["./drafts.ts","lib/drafts.ts"],
  ["@/lib/draft-save-queue","lib/draft-save-queue.ts"],["./http-request.ts","lib/http-request.ts"],["@/lib/format-date","lib/format-date.ts"],
]) {
  const filename = path.join(project, relative);
  const { code } = await transform(await readFile(filename,"utf8"), { filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
  modules.set(name, code);
}
for (const [alias, original] of [["./process-shell","@/app/components/process-shell"],["@/lib/catalog","./catalog.ts"],["@/lib/drafts","./drafts.ts"],["@/lib/applications","./applications.ts"],["@/lib/http-request","./http-request.ts"],["./ui","@/app/components/ui"],["@/app/apply/apply-entry","./apply-entry"]]) modules.set(alias, modules.get(original));
modules.set("./application-introduction", modules.get("@/app/components/application-introduction"));
for (const [name,pkg,file] of [
  ["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],
  ["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],["scheduler","scheduler","scheduler.development.js"],
]) modules.set(name,await readFile(path.join(path.dirname(require.resolve(pkg+"/package.json")),"cjs",file),"utf8"));
modules.set("next/link","exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',{...props,onClick:event=>{if(window.shellPath==='/opportunities'&&props.href?.startsWith('/opportunities')){event.preventDefault();history.pushState({},'',props.href);dispatchEvent(new PopStateEvent('popstate'));}else props.onClick?.(event)}});");
modules.set("next/image","exports.__esModule=true;exports.default=({priority,unoptimized,...props})=>require('react/jsx-runtime').jsx('img',props);");
modules.set("next/navigation","exports.usePathname=()=>window.shellPath||'/apply';exports.useSearchParams=()=>new URLSearchParams(require('react').useSyncExternalStore(cb=>{addEventListener('popstate',cb);return()=>removeEventListener('popstate',cb)},()=>location.search));exports.useSelectedLayoutSegments=()=>(window.shellPath||'/apply').split('/').filter(Boolean);const router={replace:path=>{window.destination=path;if(window.shellPath==='/opportunities'){history.replaceState({},'',path);dispatchEvent(new PopStateEvent('popstate'));}},push:path=>{window.destination=path;if(window.shellPath==='/opportunities'){history.pushState({},'',path);dispatchEvent(new PopStateEvent('popstate'));}},refresh:()=>{}};exports.useRouter=()=>router;");
modules.set("@/app/auth/actions","exports.signOut=async()=>{};exports.signIn=async data=>{window.signInOpportunity=data.get('opportunity');await new Promise(resolve=>window.resolveSignIn=resolve)};exports.startApplication=exports.signIn;");
await installBrowserMotion(modules);
await installRecruitmentUI(modules);
for (const [name, module] of [["ui","@/app/components/ui"],["home-preparation","./home-preparation"],["immersive-card","./immersive-card"]]) modules.set("./components/"+name,modules.get(module));
modules.set("./components/motion","exports.useHeroMotion=exports.useHeroLetterMotion=exports.useHomeScrollMotion=exports.useOpportunityTextMotion=()=>{};");
modules.set("./components/home-preloader","exports.HomePreloader=()=>null;");
modules.set("./components/hero-gradient","exports.HeroGradient=()=>null;");
modules.set("./immersive-home.css","");
const homeStyles = await readFile(path.join(project,"app/immersive-home.css"),"utf8") + await readFile(path.join(project,"app/opportunities/opportunities.css"),"utf8");
const bundle = `(()=>{const process={env:{NODE_ENV:'development'}};const modules={${[...modules].map(([name,code])=>JSON.stringify(name)+":function(module,exports,require){"+code+"\n}").join(",")}};
const cache={};function require(name){if(!cache[name]){if(!modules[name])throw Error('Unmocked browser module: '+name);const module=cache[name]={exports:{}};modules[name](module,module.exports,require);}return cache[name].exports;}
const {jsx}=require('react/jsx-runtime');const root=require('react-dom/client').createRoot(document.getElementById('root'));let revision=0;
const renderShell=(content,signedIn=true)=>require('react/jsx-runtime').jsxs(require('react').Fragment,{children:[jsx(require('@/app/components/ui').SiteHeader,{signedIn}),window.shellPath==='/application'?jsx(require('./recruitment-shell').RecruitmentShell,{frame:'applicant',children:content}):content,jsx(require('@/app/components/ui').Footer,{})]},String(++revision));
window.mount=(kind,props)=>{window.shellPath=kind==='editor'?'/apply':'/application';window.destination='';require('react-dom').flushSync(()=>root.render(renderShell(jsx(require('@/app/components/access-guard').AccessGuard,{accountId:props.applicant?.id||props.accountId,expected:'applicant',blockedContent:kind==='editor'?jsx(require('./apply-entry').ApplyAccessChanged,{}):undefined,children:jsx(require(kind==='editor'?'editor':'portal')[kind==='editor'?'DraftEditor':'ApplicationPortal'],props)}))));};
window.mountEntry=props=>{window.shellPath='/apply';root.render(renderShell(jsx(require('entry').ApplicantAccess,{...props,formEntry:true}),false));};
window.mountLoading=()=>{window.shellPath='/apply';root.render(renderShell(jsx(require('./apply-entry').ApplyLoading,{}),false));};
window.mountHome=(entry={kind:'anonymous'})=>{window.shellPath='/opportunities';history.replaceState({},'','/opportunities');require('react-dom').flushSync(()=>root.render(renderShell(jsx(require('react').Fragment,{children:[jsx('style',{children:${JSON.stringify(homeStyles)}}),jsx(require('home').OpportunityDirectory,{entry})]}),false)));};
window.mountFeedback=()=>{const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/components/ui');window.shellPath='/privacy';require('react-dom').flushSync(()=>root.render(renderShell(jsx('main',{id:'main-content',className:'container portal narrow',children:jsxs('section',{children:[...['info','success','warning','error'].map(tone=>jsx(ui.Callout,{tone,title:tone+' example',role:tone==='error'?'alert':tone==='success'?'status':undefined,children:jsxs('div',{children:[jsx('p',{children:'Readable feedback with an explicit recovery action.'}),jsx('button',{type:'button',className:'text-button',children:'Retry '+tone})]})},tone)),jsx('label',{htmlFor:'feedback-field',children:'Example field'}),jsx('input',{id:'feedback-field','aria-invalid':true,'aria-describedby':'feedback-field-error'}),jsx(ui.FieldError,{id:'feedback-field-error',children:'Enter a valid value.'}),jsx(ui.ErrorSummary,{children:jsx('a',{href:'#feedback-field',children:'Check the example field'})})]})}),false)));};
window.mountDepth=()=>{window.shellPath='/';const {jsx,jsxs}=require('react/jsx-runtime');require('react-dom').flushSync(()=>root.render(renderShell(jsxs('main',{id:'main-content',className:'recruitment-home container',style:{paddingBlock:'120px 60px'},children:[jsx('style',{children:${JSON.stringify(homeStyles)}}),jsxs('div',{style:{display:'grid',gap:'32px',maxWidth:'560px'},children:[jsxs(require('./immersive-card').ImmersiveCard,{className:'track-option',children:[jsx('h3',{className:'card-depth',children:'Core Team'}),jsx('p',{children:'Explore opportunities before choosing a role.'}),jsx('a',{href:'#home-preparation',className:'track-link',children:'Read preparation'})]}),jsx('div',{className:'preparation-card-stage',children:jsx(require('./home-preparation').HomePreparation,{})})]})]}),false)));};
window.mountShell=(path,props={})=>{window.shellPath=path;require('react-dom').flushSync(()=>root.render(require('react/jsx-runtime').jsxs(require('react').Fragment,{children:[jsx(require('@/app/components/ui').SiteHeader,props),jsx(require('@/app/components/ui').Footer,{})]},String(++revision))));};
window.mountNavigation=(path,props)=>{window.shellPath=path;const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/components/ui'),home=path==='/';const staff=path.startsWith('/admin')?{role:'administrator',status:'active',needsMfa:false}:path==='/reviewer'?{role:'evaluator',status:'active',needsMfa:false}:undefined;require('react-dom').flushSync(()=>root.render(jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,props||{signedIn:!!staff,staff}),jsx('main',{id:'main-content',className:'workspace-redesign',children:home?jsxs(require('react').Fragment,{children:[jsx('section',{className:'brand-hero',style:{height:'100vh'}}),jsx('section',{className:'home-recruitment-overlay',style:{height:'1800px'}})]}):jsx('section',{style:{height:'3000px'}})}),jsx(ui.Footer,{})]},String(++revision))));};})();`;
const runtime = await applicationRuntime(), origin = "https://application.example.test";
const buildDirectory = path.resolve(project, process.env.ALPHA_BROWSER_BUILD_DIR || ".next");
const shell = await readFile(path.join(buildDirectory,"server/app/admin.html"),"utf8");
const styles = [...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(match=>match[1]);
assert.ok(styles.length,"Run npm run build before this check");
let browser, faults = { posts: [] };
const passed = [], errors = [];
async function until(predicate) { const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw Error("Synthetic request checkpoint timeout");await delay(10);} }
try {
  const { chromium } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : "playwright");
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({reducedMotion:"reduce"});
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  page.on("pageerror",error=>errors.push(error.message));
  await page.route(origin+"/**",async route=>{
    const incoming=route.request(),url=new URL(incoming.url());
    if(styles.includes(url.pathname))return route.fulfill({contentType:"text/css; charset=utf-8",body:await readFile(path.join(buildDirectory,url.pathname.split("/_next/")[1]))});
    if(url.pathname.startsWith("/brand/"))return route.fulfill({body:await readFile(path.join(project,"public",url.pathname))});
    if(url.pathname==="/api/opportunities") {
      if(faults.vacanciesUnavailable)return route.fulfill({status:503,json:{ok:false}});
      const value=(await runtime.db.query("select opportunity_availability() value")).rows[0].value;
      return route.fulfill({json:faults.zeroVacancies?{...value,items:value.items.map(item=>item.capacity===null?item:{...item,remaining:0})}:value});
    }
    if(url.pathname==="/api/access")return route.fulfill({json:faults.access||{kind:"applicant",accountId:runtime.identity.id}});
    if(url.pathname==='/api/community'){
      if(incoming.method()==='GET'&&url.searchParams.get('action')==='enrollment'){
        const row=faults.enrollmentMissing?null:(await runtime.db.query('select id,filename,size_bytes as size,created_at as "createdAt" from public.enrollment_documents where owner_id=$1',[url.searchParams.get('accountId')])).rows[0];
        return route.fulfill({json:{ok:true,data:row||null}});
      }
      return route.fulfill({json:{ok:true,data:[]}});
    }
    if(url.pathname!=="/api/application")return route.fulfill({contentType:"text/html; charset=utf-8",body:`<html lang="en" data-theme="light"><head><meta charset="utf-8">${styles.map(style=>`<link rel="stylesheet" href="${style}">`).join("")}</head><body class="alpha-app"><div id="root"></div></body></html>`});
    if(incoming.method()==='GET'){
      faults.stateReads=(faults.stateReads||0)+1;
      if(faults.stateFailure)return route.fulfill({status:503,json:{ok:false,code:'UNAVAILABLE',message:'Latest intake details could not be checked. Your draft is preserved.'}});
    }
    const body=incoming.method()==="POST"?JSON.parse(incoming.postData()):null;
    if(body)faults.posts.push(body);
    if(body?.action==='save'&&faults.saveUnavailable)return route.fulfill({status:503,json:{ok:false,code:'UNAVAILABLE',message:'Saving could not be confirmed. Your input is preserved; retry saving.'}});
    if(body?.action==='save'&&faults.saveFailure)return route.fulfill({status:409,json:{ok:false,...faults.saveFailure}});
    if(body?.action==='submit'&&faults.submitFailure)return route.fulfill({status:422,json:{ok:false,...faults.submitFailure}});
    if(body?.action==="save"&&faults.waitForSave)await new Promise(resolve=>{faults.releaseSave=resolve;});
    if(body?.action==="submit"&&faults.stallBeforeSubmit){faults.waiting=true;return;}
    const request=new Request(incoming.url(),{method:incoming.method(),headers:await incoming.allHeaders(),...(body?{body:incoming.postData()}:{})});
    const response=await runtime.handlers[incoming.method()](request),text=await response.text();
    if(faults.stallAfterCommit && body?.action===faults.stallAfterCommit){faults.committed=true;return;}
    return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:text});
  });
  await runtime.open();
  await page.goto(origin);await page.addScriptTag({content:bundle});
  await page.evaluate(()=>Promise.all([document.fonts.load('16px "Alpha Geist"'),document.fonts.load('16px "Urban Starblues"')]));
  await page.clock.install();
  async function mountEditor(data=validSimplifiedSubmission(),options={}) {
    runtime.setIdentity(await runtime.addIdentity());
    const saved=await runtime.rpc("save_applicant_draft",{p_data:data,p_expected_version:0,p_mutation_id:crypto.randomUUID()});
    const state=await runtime.rpc("get_application_state");
    faults={posts:[],...options};
    await page.evaluate(props=>window.mount("editor",props),{applicant:runtime.identity,initialDraft:draftFromRow(saved,runtime.identity.email),intake:state.intake,requestedOpportunity:options.requestedOpportunity});
    await page.getByRole("heading",{name:["Ready to start?","About you","Choose your opportunity","Your story","Links","Review & submit"][blockedDestination(upgradeDraft(data),upgradeDraft(data).stage)?.stage??upgradeDraft(data).stage],exact:true}).waitFor();
  }
  async function selectStep(index) {
    const target=[1,2,3,5].indexOf(index);
    const current=Number((await page.locator('.process-step-label').textContent()).match(/Step (\d)/)[1])-1;
    if(target<current)await page.getByRole('button',{name:new RegExp(`Go back to step ${target+1}:`)}).click();
    for(let position=current;position<target;position++){
      await page.getByRole('button',{name:'Continue',exact:true}).click();
      await page.waitForFunction(position=>document.querySelector('.process-step-label')?.textContent.startsWith(`Step ${position+2} `),position);
    }
    if(target!==current)await page.waitForFunction(()=>document.activeElement?.matches('.process-step-heading'));
  }
  async function autosave() {
    await page.clock.runFor(1100);
    await page.locator('.process-save-state').filter({hasText:/Saved at|All changes saved/}).waitFor();
  }
  async function savedDraftData() {
    const result=await runtime.db.query("select data from applicant_drafts where owner_id=$1",[runtime.identity.id]);
    return result.rows[0].data;
  }
  async function mountPortal() {
    const state=await runtime.rpc("get_application_state");
    await page.evaluate(props=>window.mount("portal",props),{accountId:runtime.identity.id,initialApplication:state.application});
    await page.getByRole("heading",{name:"Application reference",exact:true}).waitFor();
    assert.equal(await page.locator(".workspace-heading,.apply-workspace-heading").count(),0);
    assert.equal(await page.locator(".application-receipt .badge").count(),1);
    await assertRecruitmentSurface(page,"Applicant portal");
  }
  async function layout(label) {
    if(await page.locator(".process-root").count())await assertProcessAppearance(page,".process-root",label);
    if(await page.locator('.process-root').count()){
      assert.equal(await page.locator('.process-bar,.process-account').count(),0,label+' has no secondary toolbar');
      assert.equal(await page.locator('.process-support,nav[aria-label="Application help"]').count(),0,label+' omits the removed Privacy/Contact row');
      assert.equal(await page.locator('.process-root .error-summary').count(),0,label+' uses field errors without a repeated summary');
      if(await page.locator('.process-action-bar').count()){
        assert.equal(await page.locator('.application-workbench-content > .process-action-bar').count(),1,label+' keeps actions inside the white form content');
        assert.equal(await page.locator('.process-action-bar').evaluate(node=>getComputedStyle(node).position),'static',label+' actions stay in document flow');
        assert.equal(await page.locator('.process-action-bar').evaluate(node=>node.previousElementSibling?.id),'application-draft-form');
        assert.equal(await page.getByRole('button',{name:/^(Continue|Submit application)$/,exact:true}).getAttribute('form'),'application-draft-form');
      }
    }
    for(const colorScheme of ["light","dark"])for(const width of [320,375,414,768,1024,1440]){
      await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme});
      if(await page.locator(".process-root").count())await assertProcessAppearance(page,".process-root",label);
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),"light");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+" "+colorScheme+" "+width);
      const clipped=await page.locator('.process-root :is(button,input,textarea,select)').evaluateAll(nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.width>0&&box.height>0&&(box.left<-.5||box.right>innerWidth+.5);}).map(node=>({tag:node.tagName,id:node.id})));
      assert.deepEqual(clipped,[],label+" controls stay inside "+width+"px");
      const escapedIcons=await page.locator('.process-actions .button svg').evaluateAll(nodes=>nodes.filter(node=>{const icon=node.getBoundingClientRect(),button=node.closest('button').getBoundingClientRect();return icon.left<button.left-.5||icon.right>button.right+.5||icon.top<button.top-.5||icon.bottom>button.bottom+.5;}).length);
      assert.equal(escapedIcons,0,label+' primary icon stays inside its button at '+width+'px');
      const dialog=page.getByRole("dialog");
      if(await dialog.count())assert.equal(await dialog.evaluate(node=>node.scrollWidth>node.clientWidth+1),false);
    }
  }
  const artifactDir=path.join(project,".next/verification/applicant-submission");await mkdir(artifactDir,{recursive:true});
  await page.evaluate(()=>window.mountFeedback());
  assert.equal(await page.locator('.notice').count(),4);
  assert.equal(await page.locator('.notice[role="alert"]').count(),1,'Only an explicitly urgent notice announces an alert');
  assert.equal(await page.locator('.notice[role="status"]').count(),1,'Confirmed success uses its explicit status region');
  assert.equal(await page.locator('.notice:not([role])').count(),2,'Tone alone never creates a live region');
  assert.equal(await page.locator('[role="alert"] [role="alert"]').count(),0);
  assert.equal(new Set(await page.locator('.notice').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).borderInlineStartColor))).size,4,'Every severity has its own semantic accent');
  assert.equal(await page.locator('.notice > svg[aria-hidden="true"]').count(),4);
  assert.equal(await page.getByLabel('Example field').getAttribute('aria-describedby'),'feedback-field-error');
  for(const width of [375,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(artifactDir,`feedback-${width}.png`)});}
  passed.push('shared feedback distinguishes four severities, keeps field associations and explicit non-nested announcements, and wraps on phones');
  for(const props of [{kind:"anonymous",opportunity:"buildher"},{kind:"anonymous",opportunity:"core-finance",authError:"sign-in"},{kind:"unavailable"},{kind:"unconfigured",opportunity:"core-finance"}]){
    await page.evaluate(props=>window.mountEntry(props),props);
    await page.locator('.apply-entry').waitFor();await layout("application entry "+JSON.stringify(props));
    if(props.opportunity==="core-finance")await page.locator('.apply-requested').getByText("Co-Finance Head",{exact:true}).waitFor();
    if(props.authError)await page.getByRole("alert").filter({hasText:"Sign-in was cancelled"}).waitFor();
  }
  await page.evaluate(()=>window.mountLoading());await page.getByRole("status").filter({hasText:"Loading your application"}).waitFor();await layout("application loading");
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.screenshot({path:path.join(artifactDir,`apply-loading-${width}.png`)});}
  await page.evaluate(()=>window.mountEntry({kind:"anonymous",opportunity:"buildher"}));
  await page.getByRole('heading',{name:'Start your application',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Your next chapter starts here.',exact:true}).count(),1);
  assert.equal(await page.locator('.application-chapter').count(),0,'Chapter identity appears in the masthead without a repeated application label');
  assert.match(await page.locator('.brand-masthead').textContent(),/Rizal Technological University/);
  assert.deepEqual(await page.locator('.application-overview li > span:last-child').allTextContents(),['About you','Opportunity','Your story','Review']);
  assert.equal(await page.getByRole('link',{name:'Read the recruitment privacy notice',exact:true}).getAttribute('href'),'/privacy');
  assert.equal(await page.getByRole('link',{name:'Find your place at Alpha',exact:true}).getAttribute('href'),'/opportunities');
  assert.match(await page.locator('.apply-requested').textContent(),/BuildHer\+/);
  assert.equal(await page.getByRole('link',{name:'Change opportunity',exact:true}).getAttribute('href'),'/opportunities');
  assert.equal(await page.locator('.application-overview [aria-current],.application-overview button,.journey-icon').count(),0,'Public roadmap does not imply consent or gated progress');
  assert.match(await page.locator('.application-introduction h1 > span').evaluate(node=>getComputedStyle(node).fontFamily),/Urban Starblues/,'Application entry uses Alpha signature typography');
  const entryComposition=await page.evaluate(()=>({intro:document.querySelector('.application-introduction').getBoundingClientRect().right,card:document.querySelector('.apply-entry-card').getBoundingClientRect().left}));
  assert.ok(entryComposition.intro<entryComposition.card,'Desktop application pairs Alpha branding and compact access card');
  await assertTextContrast('.application-card-label','.apply-entry-card');
  await assertTextContrast('.application-privacy-summary h3','.apply-entry-card');
  assert.equal(await page.locator('.process-root').getAttribute('data-appearance'),'dark');
  assert.equal(await page.locator('.apply-auth .apply-kicker,.apply-auth .apply-dates,.apply-auth .apply-entry-side').count(),0,'Promotional entry omits dates, checklist and recruitment labels');
  assert.equal(await page.locator('.apply-auth .apply-lead').textContent(),'Sign in to save your progress and come back when you’re ready.');
  assert.equal(await page.locator('.apply-auth form').count(),1,'One authentication action');
  const canvasBounds=await page.locator('.apply-wave').evaluate(canvas=>({width:canvas.width,height:canvas.height,viewportWidth:innerWidth,viewportHeight:innerHeight}));
  assert.ok(canvasBounds.width<=canvasBounds.viewportWidth*1.5+1 && canvasBounds.height<=canvasBounds.viewportHeight*1.5+1,'Decorative canvas is bounded to viewport');
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:width===375?812:950});
    if(width===375){
      const positions=await page.evaluate(()=>({role:document.querySelector(".apply-requested").getBoundingClientRect().bottom,card:document.querySelector(".apply-entry-card").getBoundingClientRect().bottom,guide:document.querySelector(".application-guide").getBoundingClientRect().top}));
      assert.ok(positions.role<=812,"The selected role is visible on the first mobile screen");
      assert.ok(positions.card<positions.guide,"Sign-in precedes the orientation guide on mobile");
    }
    await page.screenshot({path:path.join(artifactDir,`apply-entry-${width}.png`)});
  }
  await page.getByRole("button",{name:"Continue with Google",exact:true}).click();
  await page.waitForFunction(()=>window.signInOpportunity==="buildher");
  await page.getByRole('button',{name:'Connecting…',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Connecting…',exact:true}).isDisabled(),true);
  await page.evaluate(()=>window.resolveSignIn());
  await page.waitForFunction(()=>!document.querySelector('.apply-google-button')?.disabled);
  passed.push("responsive sign-in, failed-sign-in, unavailable and loading screens preserve the requested opportunity");

  runtime.setIdentity(await runtime.addIdentity());faults={posts:[]};
  await page.evaluate(props=>window.mount("editor",props),{applicant:runtime.identity,initialDraft:null,intake:(await runtime.rpc("get_application_state")).intake,requestedOpportunity:"buildher"});
  await page.getByRole('heading',{name:'Ready to start?',exact:true}).waitFor();
  assert.equal(await page.locator('.apply-lead').textContent(),'Four steps. Your progress saves automatically.');
  assert.equal(await page.getByRole('checkbox').getAttribute('type'),'checkbox');
  assert.equal(await page.locator('.apply-start-form .checkbox-row').textContent(),'I have read the privacy notice and agree to recruitment processing.');
  assert.equal(await page.locator('.apply-start-form a[href="/privacy"]').count(),1);
  assert.equal(await page.locator('.apply-details').getAttribute('open'),null);
  assert.equal(await page.locator('.apply-kicker,.apply-checklist,.apply-privacy').count(),0,'Preparation omits expanded promotional and account prose');
  assert.equal(await page.locator('.apply-requested').isVisible(),true,'Requested opportunity stays visible');
  assert.equal(await page.locator('.apply-account strong').textContent(),runtime.identity.email);
  const preparationWidth=await page.locator('.apply-entry-card').evaluate(node=>node.getBoundingClientRect().width);
  assert.ok(preparationWidth>=440&&preparationWidth<=600,'Preparation keeps the compact task card beside the Alpha introduction');
  assert.equal(await page.getByText('1–30 November 2026',{exact:true}).isVisible(),false,'Dates remain in the collapsed details');
  await page.getByText('Application details',{exact:true}).focus();await page.keyboard.press('Enter');
  assert.equal(await page.getByText('1–30 November 2026',{exact:true}).isVisible(),true,'Native details opens by keyboard');
  await page.keyboard.press('Enter');
  await page.evaluate(props=>window.mount('editor',props),{applicant:{...runtime.identity,email:'student.with.a.long.university.identity.for.responsive.testing@example.university.test'},initialDraft:null,intake:(await runtime.rpc('get_application_state')).intake});
  assert.equal(await page.locator('.apply-requested').count(),0,'No opportunity notice appears without a requested choice');
  await page.setViewportSize({width:320,height:812});await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Preparation wraps long email at 200% text');
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  await page.evaluate(props=>window.mount('editor',props),{applicant:runtime.identity,initialDraft:null,intake:(await runtime.rpc('get_application_state')).intake,requestedOpportunity:'buildher'});
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.screenshot({path:path.join(artifactDir,`apply-preparation-${width}.png`)});}
  await page.getByRole("button",{name:"Start application",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"Agree to recruitment processing"}).waitFor();
  assert.equal(await page.locator('.apply-details [role="alert"]').count(),0,'Recovery stays outside the collapsed details');
  assert.equal((await runtime.db.query("select count(*)::int as total from applicant_drafts where owner_id=$1",[runtime.identity.id])).rows[0].total,0);
  await layout("consent and preparation");
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:path.join(artifactDir,"apply-consent-375.png"),fullPage:true});
  await page.getByRole("checkbox",{name:/I have read the privacy notice/}).check();
  await page.getByRole("button",{name:"Start application",exact:true}).click();
  await page.getByRole("heading",{name:"About you",exact:true}).waitFor();
  assert.equal(await page.locator('.process-root').getAttribute('data-appearance'),'navy');
  assert.equal(await page.locator('.process-card').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 255, 255)');
  assert.deepEqual(await page.locator('#fullName').evaluate(node=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d');context.fillStyle=getComputedStyle(node).backgroundColor;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data];}),[255,255,255,255]);
  assert.equal(await page.locator('.process-root').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(8, 9, 10)');
  assert.equal(await page.locator('.process-paper .apply-wave').count(),1,'The white form sits above the moving Alpha gradient');
  assert.equal(await page.locator('.application-sidebar').evaluate(node=>getComputedStyle(node).position),'static','The sidebar scrolls naturally with the form');
  assert.equal(await page.locator('label[for=fullName] .required-mark').evaluate(node=>getComputedStyle(node).color),'rgb(180, 35, 24)','Required asterisks are red');
  const normalFieldBorder=await page.locator('#fullName').evaluate(node=>getComputedStyle(node).borderTopColor);
  await page.locator('#fullName').focus();
  await page.waitForFunction(border => document.activeElement?.id === "fullName" && getComputedStyle(document.getElementById("fullName")).borderTopColor !== border, normalFieldBorder);
  assert.notEqual(await page.locator('#fullName').evaluate(node=>getComputedStyle(node).borderTopColor),normalFieldBorder,'Focus border overrides the normal field border');
  await page.locator('#fullName').evaluate(node=>node.blur());
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(artifactDir,`apply-editor-${width}.png`)});}
  await page.setViewportSize({width:375,height:812});
  const actionBounds=await page.locator('.process-actions > *').evaluateAll(nodes=>nodes.map(node=>({top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom})));
  assert.equal(actionBounds[0].top,actionBounds[1].top,'Back and Continue share the mobile row');
  assert.ok(actionBounds[2].top>=actionBounds[1].bottom,'Save & exit has its own quiet mobile row');
  const created=await savedDraftData();
  assert.equal(created.stage,1);assert.equal(created.processingConsent,true);assert.equal(created.opportunityId,"buildher");
  passed.push("preparation creates no draft before consent, then opens About you with the requested opportunity");

  runtime.setIdentity(await runtime.addIdentity());faults={posts:[]};
  await page.evaluate(props=>window.mount("editor",props),{applicant:runtime.identity,initialDraft:null,intake:(await runtime.rpc("get_application_state")).intake,requestedOpportunity:"core-finance"});
  await page.getByRole("checkbox",{name:/I have read the privacy notice/}).check();
  await page.getByRole("button",{name:"Start application",exact:true}).click();
  await page.locator("#fullName").fill("Synthetic Applicant");
  await page.locator("#university").fill("Rizal Technological University");
  await page.locator("#program").fill("BS Information Technology");
  await page.locator("#programLevel").selectOption("undergraduate");
  await page.locator("#year").selectOption("3");
  await page.locator("#enrolled").check();
  await page.getByRole("button",{name:/Switch to Committee and keep my details/}).waitFor();
  await selectStep(2);
  assert.equal(await page.getByRole("radio",{name:"Co-Finance Head",exact:true}).isChecked(),true);
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await page.locator("#eligibility-error").waitFor();
  await selectStep(1);
  await page.locator("#year").selectOption("2");
  await selectStep(2);
  assert.equal(await page.getByRole("radio",{name:"Co-Finance Head",exact:true}).isChecked(),true);
  await selectStep(3);
  await autosave();
  assert.equal((await savedDraftData()).opportunityId,"core-finance");
  passed.push("Core Team role persists through incomplete and ineligible profile edits, with eligibility enforced before story");

  const existing=validSimplifiedSubmission();
  await mountEditor(existing,{requestedOpportunity:"core-finance"});
  const request=page.getByText("Your draft is for",{exact:false});
  await request.waitFor();
  assert.match(await request.textContent(),/Co-Finance Head/);
  await page.screenshot({path:path.join(artifactDir,"apply-keep-draft-375.png")});
  await page.getByRole("button",{name:"Keep my draft",exact:true}).click();
  assert.equal(await request.count(),0);
  await page.waitForFunction(()=>document.activeElement?.matches('.process-step-heading'));
  assert.equal(faults.posts.length,0,"Keeping a draft does not write a change");
  assert.equal((await savedDraftData()).opportunityId,existing.opportunityId);
  await mountEditor(existing,{requestedOpportunity:"core-finance"});
  await page.getByRole("button",{name:"Use this opportunity",exact:true}).click();
  await page.getByRole("heading",{name:"Choose your opportunity",exact:true}).waitFor();
  assert.equal(await page.getByRole("radio",{name:"Co-Finance Head",exact:true}).isChecked(),true);
  assert.equal(await request.count(),0);
  await autosave();
  const switched=await savedDraftData();
  assert.equal(switched.opportunityId,"core-finance");
  assert.equal(switched.profile.fullName,existing.profile.fullName);
  assert.equal(switched.answers.scenario,existing.answers.scenario);
  assert.equal(switched.scenarioReviewedOpportunityId,"");
  passed.push("existing drafts keep the saved role or explicitly adopt a new role while preserving answers for review");

  const creative=getOpportunity("core-creatives");
  const creativeDraft=validSimplifiedSubmission();
  Object.assign(creativeDraft,{opportunityId:creative.id,scenarioReviewedOpportunityId:creative.id,stage:3});
  creativeDraft.answers.scenario="";
  await mountEditor(creativeDraft);
  await page.setViewportSize({width:375,height:812});
  const jump=page.getByRole("link",{name:"Go to the role scenario",exact:true});
  await jump.press("Enter");
  await page.waitForFunction(()=>document.activeElement?.id==="scenario-prompt");
  const creativeResponse=page.getByRole("textbox",{name:creative.scenario,exact:true});
  assert.match(await creativeResponse.getAttribute("aria-describedby"),/scenario-help/);
  await page.getByRole("button",{name:"Continue",exact:true}).press("Enter");
  await page.waitForFunction(()=>document.activeElement?.id==="scenario");
  await creativeResponse.fill("I would test a simple recruitment graphic on a phone and keep shared templates for the team.");
  assert.equal(await creativeResponse.getAttribute("aria-invalid"),"false");
  await autosave();
  assert.equal((await savedDraftData()).answers.scenario,await creativeResponse.inputValue());
  await page.screenshot({path:path.join(artifactDir,"apply-role-scenario-375.png")});
  passed.push("the Creatives scenario can be reached by keyboard, is required, and saves its response to the draft");

  const gated=validSimplifiedSubmission();gated.profile.fullName="";
  await mountEditor(gated);
  assert.equal(await page.locator("#fullName").count(),1);
  assert.equal(await page.locator('.process-track button').count(),0,'Future steps are not clickable');
  assert.equal(await page.locator('.process-segment').count(),4);
  assert.equal(await page.locator('.site-header').count(),1,'Apply retains the shared landing navbar');
  assert.equal(await page.locator('.site-footer,.process-brand').count(),0,'Apply keeps its footer-free layout without duplicate branding');
  assert.equal(await page.locator('.skip-link').count(),1,'The shared navbar owns the skip link');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.id==='fullName');
  await page.clock.runFor(200);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#fullName')).borderTopColor===getComputedStyle(document.querySelector('#fullName-error')).color);
  const invalidFieldColors=await page.locator('#fullName').evaluate(node=>({border:getComputedStyle(node).borderTopColor,error:getComputedStyle(document.querySelector('#fullName-error')).color}));
  assert.equal(invalidFieldColors.border,invalidFieldColors.error,'Invalid border retains the associated error color');
  assert.equal(await page.locator('.process-root .error-summary').count(),0);
  assert.equal(await page.locator('[role="alert"] [role="alert"]').count(),0,'Errors have no nested announcements');
  await page.locator('#fullName').fill('Student Applicant');
  await selectStep(3);assert.equal(await page.locator('#resumeUrl').evaluate(node=>node.required),true,'Resume is explicitly required for submission');assert.equal(await page.getByText('A resume is required before you submit. You can save a draft without it.',{exact:true}).isVisible(),true);assert.equal(await page.locator('.process-intake-availability .callout').count(),0);assert.equal(await page.locator('.process-resume-help').evaluate(node=>node.open),false);assert.equal(await page.getByText(/For Google Drive, choose Share/).isVisible(),false);await openDisclosure(page,'How to share your resume');await page.locator('.process-resume-help > summary').click();await page.locator('#resumeUrl').fill('');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('#resumeUrl-error').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='resumeUrl');
  await autosave();
  assert.equal((await runtime.db.query('select data from applicant_drafts where owner_id=$1',[runtime.identity.id])).rows[0].data.resumeUrl,'');
  await page.locator('#resumeUrl').fill('https://drive.google.com/file/d/example/view');
  assert.equal(await page.getByRole('link',{name:'Open resume link'}).getAttribute('target'),'_blank');
  await page.screenshot({path:path.join(artifactDir,'required-resume-375.png'),fullPage:true});
  passed.push('four sections gate prerequisites and submission still requires a resume while incomplete drafts save');
  const missingProof=validSimplifiedSubmission();missingProof.stage=5;
  await mountEditor(missingProof,{enrollmentMissing:true});
  await page.getByRole('button',{name:'Submit application',exact:true}).click();
  await page.locator('#proofOfEnrollment-error').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='proofOfEnrollment');
  assert.equal(faults.posts.filter(post=>post.action==='submit').length,0,'Missing proof is blocked before submission');
  passed.push('required enrollment proof blocks submission and focuses its upload control');

  const invalidProfile=validSimplifiedSubmission();invalidProfile.stage=1;invalidProfile.profile.university='';invalidProfile.profile.mobile='invalid';
  await mountEditor(invalidProfile);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='university');
  assert.equal(await page.locator('#university').getAttribute('aria-describedby'),'university-error');
  assert.equal(await page.locator('#mobile').isVisible(),true,'Optional details are immediately visible');
  await page.locator('#university').fill('Rizal Technological University');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='mobile');
  assert.equal(await page.locator('#mobile').isVisible(),true,'Invalid optional control is revealed before focus');
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.locator('#mobile').focus();await page.screenshot({path:path.join(artifactDir,`apply-inline-errors-${width}.png`)});}
  await layout('inline profile validation');
  await page.locator('#mobile').fill('+63 917 123 4567');await autosave();
  assert.equal(await page.locator('#mobile').evaluate(node=>node===document.activeElement),true,'Typing and autosave never jump to another error');

  const ineligible=validSimplifiedSubmission();ineligible.profile.year='3';
  await mountEditor(ineligible);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='track');
  assert.equal(await page.locator('#track').getAttribute('aria-invalid'),'true');
  assert.ok((await page.locator('#track').getAttribute('aria-describedby')).includes('eligibility-error'));
  assert.equal(await page.locator('.process-eligibility .callout').count(),0,'Eligibility remains compact at its group');
  await page.getByRole('button',{name:'Switch to Committee and keep my details',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='opportunityId');
  assert.equal(await page.locator('#opportunityId').getAttribute('aria-invalid'),'true');

  const missingDays=validSimplifiedSubmission();missingDays.stage=3;missingDays.profile.availability=[];
  await mountEditor(missingDays);await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='availabilityDays');
  assert.equal(await page.locator('#availabilityDays').getAttribute('aria-invalid'),'true');
  const missingAccuracy=validSimplifiedSubmission();missingAccuracy.accuracy=false;
  await mountEditor(missingAccuracy);await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='accuracy');
  assert.equal(await page.locator('#accuracy').getAttribute('aria-invalid'),'true');

  await mountEditor(validSimplifiedSubmission(),{submitFailure:{code:'VALIDATION',message:'Check the submitted fields.',errors:{mobile:'Server mobile validation failed.',university:'Server university validation failed.'}}});
  await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='university');
  assert.equal(await page.locator('#university-error').textContent(),'Server university validation failed.');
  assert.equal(await page.locator('.application-fields').evaluate(node=>node.disabled),false,'Final validation failure releases recoverable inputs');
  assert.equal(await page.locator('.process-recovery [role="alert"]').count(),0,'Identifiable server errors are not duplicated in a generic panel');

  const asyncSave=validSimplifiedSubmission();asyncSave.stage=3;
  await mountEditor(asyncSave,{saveFailure:{code:'VALIDATION',message:'Check the saved fields.',errors:{mobile:'Server mobile validation failed.',university:'Server university validation failed.'}}});
  await page.locator('#collaboration').fill('Preserved while an asynchronous save is rejected.');await page.clock.runFor(1100);
  await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();
  assert.equal(await page.locator('#collaboration').evaluate(node=>node===document.activeElement),true,'Autosave rejection does not steal typing focus');
  await page.getByRole('button',{name:'Retry save',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='university');
  assert.equal((await runtime.db.query('select data from applicant_drafts where owner_id=$1',[runtime.identity.id])).rows[0].data.answers.collaboration,asyncSave.answers.collaboration,'Rejected saves never invent an acknowledgement');

  await mountEditor(validSimplifiedSubmission(),{saveFailure:{code:'VALIDATION',message:'Check the final saved fields.',errors:{campus:'Review the campus value.'}}});
  await page.locator('#updatesConsent').check();await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='campus');
  assert.equal(await page.locator('#campus').isVisible(),true);
  assert.equal(faults.posts.filter(post=>post.action==='submit').length,0,'A failed final save never submits');

  await mountEditor(validSimplifiedSubmission(),{submitFailure:{code:'CONFLICT',message:'Generic command conflict.',errors:{form:'Reload the latest application form.',stage:'Unsupported step.',unknownField:'Unknown field.'}}});
  await page.getByRole('button',{name:'Submit application',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.matches('.process-recovery p[role="alert"]'));
  assert.equal(await page.locator('.process-recovery [role="alert"]').count(),1,'Unsupported form/stage/server keys have one compact fallback');
  assert.equal(await page.locator('.process-recovery [role="alert"]').textContent(),'Reload the latest application form.');
  assert.equal(await page.getByRole('button',{name:'Reload saved draft',exact:true}).count(),1);
  assert.equal(await page.locator('.process-root .error-summary,.process-recovery ul').count(),0);
  passed.push('field-only validation follows DOM order across steps, opens optional details, associates groups and focuses recoverable asynchronous errors without stealing typing focus');

  const profilePreview=validSimplifiedSubmission();profilePreview.profile.university="Rizal Technological University";
  await mountEditor(profilePreview);await selectStep(1);
  await page.setViewportSize({width:320,height:812});
  const opportunityLines=await page.locator(".process-track").getByText("Opportunity",{exact:true}).evaluate(node=>{const text=document.createRange();text.selectNodeContents(node);return text.getClientRects().length;});
  assert.equal(opportunityLines,1,"Mobile progress keeps Opportunity on one line");
  await page.setViewportSize({width:375,height:812});await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))-document.querySelector('.header-inner').getBoundingClientRect().height)<1);
  const firstField=await page.locator('#fullName').boundingBox();assert.ok(firstField&&firstField.y>=73&&firstField.y+firstField.height<=812);
  const actionsBefore=await page.locator('.process-action-bar').evaluate(node=>({top:node.getBoundingClientRect().top,scroll:scrollY,viewport:innerHeight}));
  assert.ok(actionsBefore.top>actionsBefore.viewport,'Long-form actions do not overlay the viewport');
  await page.evaluate(()=>scrollBy(0,240));
  const actionsAfter=await page.locator('.process-action-bar').evaluate(node=>({top:node.getBoundingClientRect().top,scroll:scrollY}));
  assert.ok(Math.abs(actionsBefore.top+actionsBefore.scroll-actionsAfter.top-actionsAfter.scroll)<1,'Action position follows document scrolling');
  await page.evaluate(()=>scrollTo(0,0));
  await page.emulateMedia({reducedMotion:'no-preference'});await selectStep(2);
  assert.equal(await page.locator('.process-step-heading').evaluate(node=>getComputedStyle(node).animationDuration),'0.18s');
  await selectStep(1);
  // CSS document-timeline animations are not advanced by the mocked JS clock.
  await page.locator('.process-card').evaluate(node=>Promise.all(node.getAnimations({subtree:true}).map(animation=>animation.finished)));
  await page.locator('#fullName').fill('Motion remains quiet while typing');
  assert.equal(await page.locator('.process-card').evaluate(node=>node.getAnimations({subtree:true}).some(animation=>animation.animationName==='process-step-enter'&&animation.playState==='running')),false,'Typing does not restart the decorative step entrance');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.process-step-heading').evaluate(node=>getComputedStyle(node).animationName),'none');
  assert.equal(await page.locator('#mobile').isVisible(),true);
  await page.locator('#mobile').fill('+63 917 123 4567');
  assert.equal(await page.locator('#mobile').inputValue(),'+63 917 123 4567');
  assert.equal(await page.locator('.process-bar,.process-account').count(),0,'No secondary toolbar or account menu remains');
  assert.equal(await page.locator('.application-sidebar > .process-progress').count(),1,'Progress is inside the form sidebar');
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:950});
    const placement=await page.locator('.application-workbench').evaluate(node=>{const sidebar=node.querySelector('.application-sidebar').getBoundingClientRect(),content=node.querySelector('.application-workbench-content').getBoundingClientRect();return {sidebarRight:sidebar.right,sidebarBottom:sidebar.bottom,contentLeft:content.left,contentTop:content.top};});
    assert.ok(width>=900?placement.sidebarRight<=placement.contentLeft+1:placement.sidebarBottom<=placement.contentTop+1,'Progress stays beside desktop fields and above phone fields');
  }
  assert.equal(await page.locator('.process-support').count(),0);
  assert.equal(await page.locator('.process-action-bar').getByRole('button',{name:'Save & exit',exact:true}).count(),1);
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.screenshot({path:path.join(artifactDir,`apply-profile-${width}.png`)});}
  await page.locator('#mobile').fill('invalid');await page.locator('#mobile').blur();
  assert.equal(await page.locator('#mobile').isVisible(),true);
  await page.getByRole('button',{name:'Continue',exact:true}).press('Enter');await page.waitForFunction(()=>document.activeElement?.id==='mobile');assert.equal(await page.locator('#mobile').isVisible(),true);await page.locator('#mobile').fill('+63 917 123 4567');
  for(const index of [1,2,3,5]){await selectStep(index);await layout('application section '+index);}
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.locator('.process-action-bar').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifactDir,`apply-actions-${width}.png`)});}
  passed.push('optional profile details stay mounted; four-section navigation and all widths/device preferences remain accessible');

  assert.equal(await page.locator('.process-review-links #resumeUrl').count(),0);assert.equal(await page.locator('.process-evidence-summary').count(),1);
  assert.equal(await page.locator('.application-content').getByRole('heading',{name:'Supporting evidence',exact:true}).count(),0);
  assert.equal(await page.locator('.process-evidence-summary').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('.application-content'))&Node.DOCUMENT_POSITION_FOLLOWING)),true,'Links precede summary');
  for(const width of [375,1440]){await page.setViewportSize({width,height:950});await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await page.screenshot({path:path.join(artifactDir,`apply-review-${width}.png`),fullPage:true});}
  await page.getByRole('button',{name:'Edit details',exact:true}).click();
  await page.getByRole('heading',{name:'About you',exact:true}).waitFor();
  faults.saveUnavailable=true;
  await page.locator('#fullName').fill('Saved before exit');await page.clock.runFor(1100);
  await page.getByRole('button',{name:'Retry save',exact:true}).waitFor();
  await page.getByRole('button',{name:'Save & exit',exact:true}).click();
  await page.getByRole('button',{name:'Save & exit',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.destination),'','Failed saving cannot exit');
  assert.equal(await page.locator('#fullName').inputValue(),'Saved before exit');
  faults.saveUnavailable=false;await page.getByRole('button',{name:'Retry save',exact:true}).click();
  await page.locator('.process-save-state').filter({hasText:/Saved at/}).waitFor();
  const saveAttempts=faults.posts.filter(post=>post.action==='save');
  assert.deepEqual(saveAttempts.at(-1),saveAttempts.at(-2),'Retry keeps the exact pending save');
  await page.locator('#fullName').fill('Final exit value');
  await page.getByRole('button',{name:'Save & exit',exact:true}).click();
  await page.waitForFunction(()=>window.destination==='/application');
  assert.equal((await runtime.db.query('select data from applicant_drafts where owner_id=$1',[runtime.identity.id])).rows[0].data.profile.fullName,'Final exit value');
  passed.push('review is links-first without duplicate evidence; autosave errors retain input and exact retries; Save & exit waits for acknowledgement');

  const conflictDraft=validSimplifiedSubmission();conflictDraft.stage=1;
  await mountEditor(conflictDraft,{saveFailure:{code:'CONFLICT',message:'This draft changed in another tab. Reload the saved draft or keep these edits.'}});
  await page.locator('#fullName').fill('Local conflict text');await page.clock.runFor(1100);
  await page.getByRole('button',{name:'Reload saved draft',exact:true}).waitFor();
  assert.equal(await page.locator('#fullName').inputValue(),'Local conflict text');
  await page.setViewportSize({width:1440,height:950});
  let navbarHomePrompt=false;page.once('dialog',dialog=>{navbarHomePrompt=true;return dialog.dismiss();});
  await page.locator('.site-header').getByRole('link',{name:'Alpha home',exact:true}).click();assert.equal(navbarHomePrompt,true,'Home warns before losing unsaved input');assert.equal(await page.locator('#fullName').inputValue(),'Local conflict text');
  let navbarSignOutPrompt=false;
  page.once('dialog',dialog=>{navbarSignOutPrompt=true;return dialog.dismiss();});
  await page.locator('.site-header .account-trigger').click();
  await page.locator('.site-header').getByRole('button',{name:'Sign out',exact:true}).click();
  assert.equal(navbarSignOutPrompt,true,'The restored navbar warns before losing unsaved answers');
  assert.equal(await page.locator('#fullName').inputValue(),'Local conflict text');
  await mountEditor(conflictDraft,{saveFailure:{code:'STAFF_ACCOUNT',message:'This account has staff access.'}});
  await page.locator('#fullName').fill('Unsaved staff transition');await page.clock.runFor(1100);
  await page.getByRole('heading',{name:'This account has staff access',exact:true}).waitFor();
  assert.equal(await page.locator('.process-card input').count(),0);await layout('staff-account recovery');
  await mountEditor();faults.access={kind:'applicant',accountId:runtime.identity.id};
  runtime.setIdentity(await runtime.addIdentity());
  await page.getByRole('button',{name:'Submit application',exact:true}).click();
  await page.getByRole('heading',{name:'Check your applicant access',exact:true}).waitFor();await layout('command access-loss recovery');
  passed.push('conflict retains local answers and reload recovery; unsaved sign-out can be cancelled; staff-account and command-access-loss states clear private fields');

  const oldDraft=validSubmission();oldDraft.stage=3;oldDraft.answers.collaboration=Array(170).fill('learning').join(' ');
  await mountEditor(oldDraft);assert.equal(await page.locator('textarea').count(),3);
  assert.equal(await page.locator('#collaboration').inputValue(),oldDraft.answers.collaboration);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#collaboration-error').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='collaboration');
  await page.getByText('Previous draft answers',{exact:true}).click();await page.getByText(oldDraft.profile.experience,{exact:true}).waitFor();
  await page.locator('#collaboration').fill('A short answer.');await autosave();
  const upgraded=(await runtime.db.query('select data from applicant_drafts where owner_id=$1',[runtime.identity.id])).rows[0].data;
  assert.equal(upgraded.formVersion,2);assert.equal(upgraded.answers.pathway,oldDraft.answers.pathway);assert.equal(upgraded.profile.experience,oldDraft.profile.experience);
  await page.setViewportSize({width:375,height:500});await page.locator('#collaboration').focus();await page.locator('#collaboration').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  const focused=await page.locator('#collaboration').boundingBox();assert.ok(focused.y>=73&&focused.y+focused.height<=500);
  for(const width of [320,375,414]){await page.setViewportSize({width,height:812});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await layout('enlarged text');await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));}
  passed.push('legacy drafts upgrade without truncation, preserve retired text for copying, and show all three responses with 150-word gates');

  const originalPath=validSimplifiedSubmission();await mountEditor(originalPath);await selectStep(2);
  await page.getByRole('radio',{name:'Committee',exact:true}).click();assert.equal(await page.locator('input[name="opportunity"]').count(),10);
  await page.getByRole('radio',{name:/BuildHer/}).click();
  assert.equal(await page.locator('.process-opportunity-detail').count(),1);
  await page.locator('.process-opportunity.selected .process-scenario').getByText(/inclusive activity/).waitFor();
  for(const width of [375,1440]){await page.setViewportSize({width,height:950});await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});});await page.screenshot({path:path.join(artifactDir,`apply-opportunity-${width}.png`),fullPage:true});}
  await selectStep(3);
  for(const field of ['motivation','collaboration','scenario'])assert.equal(await page.locator('#'+field).inputValue(),originalPath.answers[field]);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.locator('#scenarioReviewedOpportunityId-error').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='scenarioReviewedOpportunityId');
  assert.equal(await page.locator('#scenarioReviewedOpportunityId').getAttribute('aria-invalid'),'true');
  await page.locator('#scenarioReviewedOpportunityId').check();await autosave();
  const changed=(await runtime.db.query('select data from applicant_drafts where owner_id=$1',[runtime.identity.id])).rows[0].data;assert.equal(changed.scenarioReviewedOpportunityId,'buildher');
  await selectStep(2);await page.getByRole('radio',{name:/Cloud.*SkillBuilders/}).click();await selectStep(3);assert.equal(await page.locator('#scenarioReviewedOpportunityId').isChecked(),false);
  await page.locator('#scenarioReviewedOpportunityId').check();
  await layout('three responses');
  for(const width of [375,1440]){await page.setViewportSize({width,height:950});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(artifactDir,`apply-story-${width}.png`),fullPage:true});}
  passed.push('opportunity changes preserve every response and require persisted scenario review again for each change');

  const incomplete=validSimplifiedSubmission();incomplete.answers.motivation='';incomplete.stage=3;await mountEditor(incomplete);
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='motivation');
  await page.locator('#motivation').fill('My brief motivation');
  assert.equal(await page.locator('.process-track button').count(),2);
  const saveTarget=await page.getByRole('button',{name:'Save & exit',exact:true}).boundingBox();assert.ok(saveTarget.height>=44&&saveTarget.width>=44);
  await selectStep(5);
  faults.waitForSave=true;faults.stallAfterCommit="submit";
  await page.getByRole("button",{name:"Submit application",exact:true}).click();await until(()=>faults.releaseSave);
  await page.waitForFunction(()=>document.querySelector(".application-fields").disabled);
  assert.equal(await page.getByRole('button',{name:'Back',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Save & exit',exact:true}).isDisabled(),true);assert.equal(await page.locator('.process-root').getAttribute('data-unsaved'),'true','Pending submission keeps navbar guards active');
  assert.equal(faults.posts.filter(post=>post.action==="submit").length,0);
  faults.releaseSave();await until(()=>faults.committed);
  const submit=faults.posts.find(post=>post.action==="submit"),draft=(await runtime.db.query("select version from applicant_drafts where owner_id=$1",[runtime.identity.id])).rows[0];
  assert.equal(submit.expectedVersion,draft.version);
  await page.clock.runFor(15001);
  await page.getByRole("button",{name:"Retry same submission",exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector(".application-fields").disabled);
  await layout("frozen submission recovery");
  faults.stallAfterCommit=null;
  await page.getByRole("button",{name:"Retry same submission",exact:true}).focus();await page.keyboard.press("Enter");
  await page.waitForFunction(()=>window.destination==="/application");
  assert.deepEqual(faults.posts.filter(post=>post.action==="submit"),[submit,submit]);
  assert.equal((await runtime.rpc("get_application_state")).application.history.length,1);
  passed.push("field errors preserve answers and focus; submission freezes, flushes acknowledged revision, retries exact operation with one receipt/history");
  await mountPortal();assert.equal(await page.locator(".portal-history").evaluate(node=>node.open),false);assert.equal(await page.locator(".application-history li").count(),1);await openDisclosure(page,"Status history");await page.locator(".portal-history > summary").click();await layout("submitted portal");
  for(const width of [375,1440]){await page.setViewportSize({width,height:950});await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});assert.equal(await page.getByRole('banner').getAttribute('data-workspace-frame'),'applicant');await page.screenshot({path:path.join(artifactDir,'portal-'+width+'.png')});}
  await page.getByText("View submitted answers",{exact:true}).click();
  assert.equal(await page.locator("textarea,input").count(),0);
  await layout("immutable answers");
  await page.setViewportSize({width:375,height:950});await page.screenshot({path:path.join(artifactDir,"light-prefers-dark-375.png"),fullPage:true});
  await page.getByRole("button",{name:"Withdraw application",exact:true}).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"detached"});
  assert.equal(await page.getByRole("button",{name:"Withdraw application",exact:true}).evaluate(node=>node===document.activeElement),true);
  await page.getByRole("button",{name:"Withdraw application",exact:true}).click();
  await layout("withdrawal confirmation");
  faults.stallAfterCommit="withdraw";faults.committed=false;
  await page.getByRole("button",{name:"Confirm withdrawal",exact:true}).click();await until(()=>faults.committed);
  await page.clock.runFor(15001);await page.getByRole("button",{name:"Retry withdrawal",exact:true}).waitFor();
  faults.stallAfterCommit=null;await page.getByRole("button",{name:"Retry withdrawal",exact:true}).click();
  await page.getByRole("dialog").waitFor({state:"detached"});
  await page.getByText("Your application has been withdrawn.",{exact:true}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Withdraw application",exact:true}).count(),0);
  const state=await runtime.rpc("get_application_state");
  assert.equal(state.application.status,"Withdrawn");assert.equal(state.application.history.length,2);
  const withdrawals=faults.posts.filter(post=>post.action==="withdraw");assert.deepEqual(withdrawals[0],withdrawals[1]);
  passed.push("portal is read-only; withdrawal dialog Escape restores focus; lost acknowledgement retries once, terminal status and public history remain");
  await page.setViewportSize({width:1440,height:950});await page.emulateMedia({colorScheme:"light"});
  await page.screenshot({path:path.join(artifactDir,"light-prefers-light-1440.png"),fullPage:true});

  await mountEditor(validSimplifiedSubmission(),{stallBeforeSubmit:true});
  await page.getByRole("button",{name:"Submit application",exact:true}).click();await until(()=>faults.waiting);
  await page.clock.runFor(15001);await page.getByRole("button",{name:"Retry same submission",exact:true}).waitFor();
  await page.getByRole("button",{name:"Check latest details",exact:true}).click();
  await page.getByText(/No receipt is available yet/).waitFor().catch(async error => { throw new Error(error.message + " Synthetic UI: " + JSON.stringify(await page.getByRole("alert").allTextContents())); });
  await page.waitForFunction(()=>document.querySelector(".application-fields").disabled);
  assert.equal(await page.getByRole("button",{name:"Retry same submission",exact:true}).count(),1);
  assert.equal(await page.locator('.process-intake-status').count(),0,'An uncertain submission never becomes routine success feedback');
  faults.stateFailure=true;await page.getByRole('button',{name:'Check latest details',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Latest intake details could not be checked'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Retry same submission',exact:true}).isEnabled(),true,'Failed reconciliation preserves the exact submission retry');
  assert.equal(await page.locator('.application-fields').evaluate(node=>node.disabled),true);
  faults.stateFailure=false;
  faults.stallBeforeSubmit=false;await page.getByRole("button",{name:"Retry same submission",exact:true}).click();await page.waitForFunction(()=>window.destination==="/application");
  passed.push("an empty reconciliation read never assumes an aborted submission rolled back; same request remains frozen and retryable");

  await mountEditor();
  await page.getByRole('button',{name:'Refresh intake availability',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Intake details updated. Your draft is preserved.'}).waitFor();
  assert.equal(await page.locator('.process-intake-status :is(button,a,[role="alert"])').count(),0);
  assert.equal(await page.locator('.process-intake-status').evaluate(node=>Boolean(node.closest('.callout'))),false,'Routine success is compact text');
  assert.equal(await page.getByRole('button',{name:'Check latest details',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Reload saved draft',exact:true}).count(),0);
  for(const width of [375,1440]){await page.setViewportSize({width,height:width===375?812:950});await page.getByRole('button',{name:'Refresh intake availability',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifactDir,`apply-intake-status-${width}.png`)});}
  await runtime.db.exec("update recruitment_settings set intake_state='paused'");
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByText(/Intake is paused/).waitFor();
  assert.equal(await page.locator('.process-intake-status').count(),0,'A successful focus refresh remains silent and clears routine success');
  faults.stateFailure=true;await page.getByRole('button',{name:'Refresh intake availability',exact:true}).click();
  await page.getByRole('button',{name:'Retry intake refresh',exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').filter({hasText:'Latest intake details could not be checked'}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Reload saved draft',exact:true}).count(),0,'Read failure offers a relevant retry without discarding input');
  faults.stateFailure=false;await page.getByRole('button',{name:'Retry intake refresh',exact:true}).click();
  await page.getByRole('button',{name:'Retry intake refresh',exact:true}).waitFor({state:'detached'});
  assert.equal(await page.locator('.process-intake-status').count(),0,'Only explicit Refresh intake availability announces success');
  await runtime.open();
  passed.push('explicit intake refresh has quiet polite status, focus refresh stays silent, and failed reads retain relevant retry without reload');

  await runtime.db.exec("update recruitment_settings set intake_state='paused'");
  await mountEditor();
  await page.getByText(/Intake is paused/).waitFor();
  assert.equal(await page.getByRole("button",{name:"Submit application",exact:true}).isDisabled(),true);
  await selectStep(3);
  await page.locator("#collaboration").fill("Draft editing is available outside intake.");
  await autosave();
  await until(()=>faults.posts.some(post=>post.action==="save"));
  await runtime.open();
  await selectStep(5);
  await page.getByRole("button",{name:"Refresh intake availability",exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('button[type="submit"]').disabled);
  passed.push("paused intake disables submission while drafts stay editable; availability refresh enables submission");
  await mountEditor();
  await runtime.db.exec("update recruitment_settings set intake_state='closed'");
  await page.getByRole("button",{name:"Submit application",exact:true}).click();
  await page.getByText(/Intake is currently unavailable/).waitFor();
  assert.equal(await page.getByRole("button",{name:"Submit application",exact:true}).isDisabled(),true);
  await page.getByRole("button",{name:"Refresh intake availability",exact:true}).click();
  await page.getByText(/Intake is closed/).waitFor();
  await selectStep(3);
  await page.locator("#collaboration").fill("Preserved after closed intake rejection");
  await autosave();
  await until(()=>faults.posts.some(post=>post.action==="save"));
  assert.equal(await page.locator("#motivation").inputValue(),validSimplifiedSubmission().answers.motivation);
  await runtime.open();
  passed.push("a stale accepting form is rejected after closure, retains answers, refreshes closed copy and still saves drafts");


  await mountEditor(validSimplifiedSubmission(),{stallAfterCommit:"submit"});
  await page.getByRole("button",{name:"Submit application",exact:true}).click();await until(()=>faults.committed);
  faults.access={kind:"applicant",accountId:crypto.randomUUID()};
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading",{name:"Your access has changed",exact:true}).waitFor();
  await page.clock.runFor(15001);
  assert.equal(await page.getByRole("button",{name:"Retry same submission",exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.destination),"");
  passed.push("account change unmounts private form, aborts waiting command, and ignores obsolete response");
  await mountEditor();
  await page.getByRole("button",{name:"Submit application",exact:true}).click();await page.waitForFunction(()=>window.destination==="/application");
  const reviewing=(await runtime.rpc("get_application_state")).application;
  const syntheticAdmin=await runtime.addIdentity(),syntheticEvaluator=await runtime.addIdentity();
  for(const [person,role] of [[syntheticAdmin,"administrator"],[syntheticEvaluator,"evaluator"]])await runtime.db.query("insert into staff_memberships(user_id,role,status) values($1,$2,'active')",[person.id,role]);
  await runtime.db.transaction(async tx=>{await tx.exec("set local role authenticated");await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[syntheticAdmin.id,JSON.stringify({aal:"aal2"})]);await tx.query("select public.manage_evaluation($1)",[{action:"assign",applicationId:reviewing.id,evaluatorId:syntheticEvaluator.id,expectedApplicationVersion:1,expectedAssignmentId:null,reason:"",mutationId:crypto.randomUUID()}]);});
  await mountPortal();await page.locator(".application-receipt .badge").filter({hasText:"Under Review"}).waitFor();
  await page.getByRole("button",{name:"Withdraw application",exact:true}).click();await page.getByRole("button",{name:"Confirm withdrawal",exact:true}).click();await page.getByText("Your application has been withdrawn.",{exact:true}).waitFor();
  const reviewedWithdrawal=(await runtime.rpc("get_application_state")).application;
  assert.equal(reviewedWithdrawal.version,3);assert.deepEqual(reviewedWithdrawal.history.map(e=>e.status),["Submitted","Under Review","Withdrawn"]);assert.deepEqual(reviewedWithdrawal.data,reviewing.data);
  passed.push("Under Review renders in the public portal and withdrawal uses its current revision without exposing evaluation data");
  await page.evaluate(()=>{
    const retained=document.createElement('div');retained.id='retained-workspace-fixture';retained.className='workspace-frame';retained.dataset.workspaceFrame='applicant';retained.style.setProperty('display','none','important');document.body.append(retained);
  });
  for(const [route,frame] of [['/',null],['/privacy',null],['/apply','applicant'],['/application','applicant'],['/staff','staff'],['/admin','administrator'],['/admin/intake','administrator'],['/reviewer','evaluator'],['/admin/applications','administrator'],['/404',null]]){
    await page.evaluate(path=>window.mountShell(path),route);
    await page.locator(frame?`.site-header[data-workspace-frame="${frame}"]`:'.site-header:not([data-workspace-frame])').waitFor();
    assert.equal(await page.locator('.site-header').getAttribute('data-tone'),frame||route==='/'?'dark':'light',route+' derives its tone from the active route despite retained content');
    assert.equal(await page.locator('.workspace-footer').count(),frame?0:1);
    assert.equal(await page.locator('.footer-standard').isVisible(),!frame);
    assert.equal(await page.locator('.site-footer').count(),frame?0:1);
    if(!frame){
      const footer=page.locator('.footer-standard');
      assert.equal(await footer.locator('a[href="/privacy"]').isVisible(),true,route+' keeps footer privacy access');
      assert.equal(await footer.locator('a[href="mailto:awslc.alpha@gmail.com"]').isVisible(),true,route+' keeps footer contact access');
    }
    for(const width of [320,375,414,639,640,768,1024,1199,1200,1440,1920]){
      await page.setViewportSize({width,height:950});
      const gutter=width<640?16:width<1024?24:32,label=route+' at '+width+'px';
      const inner=await page.locator('.site-header .header-inner').boundingBox();
      const logo=await page.locator('.site-header .brand img').boundingBox();
      const compactMenu=await page.locator('.site-header .mobile-menu-button').isVisible();
      const end=await page.locator(compactMenu?'.site-header .header-actions':'.site-header .main-nav').boundingBox();
      assert.ok(inner&&logo&&end,label+' has visible header anchors');
      assert.ok(Math.abs(inner.x-gutter)<=1,label+' shares the left gutter');
      assert.ok(Math.abs(inner.width-(width-2*gutter))<=1,label+' uses the full shared header width');
      assert.ok(Math.abs(logo.x-gutter)<=1,label+' anchors the logo to the shared gutter');
      assert.equal(logo.width,width<1024?40:44,label+' uses the landing logo size');
      assert.ok(await page.locator('.site-header').evaluate(node=>node.offsetHeight)>=(width<1024?64:80),label+' uses the main-site navbar minimum height');
      assert.equal(compactMenu,width<1280,label+' uses the main-site desktop breakpoint');
      assert.ok(Math.abs(end.x+end.width-(width-gutter))<=1,label+' anchors navigation/menu to the shared right gutter');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' has no horizontal overflow');
      if(width===375||width===1199){
        const menu=page.locator('.site-header .mobile-menu-button');
        await menu.focus();await page.keyboard.press('Enter');
        assert.equal(await menu.getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('.main-nav').evaluate(node=>getComputedStyle(node).animationName),'none','Reduced motion disables the circular reveal');
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('.main-nav a').first().evaluate(node=>node===document.activeElement),true,'Tab enters the opened menu');
        await page.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'),'false');
        assert.equal(await menu.evaluate(node=>node===document.activeElement),true);
      }
    }
  }
  await page.evaluate(()=>document.getElementById('retained-workspace-fixture').remove());
  passed.push('active route segments select the public/workspace frame even when a previous workspace remains hidden in the DOM');
  passed.push('all ten routes retain logo and navigation/menu gutters at eleven widths');

  async function assertTextContrast(selector, backgroundSelector = selector) {
    const ratio = await page.locator(selector).evaluate((node, backgroundSelector) => {
      const context = document.createElement('canvas').getContext('2d');
      function luminance(color) {
        context.clearRect(0,0,1,1); context.fillStyle=color; context.fillRect(0,0,1,1);
        const [r,g,b,a]=context.getImageData(0,0,1,1).data;
        // Translucent surfaces are conservatively composited over white.
        const linear=[r,g,b].map(value=>value*a/255+255-a).map(value=>{const s=value/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});
        return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
      }
      const style=getComputedStyle(node),fg=luminance(style.color),bg=luminance(getComputedStyle(node.closest(backgroundSelector)).backgroundColor);
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    }, backgroundSelector);
    assert.ok(ratio>=4.5,selector+' meets 4.5:1 foreground contrast, got '+ratio);
  }
  async function assertApplyContrast() {
    if (!await page.locator('.nav-apply:visible').count()) return;
    const ratio=await page.locator('.nav-apply').evaluate(node=>{
      const context=document.createElement('canvas').getContext('2d');
      const lum=color=>{context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);const [r,g,b]=context.getImageData(0,0,1,1).data;const linear=[r,g,b].map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;};
      const header=node.closest('.site-header'),mobile=node.closest('.main-nav').dataset.open==='true';
      const fg=lum(getComputedStyle(node).color),bg=lum(mobile?'#232f3e':header.dataset.tone==='dark'?'#08090a':'#fff');
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    });
    assert.ok(ratio>=4.5,'Header action retains 4.5:1 contrast');
  }
  const chapterLinks=['About','Events','Team','Connect','Skillbuilders'];
  for(const [props,expected] of [
    [{},['Membership ID','Apply now']],
    [{signedIn:true},['My application','Membership ID']],
    [{signedIn:true,member:true},['Membership ID']],
    [{signedIn:true,staff:{role:'administrator',status:'active',needsMfa:false}},['Applications','Intake','Staff management','Membership ID']],
    [{signedIn:true,staff:{role:'evaluator',status:'active',needsMfa:false}},['Organization Head','Membership ID']],
    [{signedIn:true,staff:{role:'administrator',status:'active',needsMfa:true}},['Staff sign-in','Membership ID']],
    [{signedIn:true,staff:{role:'evaluator',status:'suspended',needsMfa:false}},['Staff sign-in','Membership ID']],
    [{signedIn:true,staff:{role:'administrator',status:'revoked',needsMfa:false}},['Staff sign-in','Membership ID']],
  ]){
    for(const route of ['/','/privacy','/apply','/application','/staff','/admin','/admin/applications','/admin/intake','/reviewer','/404']){
      await page.evaluate(({route,props})=>window.mountShell(route,props),{route,props});
      await page.waitForFunction(expected=>[...document.querySelectorAll('.main-nav a,.main-nav .nav-apply')].at(-1)?.textContent===expected,expected.at(-1));
      assert.deepEqual(await page.locator('.main-nav a,.main-nav .nav-apply').allTextContents(),[...chapterLinks,...expected],'Chapter navigation plus preserved role tools on '+route);
      for(const [label,href] of [['About','https://www.awsc-alpha.cloud/#about'],['Events','https://www.awsc-alpha.cloud/#events'],['Team','https://www.awsc-alpha.cloud/#members'],['Connect','https://www.awsc-alpha.cloud/#contact'],['Skillbuilders','https://www.awsc-alpha.cloud/skillbuilder/']]) assert.equal(await page.locator('.main-nav').getByRole('link',{name:label,exact:true}).getAttribute('href'),href);
        await assertApplyContrast();
        if(props.signedIn) { await page.locator('.account-trigger').click(); assert.equal(await page.locator('.account-trigger').getAttribute('aria-expanded'),'true'); }
        assert.equal(await page.locator('.main-nav').getByRole('button',{name:'Sign out',exact:true}).count(),props.signedIn?1:0);
        if(props.signedIn) { await page.keyboard.press('Escape');assert.equal(await page.locator('.account-trigger').evaluate(node=>document.activeElement===node),true); }
    }
  }
  passed.push('anonymous, applicant, administrator, evaluator, MFA-pending and inactive staff menus stay consistent across ten routes');

  await page.evaluate(()=>window.mountShell('/opportunities',{signedIn:true,accountLabel:'Alex Example'}));
  const account=page.getByRole('button',{name:'Alex Example',exact:true});await account.click();
  await page.keyboard.press('Tab');assert.equal(await page.getByRole('link',{name:'My application',exact:true}).evaluate(node=>document.activeElement===node),true,'Keyboard enters the account actions');
  await page.locator('body').click({position:{x:5,y:200}});assert.equal(await account.getAttribute('aria-expanded'),'false','Outside pointer dismisses account actions');
  await page.evaluate(()=>window.mountShell('/opportunities',{pendingSession:true}));
  assert.equal(await page.locator('.account-trigger,.nav-apply').count(),0,'Pending session exposes no account or apply action');

  const adminMenu={signedIn:true,staff:{role:'administrator',status:'active',needsMfa:false}};
  for(const width of [320,375,768,1200,1440]){
    await page.setViewportSize({width,height:500});await page.evaluate(props=>{window.scrollTo({top:0,behavior:'instant'});window.mountNavigation('/admin',props);},adminMenu);
    await page.locator('main').waitFor();
    await page.evaluate(()=>document.documentElement.style.fontSize='32px');
    await page.waitForFunction(()=>{const header=document.querySelector('.site-header');return header.offsetHeight>100&&parseFloat(getComputedStyle(header.querySelector('.brand strong')).fontSize)>20&&Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))-header.offsetHeight)<1;});
    const menu=page.getByRole('button',{name:'Open menu',exact:true});await menu.waitFor();
    const overflowBefore=await page.evaluate(()=>document.body.style.overflow);
    const before=await page.locator('main').boundingBox(),height=await page.locator('.site-header').evaluate(node=>node.offsetHeight);
    await menu.click();assert.equal((await page.locator('main').boundingBox()).y,before.y,'Menu overlays without moving page content');
    assert.equal(await page.locator('.site-header').evaluate(node=>node.offsetHeight),height,'Full-screen menu does not change the measured navbar row');
    const clipped=await page.locator('.site-header a,.site-header button').evaluateAll(nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.width>0&&box.height>0&&(box.left<-.5||box.right>innerWidth+.5);}).map(node=>node.textContent));
    assert.deepEqual(clipped,[],'Navbar controls fit enlarged text at '+width);
    assert.equal(await page.locator('main').evaluate(node=>node.inert),true,'Background is inert while the mobile menu is open');
    await page.keyboard.press('Shift+Tab');
    const signOut=page.locator('.site-header').getByRole('button',{name:'Sign out',exact:true});
    assert.equal(await signOut.evaluate(node=>document.activeElement===node),true,'Shift+Tab wraps to the last mobile action');
    await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Close menu',exact:true}).evaluate(node=>document.activeElement===node),true,'Tab wraps to Close');
    await signOut.focus();
    const box=await signOut.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=501,'Full-screen menu scrolls to its final action');
    await page.keyboard.press('Escape');assert.equal(await menu.evaluate(node=>node===document.activeElement),true);
    assert.equal(await page.locator('main').evaluate(node=>node.inert),false,'Closing restores background interaction');
    assert.equal(await page.evaluate(()=>document.body.style.overflow),overflowBefore,'Closing restores body scrolling');
    await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  }
  passed.push('navbar reflows into its mobile menu at 200% text size, measures its actual height, overlays without shifting content and scrolls within short viewports');

  await page.clock.resume();
  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    for (const route of ['/','/opportunities','/privacy','/apply','/application','/membership','/staff','/admin','/admin/applications','/admin/intake','/reviewer','/404']) {
      await page.evaluate(path=>{window.scrollTo({top:0,behavior:'instant'});window.mountNavigation(path);},route);
      const dark=!['/opportunities','/privacy','/404'].includes(route);
      for (const y of [0,400,1400,300,1700,0]) {
        await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
        await page.waitForFunction(scrolled=>document.querySelector('.site-header').dataset.scrolled===String(scrolled),y>20);
        const painted=await page.locator('.site-header').evaluate(node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,top:node.getBoundingClientRect().top,transform:style.transform};});
        assert.equal(painted.background,y>20?dark?'rgba(13, 17, 23, 0.8)':'rgba(255, 255, 255, 0.8)':'rgba(0, 0, 0, 0)',route+' matches the main-site transparent/frosted surface');
        assert.ok(Math.abs(painted.top)<.5,route+' remains visible under reduced motion');
        assert.equal(painted.transform,'none',route+' disables scroll motion for reduced motion');
      }
      await assertApplyContrast();
    }
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{window.mountNavigation('/opportunities');window.scrollTo({top:0,behavior:'instant'});document.activeElement?.blur();});
  await page.evaluate(()=>window.scrollTo({top:800,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.site-header').dataset.hidden==='true');
  await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.site-header').dataset.hidden==='false');
  await page.locator('.site-header .brand').focus();
  await page.evaluate(()=>window.scrollTo({top:1000,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.site-header').dataset.hidden==='false');
  await page.emulateMedia({reducedMotion:'reduce'});
  passed.push('all twelve routes match transparent/frosted light/dark header states; scroll hides/reveals with focus and reduced-motion guards');

  await page.evaluate(()=>window.mountHome());
  const directory=page.locator(".roles-grid");
  async function assertTrackColors() {
    const colors={CORE_TEAM:['rgb(89, 68, 44)','rgb(43, 33, 25)'],COMMITTEE:['rgb(81, 65, 111)','rgb(36, 28, 53)'],MEMBER:['rgb(40, 86, 81)','rgb(18, 45, 43)']};
    for(const card of await directory.locator('.role-card').all()) {
      const gradient=await card.evaluate(node=>getComputedStyle(node).backgroundImage);
      for(const color of colors[await card.getAttribute('data-track')]) assert.ok(gradient.includes(color),'Glossy gradient follows its track');
    }
  }
  await assertTrackColors();
  for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await directory.locator(".role-card").count(),17);
    await page.getByRole("heading",{name:"Available Roles",exact:true}).waitFor();
    assert.deepEqual(await directory.locator('.role-card').evaluateAll(nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.left<0||box.right>innerWidth+1;}).map(node=>node.textContent)),[], 'Whole cards fit '+width+'px');
    assert.equal(await directory.evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),width>=1024?3:width>=640?2:1);
    if(width===375||width===1440) await page.screenshot({path:path.join(artifactDir,'opportunity-cards-'+width+'.png')});
  }
  await page.getByRole("button",{name:"Core Team",exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.role-card').length===6);
  await assertTrackColors();
  const trigger=page.getByRole('link',{name:'View role: Vice Chief Creatives Officer',exact:true});
  assert.equal(await directory.locator('.role-description').count(),0,'Descriptions appear only in the modal');
  assert.equal(await directory.locator('.role-card a,.role-card button').count(),0,'Each card is one link without nested controls');
  await trigger.focus();
  await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
  assert.equal(await trigger.evaluate(node=>getComputedStyle(node).outlineStyle),'solid','Whole card has visible keyboard focus');
  await trigger.hover();
  assert.equal(await trigger.evaluate(node=>getComputedStyle(node).transform),'none','Reduced motion keeps the hovered card still');
  assert.equal(await trigger.evaluate(node=>getComputedStyle(node,'::before').animationName),'none','Reduced motion disables shine');
  await trigger.press("Enter");
  const details=page.getByRole('dialog',{name:'Vice Chief Creatives Officer',exact:true});
  await details.waitFor();
  assert.equal(await details.getByText(creative.scenario,{exact:true}).count(),0);
  assert.equal(await details.getByText(creative.description,{exact:true}).isVisible(),true,'Modal keeps the complete description');
  await details.getByRole('button',{name:'Continue with Google',exact:true}).click();
  await page.waitForFunction(()=>window.signInOpportunity==='core-creatives');
  await page.evaluate(()=>window.resolveSignIn());
  await page.keyboard.press('Escape');
  await details.waitFor({state:'detached'});
  await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='View role: Vice Chief Creatives Officer');
  for(const target of ['.role-symbol','.role-card-heading','.role-card-footer']){
    await trigger.locator(target).click();await details.waitFor();await page.keyboard.press('Escape');await details.waitFor({state:'detached'});
  }
  await trigger.click({position:{x:12,y:12}});await details.waitFor();await page.keyboard.press('Escape');await details.waitFor({state:'detached'});
  await page.getByRole('button',{name:'Committee',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.role-card').length===10);
  await assertTrackColors();
  await page.getByRole('button',{name:'Member',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.role-card').length===1);
  await assertTrackColors();
  assert.match(await directory.textContent(),/General Member/);
  assert.match(await directory.textContent(),/No fixed limit/);
  await page.getByRole('button',{name:'All roles',exact:true}).click();
  await page.locator('#role-search').fill('web');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.role-card').length===1);
  assert.match(await directory.textContent(),/Web Development/);
  await assertTrackColors();
  assert.ok(new URL(page.url()).searchParams.get('q')==='web');
  await directory.locator('.role-card').click();
  const webDetails=page.getByRole('dialog');await webDetails.waitFor();
  assert.equal(new URL(page.url()).searchParams.get('q'),'web','Opening a card preserves search');
  await page.keyboard.press('Escape');await webDetails.waitFor({state:'detached'});
  assert.equal(new URL(page.url()).searchParams.get('q'),'web','Closing a card preserves search');
  await page.screenshot({path:path.join(artifactDir,"opportunity-catalog-1440.png")});
  async function mountRole(entry, id='core-creatives') {
    await page.evaluate(({entry,id})=>{window.mountHome(entry);history.replaceState({},'','/opportunities?opportunity='+id);dispatchEvent(new PopStateEvent('popstate'));},{entry,id});
    await page.getByRole('dialog').waitFor();
  }
  async function assertRoleBounds(label) {
    const issues=await page.getByRole('dialog').evaluate(node=>{
      const box=node.getBoundingClientRect();const issues=[];
      if(box.left<0||box.right>innerWidth+1||box.top<0||box.bottom>innerHeight+1)issues.push('dialog bounds');
      if(node.scrollWidth>node.clientWidth+1)issues.push('dialog horizontal overflow');
      for(const child of node.querySelectorAll('a,button,input,h2,h3,p,li')){const b=child.getBoundingClientRect();if(b.width&&b.height&&(b.left<box.left||b.right>box.right+1))issues.push(child.tagName+' horizontal overflow');}
      return issues;
    });
    assert.deepEqual(issues,[],label);
  }
  for(const id of ['core-creatives','skillbuilders-web','general-member']) {
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:900});await mountRole({kind:'anonymous'},id);
      await assertRoleBounds(id+' '+width);
      const panel=page.getByRole('dialog');
      assert.equal(await panel.getByRole('heading',{name:'About this role',exact:true}).count(),1);
      assert.equal(await panel.getByRole('heading',{name:'Build with Alpha.',exact:true}).count(),0);
      assert.equal(await panel.locator('h2').count(),1,'Role title appears once');
      if(width===1440||width===375)await page.screenshot({path:path.join(artifactDir,'role-modal-'+id+'-'+width+'.png')});
      await page.keyboard.press('Escape');await panel.waitFor({state:'detached'});
    }
  }
  faults.zeroVacancies=true;await mountRole({kind:'anonymous'});
  await page.getByRole('dialog').getByText('0 places remaining',{exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog').getByRole('button',{name:'Continue with Google',exact:true}).isEnabled(),true,'Full roles remain selectable');
  await page.keyboard.press('Escape');delete faults.zeroVacancies;
  faults.vacanciesUnavailable=true;await mountRole({kind:'anonymous'});
  await page.getByRole('dialog').getByText('Vacancies temporarily unavailable',{exact:true}).waitFor();
  await page.keyboard.press('Escape');delete faults.vacanciesUnavailable;
  const modalApplicant=await runtime.addIdentity();runtime.setIdentity(modalApplicant);runtime.setKind('authenticated');delete faults.access;
  const accessStates=[
    [{kind:'applicant',applicant:modalApplicant,hasDraft:true,submitted:false},'Continue application','/apply?opportunity=core-creatives'],
    [{kind:'applicant',applicant:modalApplicant,hasDraft:true,submitted:true},'View your application','/application'],
    [{kind:'member'},'Open Membership ID','/membership'],
    [{kind:'staff'},'Staff workspace','/staff'],
    [{kind:'unconfigured'},'Retry access',null],
    [{kind:'unavailable'},'Retry access',null],
  ];
  for(const [entry,label,href] of accessStates) for(const width of [375,1440]) {
    await page.setViewportSize({width,height:900});await mountRole(entry);
    const panel=page.getByRole('dialog');await assertRoleBounds(entry.kind+' '+width);
    const action=panel.getByRole(href?'link':'button',{name:label,exact:true});assert.equal(await action.count(),1);
    if(href)assert.equal(await action.getAttribute('href'),href);
    assert.equal(await panel.getByRole('checkbox').count(),0,'Non-start states do not render new-draft consent');
    if(width===375)await action.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(artifactDir,'role-modal-'+label.toLowerCase().replaceAll(' ','-')+'-'+width+'.png')});
    await page.keyboard.press('Escape');await panel.waitFor({state:'detached'});
  }
  await page.setViewportSize({width:1440,height:950});
  const freshEntry={kind:'applicant',applicant:modalApplicant,hasDraft:false,submitted:false};
  await mountRole(freshEntry,'general-member');
  let panel=page.getByRole('dialog');
  assert.equal(await panel.locator('.apply-requested,.apply-details').count(),0,'Embedded consent omits repeated role/preparation');
  const beforeConsent=faults.posts.length;
  await panel.getByRole('button',{name:'Start application',exact:true}).click();
  await panel.getByRole('alert').waitFor();assert.equal(faults.posts.length,beforeConsent,'No draft request before consent');
  for(const width of [320,375,1440]) {
    await page.setViewportSize({width,height:900});await assertRoleBounds('consent '+width);
    await page.screenshot({path:path.join(artifactDir,'role-modal-consent-'+width+'.png')});
  }
  await page.setViewportSize({width:1440,height:950});await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  await assertRoleBounds('consent desktop at 200% text');
  await page.setViewportSize({width:375,height:480});
  await assertRoleBounds('consent short screen at 200% text');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const start=panel.getByRole('button',{name:'Start application',exact:true});
  await panel.getByRole('checkbox').focus();
  for(let index=0;index<3;index++)await page.keyboard.press('Tab');
  assert.equal(await start.evaluate(node=>document.activeElement===node),true,'Keyboard reaches Start through consent, privacy and recovery');
  await page.waitForFunction(()=>{const node=document.querySelector('.role-entry-action .apply-start-form > button');const b=node?.getBoundingClientRect(),dialog=node?.closest('dialog').getBoundingClientRect();return b&&dialog&&b.top>=dialog.top&&b.bottom<=dialog.bottom+1;}).catch(async error=>{await page.screenshot({path:path.join(artifactDir,'role-modal-short-screen-failure.png')});throw error;});
  assert.ok(await start.evaluate(node=>{const b=node.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight+1;}),'Action can be reached on a short enlarged screen');
  await page.screenshot({path:path.join(artifactDir,'role-modal-consent-short-enlarged.png')});
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));await page.setViewportSize({width:1440,height:950});
  await panel.getByRole('checkbox').check();faults.saveUnavailable=true;
  await start.click();await panel.getByRole('alert').waitFor();
  const failedStart=faults.posts.at(-1);faults.saveUnavailable=false;delete faults.releaseSave;faults.waitForSave=true;
  await start.click();await until(()=>faults.releaseSave);
  assert.deepEqual(faults.posts.at(-1),failedStart,'Embedded retry retains the exact draft request');
  assert.equal(await panel.getByRole('button',{name:'Close dialog',exact:true}).isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await panel.isVisible(),true,'Pending draft creation blocks dismissal');
  await page.mouse.click(2,2);assert.equal(await panel.isVisible(),true,'Pending draft creation blocks backdrop dismissal');
  faults.releaseSave();delete faults.waitForSave;
  await page.waitForFunction(()=>window.destination==='/apply');
  assert.equal((await savedDraftData()).opportunityId,'general-member','Embedded creation preserves the exact selected role');
  passed.push('glossy role dialogs fit three tracks/four widths and all access states; embedded consent gates creation, preserves exact retries and busy dismissal, and fits short enlarged screens');

  passed.push('whole-card links fit four widths, support clicks across the surface, keyboard focus restoration, reduced motion, modal descriptions, three track filters, URL search, exact Google role handoff and vacancy labels');

  await page.evaluate(()=>{window.mountDepth();window.scrollTo({top:0,behavior:"instant"});});
  for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:950});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Public cards fit '+width+'px');
    const escaped=await page.locator('.immersive-card a').evaluateAll(nodes=>nodes.filter(node=>{const box=node.getBoundingClientRect();return box.left<0||box.right>innerWidth+1;}).map(node=>node.textContent));
    assert.deepEqual(escaped,[],'Card actions remain inside '+width+'px');
    assert.equal(await page.locator('.track-option').evaluate(node=>getComputedStyle(node).transform),'none','Reduced motion retains a static card');
  }
  await page.setViewportSize({width:1440,height:950});
  await page.emulateMedia({reducedMotion:'no-preference'});
  const depthCard=page.locator('.track-option');
  await depthCard.scrollIntoViewIfNeeded();
  const depthBox=await depthCard.boundingBox();
  assert.ok(depthBox);
  await page.mouse.move(0,0);
  await page.mouse.move(depthBox.x+depthBox.width*.8,depthBox.y+depthBox.height*.3);
  await page.waitForFunction(()=>{const node=document.querySelector('.track-option');const matrix=new DOMMatrixReadOnly(getComputedStyle(node).transform);return Math.abs(matrix.m13)+Math.abs(matrix.m23)>.001;});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.runFor(400);
  assert.equal(await depthCard.evaluate(node=>getComputedStyle(node).transform),'none','Changing to reduced motion immediately removes tilt');
  const preparationLink=page.getByRole('link',{name:'Read preparation',exact:true});
  await preparationLink.focus();await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button',{name:'Start application',exact:true}).evaluate(node=>node===document.activeElement),true,'Keyboard reaches the preparation action without hovering');
  assert.equal(await page.getByRole('link',{name:'Read the recruitment privacy notice',exact:true}).getAttribute('href'),'/privacy');
  await page.evaluate(()=>window.mountShell('/privacy'));
  passed.push('public depth cards fit four widths, rotate for a fine pointer, stop for reduced motion, and retain keyboard preparation/privacy actions');
  assert.deepEqual(errors,[]);
  passed.push("six widths with both device preferences and fixed light appearance; keyboard dialogs, error focus, reduced motion; no page errors");
  console.log(JSON.stringify({passed},null,2));
} finally { await browser?.close();await runtime.db.close(); }

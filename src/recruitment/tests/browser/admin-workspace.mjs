import { recruitmentStyleShell } from "../fixtures/recruitment-build.mjs";
// Real administration shell and overview; synthetic read results and router only.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertEnlargedProcess } from "../fixtures/browser-motion.mjs";
const require = createRequire(import.meta.url), project = fileURLToPath(new URL("../../", import.meta.url));
const { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();
const modules = new Map();
for (const [name, relative] of [["./ui", "../app/(recruitment)/recruitment/components/ui.tsx"], ["overview", "../app/(recruitment)/recruitment/admin/overview.tsx"], ["@/recruitment/lib/drafts", "lib/drafts.ts"], ["./catalog.ts", "lib/catalog.ts"]]) {
  const filename = path.join(project, relative);
  const { code } = await transform(await readFile(filename, "utf8"), { filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
  modules.set(name, code);
}
modules.set("@/app/(recruitment)/recruitment/components/admin-shell", "module.exports=require('./admin-shell');");
modules.set("@/app/(recruitment)/recruitment/components/ui", modules.get("./ui"));
modules.set("next/link", "exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");
modules.set("next/image", "exports.__esModule=true;exports.default=({priority,unoptimized,...props})=>require('react/jsx-runtime').jsx('img',props);");
modules.set("next/navigation", "exports.usePathname=()=>window.testPath||'/recruitment/admin';exports.useSelectedLayoutSegments=()=>(window.testPath||'/recruitment/admin').split('/').filter(Boolean).slice(1);exports.useRouter=()=>({refresh:()=>window.refreshes++});");
modules.set("@/app/(recruitment)/recruitment/auth/actions", "exports.signOut=async()=>{window.signOutCalls=(window.signOutCalls||0)+1};exports.startApplication=async()=>{};");
await installBrowserMotion(modules); await installRecruitmentUI(modules);
for (const [name, pkg, file] of [["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],["scheduler","scheduler","scheduler.development.js"]]) modules.set(name, await readFile(path.join(path.dirname(require.resolve(pkg + "/package.json")), "cjs", file), "utf8"));
modules.set("./drafts.ts", modules.get("@/recruitment/lib/drafts"));
modules.set("@/recruitment/lib/community-client", "exports.communityRead=()=>new Promise((resolve,reject)=>{window.completeActivity=resolve;window.failActivity=()=>reject(Error('Synthetic activity failure'))});");
const bundle = `(()=>{const process={env:{NODE_ENV:'development'}},modules={${[...modules].map(([name, source])=>JSON.stringify(name)+":function(module,exports,require){\n"+source+"\n}").join(",")}},cache={};function require(name){if(!cache[name]){if(!modules[name])throw Error('Unmocked dependency '+name);const module=cache[name]={exports:{}};modules[name](module,module.exports,require)}return cache[name].exports}const {jsx}=require('react/jsx-runtime'),root=require('react-dom/client').createRoot(document.getElementById('root'));let revision=0;window.mount=(props,route='/recruitment/admin')=>{window.testPath=route;window.refreshes=0;root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',staff:{role:'administrator',status:'active',needsMfa:false},children:jsx(require('overview').AdminOverview,props)},String(++revision)))};window.mountLoading=(view)=>{const frame=view==='staff-entry'?'staff':view==='reviewer'?'evaluator':'administrator';window.testPath=frame==='administrator'?(view==='overview'?'/recruitment/admin':'/recruitment/admin/'+view):view==='reviewer'?'/recruitment/reviewer':'/recruitment/staff';let ready=false,release;const promise=new Promise(resolve=>release=resolve);window.completeLoading=()=>{ready=true;release()};const Content=()=>{if(!ready)throw promise;return jsx('main',{id:'main-content',children:'Content ready'})};const skeletons=require('./workspace-skeleton');root.render(jsx(require('recruitment-test-frame').Frame,{frame,children:jsx(require('react').Suspense,{fallback:frame==='staff'?jsx(skeletons.StaffPageSkeleton,{}):frame==='evaluator'?jsx(skeletons.ReviewerPageSkeleton,{}):jsx(skeletons.AdminPageSkeleton,{view}),children:jsx(Content,{})})},String(++revision)))};
window.mountMembers=()=>{window.testPath='/recruitment/admin/members';root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',children:jsx('main',{id:'main-content',className:'admin-page',children:[jsx(require('./admin-shell').AdminPageHeader,{title:'Organization members',description:'Invite existing members and manage their Alpha membership access.'},'header'),jsx(require('./member-administration').MemberAdministration,{accountId:'synthetic-account',workspace:true},'members')]})},String(++revision)))};
window.mountActivity=()=>{window.testPath='/recruitment/admin/activity';root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',children:jsx('main',{id:'main-content',className:'admin-page',children:jsx(require('./member-administration').SecurityLog,{accountId:'synthetic-account',expanded:true})})},String(++revision)))};
window.mountPublic=()=>{window.testPath='/recruitment/privacy';root.render(jsx(require('recruitment-test-frame').Frame,{frame:null,children:jsx('main',{id:'main-content',children:'Public page'})},String(++revision)))};})()`;
const build = path.join(project, "../../.next");
const appPaths = JSON.parse(await readFile(path.join(build, "server/app-paths-manifest.json"), "utf8"));
assert.ok(appPaths["/(main)/admin/page"], "The Skillbuilder administrator route remains separate");
for (const route of ["admin", "admin/applications", "admin/intake", "admin/staff", "admin/members", "admin/activity", "reviewer", "staff"]) {
  assert.ok(appPaths["/(recruitment)/recruitment/" + route + "/page"], route + " is present in the unified build");
}
const shell = await recruitmentStyleShell();
const styles = [...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(match=>match[1]);
const output = path.join(project, ".next/verification/admin-workspace"); await mkdir(output, { recursive:true });
const { chromium } = await import("playwright"), browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error=>errors.push(error.message));
  await page.route("https://admin.example.test/**", async route=>{
    const pathname = new URL(route.request().url()).pathname;
    if (styles.includes(pathname)) return route.fulfill({ contentType:"text/css", body:await readFile(path.join(build,pathname.slice("/_next/".length))) });
    if (pathname.startsWith("/recruitment/brand/")) return route.fulfill({ body:await readFile(path.join(project,"../../public",pathname)) });
    return route.fulfill({contentType:"text/html",body:'<html lang="en"><head>'+styles.map(style=>'<link rel="stylesheet" href="'+style+'">').join('')+'</head><body class="alpha-app"><div id="root"></div></body></html>'});
  });
  await page.goto("https://admin.example.test"); await page.addScriptTag({content:bundle});
  const data = { applications:{role:"administrator",queue:{total:36,statusCounts:{"Submitted":20,"Under Review":8,"Accepted":4,"Waitlisted":2,"Not Selected":1,"Withdrawn":1}},items:Array.from({length:25},(_,index)=>({id:String(index),name:"Synthetic applicant "+index,reference:"ALPHA-2026-SYNTHETIC",submittedAt:"2026-11-16T00:00:00Z",status:"Submitted"}))},staff:[{status:"active"},{status:"active"},{status:"suspended"}],intake:{state:"open",accepting:true,opensAt:"2026-11-15T00:00:00Z",closesAt:"2026-11-30T00:00:00Z"} };
  await page.evaluate(data=>window.mount(data),data); await page.getByRole("heading",{name:"Overview",exact:true}).waitFor();
  assert.deepEqual(await page.locator(".admin-metric>strong").allTextContents(),["36","8","2","Accepting"]);
  assert.equal(await page.locator(".admin-recent-list li").count(),5,"Dashboard uses totals rather than the first page length");
  assert.deepEqual(await page.locator(".admin-status-legend dd").allTextContents(),["20","8","4","2","1","1"],"Breakdown uses verified full-queue status totals");
  assert.equal(await page.locator(".admin-status-segment").count(),6);
  const segments = await page.locator(".admin-status-segment").evaluateAll(nodes=>nodes.map(node=>({color:getComputedStyle(node).backgroundColor,height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width})));
  assert.ok(segments.every(segment=>segment.color!=='rgba(0, 0, 0, 0)' && segment.height>0 && segment.width>0),"Nonzero status counts have visible colored segments");

  assert.equal(await page.locator(".admin-status-segment").evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).backgroundColor!=="rgba(0, 0, 0, 0)" && node.getBoundingClientRect().width>0)),true,"Every nonzero status is visibly painted");


  await page.getByRole("button",{name:"Refresh overview"}).click();assert.equal(await page.evaluate(()=>window.refreshes),1);
  for(const width of [320,375,768,1024,1440,1920]){
    await page.setViewportSize({width,height:950});await assertRecruitmentSurface(page,"Admin overview "+width);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('.admin-shell').evaluate(node=>getComputedStyle(node).borderRadius),width<768?'22px':'28px');
    if(width>=1200){
      const before=await page.locator('.admin-sidebar').boundingBox();
      await page.evaluate(()=>scrollTo({top:400,behavior:'instant'}));
      const after=await page.locator('.admin-sidebar').boundingBox();assert.ok(Math.abs(before.y-after.y)<=1,'Sidebar stays within the inset while content scrolls');
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    }
    if(width<1200){await page.getByRole("button",{name:"Admin sections",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Admin sections"});await dialog.waitFor();assert.equal(await dialog.getByRole("navigation",{name:"Admin sections"}).getByRole("link").count(),6);await page.keyboard.press("Escape");await dialog.waitFor({state:"detached"});assert.equal(await page.getByRole("button",{name:"Admin sections",exact:true}).evaluate(node=>node===document.activeElement),true);}
    if([375,1440,1920].includes(width)){await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:path.join(output,"overview-"+width+".png"),fullPage:true});}
  }
  await assertEnlargedProcess(page);
  await page.emulateMedia({forcedColors:"active"});
  assert.equal(await page.locator('.admin-metric').first().evaluate(node=>getComputedStyle(node).boxShadow),'none');
  assert.equal(await page.locator('.admin-sidebar a[aria-current="page"]').evaluate(node=>getComputedStyle(node).outlineWidth),'2px');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.emulateMedia({forcedColors:"none"});
  for(const route of ["/recruitment/admin","/recruitment/admin/applications","/recruitment/admin/intake","/recruitment/admin/staff","/recruitment/admin/members","/recruitment/admin/activity"]){await page.evaluate(({data,route})=>window.mount(data,route),{data,route});await page.waitForFunction(route=>document.querySelector('.admin-sidebar a[aria-current="page"]')?.getAttribute('href')===route,route);assert.equal(await page.locator('.site-header,.site-header-space').count(),0);}
  await page.evaluate(()=>window.mount({applications:null,staff:null,intake:null}));await page.waitForFunction(()=>document.querySelector('.admin-metric strong')?.textContent==='Unavailable');assert.deepEqual(await page.locator('.admin-metric>strong').allTextContents(),Array(4).fill('Unavailable'));assert.equal(await page.getByRole('button',{name:'Refresh overview'}).isEnabled(),true);
  await page.evaluate(data=>window.mount({...data,applications:{...data.applications,items:[],queue:{total:0,statusCounts:{'Under Review':0}}},staff:[]}),data);await page.getByText('No submitted applications yet.',{exact:true}).waitFor();assert.deepEqual((await page.locator('.admin-metric>strong').allTextContents()).slice(0,3),['0','0','0']);
  await page.evaluate(data=>window.mount({...data,intake:{...data.intake,accepting:false,serverNow:'2026-12-01T00:00:00Z'}}),data);await page.waitForFunction(()=>document.querySelectorAll('.admin-metric>strong')[3]?.textContent==='Deadline passed');
  await page.setViewportSize({width:1440,height:950});
  const account = page.locator('.admin-sidebar .admin-account');
  await account.locator('summary').click();
  await page.keyboard.press('Escape');assert.equal(await account.locator('details').evaluate(node=>node.open),false);
  assert.equal(await account.locator('summary').evaluate(node=>node===document.activeElement),true);
  await account.locator('summary').click();
  assert.equal(await account.getByRole('link',{name:'Membership ID',exact:true}).getAttribute('href'),'/recruitment/membership');
  assert.equal(await account.getByRole('link',{name:'Back to website',exact:true}).getAttribute('href'),'/');
  await page.evaluate(()=>{const marker=document.createElement('div');marker.id='unsaved-probe';marker.dataset.adminUnsaved='true';document.querySelector('main').append(marker)});
  page.once('dialog',dialog=>dialog.dismiss());await account.getByRole('button',{name:'Sign out',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.signOutCalls||0),0,'Cancelled sign-out preserves edits');
  await page.evaluate(()=>document.getElementById('unsaved-probe').dataset.adminPending='true');
  await account.getByRole('button',{name:'Sign out',exact:true}).click();await account.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.signOutCalls||0),0,'Pending command blocks sign-out');
  await page.evaluate(()=>document.getElementById('unsaved-probe').remove());
  await account.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.waitForFunction(()=>window.signOutCalls===1);
  await page.setViewportSize({width:375,height:812});
  await page.getByRole('button',{name:'Admin sections',exact:true}).click();
  const mobileAccount=page.getByRole('dialog',{name:'Admin sections'}).locator('.admin-account');
  assert.equal(await page.locator('.admin-navigation-drawer .modal-heading').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(24, 35, 50)','Mobile drawer heading remains readable on navy');
  await mobileAccount.locator('summary').click();await mobileAccount.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'mobile-account.png'),fullPage:true});
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
  await page.getByRole('dialog',{name:'Admin sections'}).waitFor({state:'detached'});
  assert.equal(await page.getByRole('button',{name:'Admin sections',exact:true}).evaluate(node=>node===document.activeElement),true);
  await page.evaluate(()=>{const retained=document.createElement('div');retained.id='retained-admin';retained.dataset.workspaceFrame='administrator';retained.hidden=true;document.body.append(retained);window.mountPublic()});
  await page.locator('.site-header').waitFor();assert.equal(await page.locator('.site-header-space').count(),1,'Public navigation restores its measured header spacer');
  assert.equal(await page.locator('.site-header').getAttribute('data-tone'),'light');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(8, 9, 10)','Inactive admin content does not retain the root canvas');
  await page.evaluate(data=>window.mount(data),data);await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();
  assert.equal(await page.locator('.site-header,.site-header-space').count(),0);
  await page.evaluate(()=>document.getElementById('retained-admin').remove());

  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    for (const view of ['overview','applications','intake','staff','members','activity','reviewer','staff-entry']) {
      await page.evaluate(view=>window.mountLoading(view),view);
      await page.locator('main .workspace-loading').waitFor();
      assert.equal(await page.locator('main [role="status"]').count(),1,'One announcement per pending route');
      assert.equal(await page.locator('main [aria-busy="true"]').count(),1);
      assert.equal(await page.locator('main button,main input,main a').count(),0,'Placeholders cannot receive focus');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.deepEqual(await page.evaluate(()=>[document.documentElement,document.body].map(node=>getComputedStyle(node).backgroundColor)),['rgb(8, 9, 10)','rgb(8, 9, 10)']);
      if(view==='reviewer') {
        const bounds=await page.locator('.workspace-skeleton-reviewer').boundingBox();
        assert.ok(bounds.x>=15 && bounds.width<=1280,'Reviewer skeleton keeps the real workspace gutters and width cap');
      }
      if(view==='staff-entry') assert.equal(await page.locator('main [aria-busy]').evaluate(node=>getComputedStyle(node).gap),'16px','Staff placeholders have breathing room');
      const block=page.locator('main .workspace-skeleton-block').first();
      assert.equal(await block.evaluate(node=>getComputedStyle(node).animationName),'workspace-skeleton-pulse');
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await block.evaluate(node=>getComputedStyle(node).animationName),'none');
      await page.screenshot({path:path.join(output,'loading-'+view+'-'+width+'.png'),fullPage:true});
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>window.completeLoading());
      await page.getByText('Content ready',{exact:true}).waitFor();
      assert.equal(await page.locator('main .workspace-loading').count(),0);
    }
  }
  await page.evaluate(()=>window.mountActivity());
  const load=page.getByRole('button',{name:'Load latest activity',exact:true});
  await load.click();await page.locator('main .workspace-loading').waitFor();
  await page.evaluate(()=>window.completeActivity([]));await page.getByText('No activity recorded yet.',{exact:true}).waitFor();
  assert.equal(await page.locator('main .workspace-loading').count(),0);
  await page.evaluate(()=>window.mountActivity());await load.click();await page.locator('main .workspace-loading').waitFor();
  await page.evaluate(()=>window.failActivity());await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('main .workspace-loading').count(),0,'Errors replace the loading skeleton');
  await load.click();await page.evaluate(()=>window.completeActivity([{id:'synthetic-event',action:'Synthetic action',object_id:'synthetic-record',created_at:'2026-11-17T00:00:00Z'}]));await page.getByText('Synthetic action',{exact:true}).waitFor();
  await load.click();assert.equal(await page.getByText('Synthetic action',{exact:true}).isVisible(),true,'Refresh retains loaded activity');
  assert.equal(await page.locator('main .workspace-loading').count(),0);
  await page.evaluate(()=>window.completeActivity([]));await page.getByText('No activity recorded yet.',{exact:true}).waitFor();


  await load.click();await page.evaluate(()=>window.completeActivity([{id:'synthetic-event',action:'Membership updated',object_id:'synthetic-member-record',created_at:'2026-11-17T00:00:00Z'}]));await page.getByText('Membership updated',{exact:true}).waitFor();
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:path.join(output,'activity-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(()=>window.mountMembers());
  await page.getByRole('heading',{name:'Organization members',exact:true}).waitFor();
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    await page.getByRole('button',{name:'Add existing member',exact:true}).click();
    await page.getByRole('heading',{name:'Add an existing Alpha member',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(output,'members-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
  }

  assert.deepEqual(errors,[]);console.log('Admin overview, all eight loading views, navy canvas, reduced motion, delayed activity reads, refresh retention, responsive navigation and keyboard checks passed.');
} finally { await browser.close(); }

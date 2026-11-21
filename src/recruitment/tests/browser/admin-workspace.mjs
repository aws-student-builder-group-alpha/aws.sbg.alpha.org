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
window.mountActivity=()=>{window.testPath='/recruitment/admin/activity';root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',children:jsx('main',{id:'main-content',className:'admin-page',children:jsx(require('./member-administration').SecurityLog,{accountId:'synthetic-account'})})},String(++revision)))};
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
  const metrics = page.locator(".admin-metrics .admin-metric-value");
  const intakePanel = page.getByRole("region",{name:"Intake",exact:true});
  const staffPanel = page.getByRole("region",{name:"Active staff",exact:true});
  assert.deepEqual(await metrics.allTextContents(),["36","8","4"],"Dashboard uses the verified totals");
  assert.equal(await intakePanel.locator(".admin-intake-state").textContent(),"Accepting");
  assert.equal(await staffPanel.locator(".admin-metric-value").textContent(),"2");
  assert.equal(await page.getByRole("link",{name:"Open applications",exact:true}).getAttribute("href"),"/recruitment/admin/applications");
  assert.equal(await intakePanel.getByRole("link",{name:"Manage intake"}).getAttribute("href"),"/recruitment/admin/intake");
  assert.equal(await staffPanel.getByRole("link",{name:"Manage staff"}).getAttribute("href"),"/recruitment/admin/staff");
  assert.equal(await page.getByRole("table",{name:"Recent applications"}).locator("tbody tr").count(),5);
  assert.deepEqual(await page.locator(".admin-status-legend dd").allTextContents(),["20","8","4","2","1","1"],"Breakdown uses verified full-queue status totals");
  assert.equal(await page.locator(".admin-status-segment").count(),6);
  const segments = await page.locator(".admin-status-segment").evaluateAll(nodes=>nodes.map(node=>({color:getComputedStyle(node).backgroundColor,height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width})));
  assert.ok(segments.every(segment=>segment.color!=='rgba(0, 0, 0, 0)' && segment.height>0 && segment.width>0),"Nonzero status counts have visible colored segments");

  assert.equal(await page.locator(".admin-status-segment").evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).backgroundColor!=="rgba(0, 0, 0, 0)" && node.getBoundingClientRect().width>0)),true,"Every nonzero status is visibly painted");


  await page.getByRole("button",{name:"Refresh overview"}).click();assert.equal(await page.evaluate(()=>window.refreshes),1);
  for(const width of [320,375,768,1024,1280,1440,1920]){
    await page.setViewportSize({width,height:950});await assertRecruitmentSurface(page,"Admin overview "+width);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('.admin-shell').evaluate(node=>getComputedStyle(node).borderRadius),width<768?'22px':'28px');
    const pagePadding=await page.locator('.admin-page').evaluate(node=>getComputedStyle(node).paddingInlineStart);
    assert.equal(pagePadding,width<768?'16px':width<1200?'24px':'32px');
    const cards=await page.locator('.admin-metrics').boundingBox();
    const status=await page.locator('.admin-status-overview').boundingBox();
    const context=await page.locator('.admin-overview-context').boundingBox();
    const recent=await page.getByRole('region',{name:'Recent applications'}).boundingBox();
    assert.equal(await page.locator('.admin-metrics').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length),width<360?1:width<768?2:3);
    if(width===375) {
      const values=await metrics.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top));
      assert.equal(values[1],values[2],'The paired phone cards align their numbers when one label wraps');
    }
    assert.ok(status.y>=cards.y+cards.height,'Application status sits below the metric cards');
    assert.ok(recent.y>=Math.max(status.y+status.height,context.y+context.height),'Recent applications follow both dashboard columns');
    if(width>=1280){
      assert.equal(cards.y,context.y);
      assert.ok(status.x+status.width<context.x && status.width>context.width*2,'Intake and staff have a narrow right-hand column');
    }else{
      assert.ok(status.y+status.height<context.y,'Intake and staff follow the breakdown on narrower screens');
    }
    const workspace = page.getByRole('region',{name:'Admin workspace'});
    const navigation = page.locator(width>=1200 ? '.admin-sidebar' : '.admin-mobile-bar');
    const before = await navigation.boundingBox();
    await workspace.evaluate(node => node.scrollTo({top:400,behavior:'instant'}));
    assert.ok(await workspace.evaluate(node=>node.scrollTop>0),'Page content scrolls inside the workspace');
    const after = await navigation.boundingBox();
    assert.ok(Math.abs(before.y-after.y)<=1,'Navigation stays in place while content scrolls');
    assert.equal(await page.evaluate(()=>document.scrollingElement.scrollHeight>innerHeight+1 || window.scrollY!==0),false,'The document fits the viewport');
    if(width===375){
      await workspace.focus();
      await page.keyboard.press('End');
      await page.waitForFunction(()=>{const node=document.querySelector('.admin-workspace');return node.scrollHeight-node.clientHeight-node.scrollTop<2;});
    }
    await workspace.evaluate(node => node.scrollTo({top:0,behavior:'instant'}));
    if(width<1200){await page.getByRole("button",{name:"Admin sections",exact:true}).click();const dialog=page.getByRole("dialog",{name:"Admin sections"});await dialog.waitFor();assert.equal(await dialog.getByRole("navigation",{name:"Admin sections"}).getByRole("link").count(),6);await page.keyboard.press("Escape");await dialog.waitFor({state:"detached"});assert.equal(await page.getByRole("button",{name:"Admin sections",exact:true}).evaluate(node=>node===document.activeElement),true);}
    if([320,375,768,1280,1440].includes(width)){await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:path.join(output,"overview-"+width+".png"),fullPage:true});}
  }
  await assertEnlargedProcess(page);
  const assertOrangeNavigation=async (navigation)=>{
    const current=navigation.getByRole('link',{name:'Overview',exact:true});
    const other=navigation.getByRole('link',{name:'Applications',exact:true});
    const colors=link=>link.evaluate(node=>{const style=getComputedStyle(node);return [style.backgroundColor,style.color];});
    assert.deepEqual(await colors(current),['rgb(255, 173, 49)','rgb(47, 34, 56)']);
    await other.hover();
    assert.deepEqual(await colors(other),['rgb(255, 216, 155)','rgb(47, 34, 56)']);
    assert.deepEqual(await colors(current),['rgb(255, 173, 49)','rgb(47, 34, 56)']);
    assert.equal(await current.getAttribute('aria-current'),'page');
  };
  const sidebarNavigation=page.locator('.admin-sidebar').getByRole('navigation');
  await assertOrangeNavigation(sidebarNavigation);
  await sidebarNavigation.getByRole('link',{name:'Overview',exact:true}).focus();
  await page.keyboard.press('Tab');
  assert.ok(await sidebarNavigation.getByRole('link',{name:'Applications',exact:true}).evaluate(node=>node.matches(':focus-visible') && getComputedStyle(node).outlineStyle==='solid'));
  await page.emulateMedia({forcedColors:"active"});
  assert.equal(await page.locator('.admin-metric').first().evaluate(node=>getComputedStyle(node).boxShadow),'none');
  assert.equal(await page.locator('.admin-sidebar a[aria-current="page"]').evaluate(node=>getComputedStyle(node).outlineWidth),'2px');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.emulateMedia({forcedColors:"none"});
  for(const route of ["/recruitment/admin","/recruitment/admin/applications","/recruitment/admin/intake","/recruitment/admin/staff","/recruitment/admin/members","/recruitment/admin/activity"]){await page.evaluate(({data,route})=>window.mount(data,route),{data,route});await page.waitForFunction(route=>document.querySelector('.admin-sidebar a[aria-current="page"]')?.getAttribute('href')===route,route);assert.equal(await page.locator('.site-header,.site-header-space').count(),0);}
  await page.evaluate(()=>window.mount({applications:null,staff:null,intake:null}));
  await page.getByText('Status breakdown is unavailable.',{exact:false}).waitFor();
  assert.deepEqual(await metrics.allTextContents(),Array(3).fill('Unavailable'));
  assert.equal(await staffPanel.locator(".admin-metric-value").textContent(),"Unavailable");
  assert.equal(await intakePanel.getByText('Intake unavailable.',{exact:false}).isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Refresh overview'}).isEnabled(),true);
  await page.evaluate(data=>window.mount({...data,applications:{...data.applications,items:[],queue:{total:0,statusCounts:Object.fromEntries(Object.keys(data.applications.queue.statusCounts).map(status=>[status,0]))}},staff:[]}),data);
  await page.getByText('No submitted applications yet.',{exact:true}).waitFor();
  assert.deepEqual(await metrics.allTextContents(),['0','0','0']);
  assert.equal(await staffPanel.locator(".admin-metric-value").textContent(),"0");
  await page.evaluate(data=>window.mount({...data,intake:{...data.intake,accepting:false,serverNow:'2026-12-01T00:00:00Z'}}),data);
  await intakePanel.getByText('Deadline passed',{exact:true}).waitFor();
  await page.setViewportSize({width:1440,height:950});
  const sidebar = page.locator('.admin-sidebar');
  const account = sidebar.locator('.admin-account');
  const accountTrigger = account.locator('.admin-account-trigger');
  const accountPopup = account.locator('.admin-account-popover');
  const workspace = page.getByRole('region',{name:'Admin workspace'});
  await workspace.evaluate(node=>node.scrollTop=96);
  const scrollBefore = await workspace.evaluate(node=>node.scrollTop);
  const sidebarBefore = await sidebar.boundingBox();
  const accountBefore = await accountTrigger.boundingBox();
  const navigationBefore = await sidebar.getByRole('navigation').boundingBox();
  assert.equal(await sidebar.evaluate(node=>getComputedStyle(node).overflowY),'clip');
  assert.equal(await sidebar.evaluate(node=>node.scrollHeight>node.clientHeight+1),false);
  await accountTrigger.focus();
  await page.keyboard.press('Enter');
  await accountPopup.waitFor();
  const desktopPopup = await accountPopup.boundingBox();
  assert.ok(desktopPopup.x>=accountBefore.x+accountBefore.width);
  assert.ok(Math.abs(desktopPopup.y+desktopPopup.height-accountBefore.y-accountBefore.height)<=1);
  await page.keyboard.press('Tab');
  assert.equal(await account.getByRole('link',{name:'Membership ID',exact:true}).evaluate(node=>node===document.activeElement),true);
  await page.keyboard.press('Escape');
  await accountPopup.waitFor({state:'hidden'});
  assert.equal(await accountTrigger.evaluate(node=>node===document.activeElement),true);
  await accountTrigger.click();
  await sidebar.getByRole('navigation').hover();
  await page.mouse.click(12,40);
  await accountPopup.waitFor({state:'hidden'});
  await accountTrigger.click();
  assert.equal(await account.getByRole('link',{name:'Membership ID',exact:true}).getAttribute('href'),'/recruitment/membership');
  assert.equal(await account.getByRole('link',{name:'Back to website',exact:true}).getAttribute('href'),'/');
  await page.evaluate(()=>{const marker=document.createElement('div');marker.id='unsaved-probe';marker.dataset.adminUnsaved='true';document.querySelector('main').append(marker)});
  page.once('dialog',dialog=>dialog.dismiss());await account.getByRole('button',{name:'Sign out',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.signOutCalls||0),0,'Cancelled sign-out preserves edits');
  await page.evaluate(()=>document.getElementById('unsaved-probe').dataset.adminPending='true');
  await account.getByRole('button',{name:'Sign out',exact:true}).click();await account.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.signOutCalls||0),0,'Pending command blocks sign-out');
  assert.deepEqual(await sidebar.boundingBox(),sidebarBefore);
  assert.deepEqual(await accountTrigger.boundingBox(),accountBefore);
  assert.deepEqual(await sidebar.getByRole('navigation').boundingBox(),navigationBefore);
  assert.equal(await workspace.evaluate(node=>node.scrollTop),scrollBefore);
  await page.screenshot({path:path.join(output,'desktop-account.png')});
  await page.evaluate(()=>document.getElementById('unsaved-probe').remove());
  await account.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.waitForFunction(()=>window.signOutCalls===1);
  await page.setViewportSize({width:375,height:812});
  const mobileMenu = page.getByRole('button',{name:'Admin sections',exact:true});
  await mobileMenu.hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-mobile-bar button')).backgroundColor === 'rgb(70, 51, 79)');
  await mobileMenu.click();
  const drawer = page.getByRole('dialog',{name:'Admin sections'});
  await assertOrangeNavigation(drawer.getByRole('navigation',{name:'Admin sections'}));
  const mobileAccount=drawer.locator('.admin-account');
  const mobileTrigger=mobileAccount.locator('.admin-account-trigger');
  const mobilePopup=mobileAccount.locator('.admin-account-popover');
  assert.equal(await page.locator('.admin-navigation-drawer .modal-heading').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(47, 34, 56)','Mobile drawer shares the plum navigation');
  await mobileTrigger.click();
  await mobilePopup.waitFor();
  const drawerTrigger = await mobileTrigger.boundingBox();
  const drawerPopup = await mobilePopup.boundingBox();
  assert.ok(drawerPopup.y+drawerPopup.height<=drawerTrigger.y,'The menu opens above its trigger when there is room');
  assert.ok(drawerPopup.x>=0 && drawerPopup.x+drawerPopup.width<=375);
  await page.screenshot({path:path.join(output,'mobile-account.png'),fullPage:true});
  await page.keyboard.press('Escape');
  await mobilePopup.waitFor({state:'hidden'});
  assert.equal(await drawer.isVisible(),true);
  await page.keyboard.press('Escape');
  await drawer.waitFor({state:'detached'});
  assert.equal(await page.getByRole('button',{name:'Admin sections',exact:true}).evaluate(node=>node===document.activeElement),true);
  for (const [width,height,largeText] of [[1440,520,false],[320,540,true]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(large=>{document.documentElement.style.fontSize=large?'200%':'';},largeText);
    assert.equal(await sidebar.isVisible(),false,'Short or narrow viewports use the drawer');
    await mobileMenu.click();
    assert.equal(await drawer.getByRole('navigation',{name:'Admin sections'}).getByRole('link').count(),6);
    await mobileTrigger.click();
    await mobilePopup.waitFor();
    const bounds = await mobilePopup.boundingBox();
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=width && bounds.y+bounds.height<=height);
    assert.ok(await mobilePopup.getByRole('button',{name:'Sign out',exact:true}).isVisible());
    await page.keyboard.press('Escape');await mobilePopup.waitFor({state:'hidden'});
    await page.keyboard.press('Escape');await drawer.waitFor({state:'detached'});
  }
  await page.evaluate(()=>{document.documentElement.style.fontSize='';});
  await page.setViewportSize({width:375,height:812});
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
      if(view==='overview' && width===1440) {
        const panels=await page.locator('.admin-overview-grid > div').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));
        assert.ok(panels[0]>panels[1]*2,'Overview skeleton retains the dashboard column proportions');
        assert.equal(await page.locator('.admin-metric').count(),3);
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
  await page.getByRole('heading',{name:'Recent security events',exact:true}).waitFor();
  assert.equal(await page.getByRole('searchbox',{name:'Filter loaded activity'}).count(),0);
  await load.click();await page.locator('main .workspace-loading').waitFor();
  await page.evaluate(()=>window.completeActivity([]));await page.getByText('No activity recorded yet.',{exact:true}).waitFor();
  assert.equal(await page.locator('main .workspace-loading').count(),0);
  await page.screenshot({path:path.join(output,'activity-empty-1440.png')});
  await page.evaluate(()=>window.mountActivity());await load.click();await page.locator('main .workspace-loading').waitFor();
  await page.evaluate(()=>window.failActivity());await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('main .workspace-loading').count(),0,'Errors replace the loading skeleton');
  await load.click();await page.evaluate(()=>window.completeActivity([{id:'synthetic-event',action:'Synthetic action',object_id:'synthetic-record',created_at:'2026-11-17T00:00:00Z'}]));await page.getByText('Synthetic action',{exact:true}).waitFor();
  const activityFilter=page.getByRole('searchbox',{name:'Filter loaded activity'});
  await activityFilter.fill('SYNTHETIC action');await page.getByText('1 of 1 loaded events',{exact:true}).waitFor();
  await activityFilter.fill('hetic-record');await page.getByText('Synthetic action',{exact:true}).waitFor();
  await activityFilter.fill('missing');await page.getByText('No matching events out of 1 loaded.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Synthetic action',{exact:true}).isVisible(),false);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  assert.equal(await activityFilter.inputValue(),'');
  await load.click();assert.equal(await page.getByText('Synthetic action',{exact:true}).isVisible(),true,'Refresh retains loaded activity');
  assert.equal(await page.locator('main .workspace-loading').count(),0);
  await page.evaluate(()=>window.completeActivity([]));await page.getByText('No activity recorded yet.',{exact:true}).waitFor();


  await load.click();
  await page.evaluate(()=>window.completeActivity([
    {id:'synthetic-membership',action:'membership.profile_updated',object_id:'ALPHA-2026-SYNTHETIC',created_at:'2026-11-17T00:00:00Z'},
    {id:'synthetic-document',action:'enrollment.accessed',object_id:'synthetic-document-'+ 'a'.repeat(44),created_at:'2026-11-16T23:00:00Z'},
    {id:'synthetic-mail',action:'message.uncertain',object_id:'synthetic-message-record',created_at:'2026-11-16T22:00:00Z'},
    {id:'synthetic-application',action:'application.under_review',object_id:'synthetic-application-record',created_at:'2026-11-16T21:00:00Z'},
  ]));
  const activityTable=page.getByRole('table',{name:'Activity log'});
  await activityTable.waitFor();
  assert.deepEqual(await activityTable.getByRole('columnheader').allTextContents(),['Event','Reference','Philippine time']);
  await activityTable.getByText('Nov 17, 2026, 8:00 AM',{exact:true}).waitFor();
  await activityFilter.fill('APPLICATION.UNDER_REVIEW');
  await activityTable.getByText('Application under review',{exact:true}).waitFor();
  assert.equal(await activityTable.locator('tbody tr').count(),1);
  await activityFilter.fill('');
  assert.deepEqual(await activityTable.locator('.audit-event-icon').evaluateAll(icons=>icons.map(icon=>icon.dataset.icon)),['wallet','clip','mail','file']);
  for(const width of [320,375,768,1280,1440]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('.admin-workspace').evaluate(node=>node.scrollWidth>node.clientWidth+1),false);
    if(width===375 || width===1440)assert.equal(await activityTable.locator('tbody tr').first().evaluate(row=>getComputedStyle(row).display),width===375?'grid':'table-row');
    await page.screenshot({path:path.join(output,'activity-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(()=>window.mountMembers());
  await page.getByRole('heading',{name:'Organization members',exact:true}).waitFor();
  for(const width of [320,375,768,1280,1440]){
    await page.setViewportSize({width,height:1000});
    await page.getByRole('button',{name:'Add existing member',exact:true}).click();
    await page.getByRole('heading',{name:'Add an existing Alpha member',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(output,'members-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
  }

  assert.deepEqual(errors,[]);console.log('Admin overview, all eight loading views, navy canvas, reduced motion, delayed activity reads, refresh retention, responsive navigation and keyboard checks passed.');
} finally { await browser.close(); }

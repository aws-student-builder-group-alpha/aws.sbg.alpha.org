import {recruitmentStyleShell} from "../fixtures/recruitment-build.mjs";
// Runs the real MfaForm with synthetic action/router/image dependencies.
// Pass a Playwright module entry path when it is supplied by the local tooling.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertInlineFailure, assertEnlargedProcess } from "../fixtures/browser-motion.mjs";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { authenticatorQrDataUrl } from "../../lib/authenticator.ts";
import { denseAuthenticatorSvg } from "../fixtures/authenticator.mjs";

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL("../../", import.meta.url));
const { transform, loadBindings } = require("next/dist/build/swc");
await loadBindings();
const formPath = path.join(project, "../app/(recruitment)/recruitment/staff/mfa-form.tsx");
const { code } = await transform(await readFile(formPath, "utf8"), {
  filename: formPath,
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
});
const modules = new Map([["form", code]]);
for(const [name,relative] of [['@/app/(recruitment)/recruitment/components/ui','../app/(recruitment)/recruitment/components/ui.tsx'],['@/recruitment/lib/format-date','lib/format-date.ts'],['staff-access','../app/(recruitment)/recruitment/staff/staff-access.tsx'],['@/app/(recruitment)/recruitment/components/process-shell','../app/(recruitment)/recruitment/components/process-shell.tsx'],['access-guard','../app/(recruitment)/recruitment/components/access-guard.tsx'],['@/recruitment/lib/drafts','lib/drafts.ts'],['./catalog.ts','lib/catalog.ts']]){
 const filename=path.join(project,relative);const {code:source}=await transform(await readFile(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});modules.set(name,source);
}
modules.set('next/link',"exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");
modules.set('./ui', modules.get('@/app/(recruitment)/recruitment/components/ui'));
modules.set('@/app/(recruitment)/recruitment/auth/actions','exports.signOut=async()=>{};exports.signIn=async data=>{window.testState.signInDestination=data.get("destination");if(window.testState.holdSignIn)await new Promise(resolve=>{window.testState.releaseSignIn=resolve})};');
await installBrowserMotion(modules);
await installRecruitmentUI(modules);
for (const [name, packageName, file] of [
  ["react", "react", "react.development.js"],
  ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"],
  ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
]) {
  modules.set(name, await readFile(path.join(path.dirname(require.resolve(packageName + "/package.json")), "cjs", file), "utf8"));
}
modules.set("next/navigation", "exports.useRouter = () => window.testRouter;exports.usePathname=()=>'/recruitment/staff';exports.useSelectedLayoutSegments=()=>['staff'];");
modules.set("next/image", `exports.__esModule = true; exports.default = props => {
  const { unoptimized, priority, ...imageProps } = props;
  return require('react/jsx-runtime').jsx('img', imageProps);
};`);

modules.set("./actions", `
  exports.beginAuthenticator = async () => {
    window.testState.beginCalls++;
    if(window.testState.beginError) return {ok:false,message:'Synthetic setup unavailable'};
    return { ok: true, data: window.testState.enrollment };
  };
  exports.cancelAuthenticator = async (_, factorId) => {
    window.testState.cancelledFactor = factorId;
    if(window.testState.cancelError) return {ok:false,message:'Synthetic cancellation unavailable'};
    return { ok: true, data: null };
  };
  exports.verifyAuthenticator = async (_, factorId, code) => {
    window.testState.verifications.push({ factorId, code });
    if(window.testState.holdVerification) await new Promise(resolve=>{window.testState.releaseVerification=resolve});
    if(window.testState.verifyError) return {ok:false,code:'UNAVAILABLE',message:'Synthetic verification unavailable'};
    return window.testState.rejectCode
      ? { ok: false, code: 'VALIDATION', message: 'Synthetic code rejected' }
      : { ok: true, data: null };
  };
`);
const bundle = `(() => {
  const process = { env: { NODE_ENV: 'development' } };
  const modules = { ${[...modules].map(([name, source]) => JSON.stringify(name) + ": function(module, exports, require) {\n" + source + "\n}").join(",")} };
  const cache = {};
  function require(name) {
    if (!cache[name]) {
      if (!modules[name]) throw new Error('Unmocked browser dependency: ' + name);
      const module = cache[name] = { exports: {} };
      modules[name](module, module.exports, require);
    }
    return cache[name].exports;
  }
  const root = require('react-dom/client').createRoot(document.getElementById('root'));
  let revision = 0;
  window.mountForm = (enrollment, factors = []) => {
    window.testState = { enrollment, beginCalls: 0, verifications: [], rejectCode: false };
    window.testRouter = {
      replace: value => { window.testState.destination = value; },
      refresh: () => {},
    };
    const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/(recruitment)/recruitment/components/ui');
    root.render(jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn:true,staff:{role:'administrator',status:'active',needsMfa:true}}),jsx(require('./recruitment-shell').RecruitmentShell,{frame:'staff',children:jsx(require('staff-access').StaffAuthPage,{wide:true,title:'Administrator verification',titleHidden:true,children:jsxs(require('react').Fragment,{children:[jsx('p',{className:'workspace-account',children:'Signed in as synthetic.staff@example.test'}),jsx(require('form').MfaForm,{accountId:'00000000-0000-4000-8000-000000000001',factors})]})})}),jsx(ui.Footer,{})]},String(++revision)));
  };
  window.mountAccess = props => {
    window.testState={};
    const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/(recruitment)/recruitment/components/ui');
    root.render(jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn:props.kind!=='anonymous'}),jsx(require('./recruitment-shell').RecruitmentShell,{frame:'staff',children:jsx(require('staff-access').StaffAccessView,props)}),jsx(ui.Footer,{})]},String(++revision)));
  };
  window.mountGuard = enrollment => {
    const accountId='00000000-0000-4000-8000-000000000001';
    window.testState={enrollment,beginCalls:0,verifications:[],access:{kind:'staff',accountId,role:'administrator',status:'active',needsMfa:true}};
    const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/(recruitment)/recruitment/components/ui');
    const card=jsx(require('staff-access').StaffAuthPage,{wide:true,title:'Administrator verification',titleHidden:true,children:jsx(require('form').MfaForm,{accountId,factors:[]})});
    root.render(jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn:true,staff:{role:'administrator',status:'active',needsMfa:true}}),jsx(require('./recruitment-shell').RecruitmentShell,{frame:'staff',children:jsx(require('access-guard').AccessGuard,{accountId,expected:'administrator-mfa',children:card})}),jsx(ui.Footer,{})]},String(++revision)));
  };
})();`;

const playwrightEntry = process.argv[2];
const { chromium } = await import(playwrightEntry ? pathToFileURL(path.resolve(playwrightEntry)).href : "playwright");
const shell=await recruitmentStyleShell();
const styles=[...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m=>m[1]);assert.ok(styles.length,'Build before running the browser harness');
const output=path.join(project,'.next/verification/authenticator');await mkdir(output,{recursive:true});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const origin='https://authenticator.example.test';
  await page.route(origin+'/**',async route=>{const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/recruitment/api/access')return route.fulfill({contentType:'application/json',body:JSON.stringify(await page.evaluate(()=>window.testState.access))});
   if(styles.includes(pathname))return route.fulfill({contentType:'text/css',body:await readFile(path.join(project,'../../.next',pathname.slice('/_next/'.length)))});
   if(pathname.startsWith('/recruitment/brand/')||pathname.startsWith('/fonts/'))return route.fulfill({body:await readFile(path.join(project,'../../public',pathname))});
   return route.fulfill({contentType:'text/html',body:'<html lang="en"><head>'+styles.map(style=>'<link rel="stylesheet" href="'+style+'">').join('')+'</head><body class="alpha-app"><div id="root"></div></body></html>'});
  });
  await page.goto(origin);
  await page.addScriptTag({ content: bundle });
  const factorId = "00000000-0000-4000-8000-000000000002";
  const enrollment = { factorId, secret: "SYNTHETICSETUPKEY", qrCode: null };
  for (const props of [{kind:'anonymous'},{kind:'anonymous',authError:true},{kind:'applicant',email:'synthetic.applicant@example.test'},{kind:'staff',status:'suspended',email:'synthetic.staff@example.test'},{kind:'staff',status:'revoked',email:'synthetic.staff@example.test'},{kind:'unavailable'},{kind:'unconfigured'},{kind:'loading'}]) {
    await page.evaluate(props=>window.mountAccess(props),props);
    await page.locator('.staff-auth-card').waitFor();
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:812});
      await assertRecruitmentSurface(page,'Staff '+props.kind+' '+width);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    }
    assert.equal(await page.locator('main h1').count(),1);
    if(props.kind==='anonymous') {
      assert.equal(await page.locator('input[name="destination"]').inputValue(),'staff');
      if(!props.authError) {
        await page.setViewportSize({width:375,height:812});
        await page.screenshot({path:path.join(output,'sign-in-375.png'),fullPage:true});
        await page.setViewportSize({width:1440,height:950});
        await page.screenshot({path:path.join(output,'sign-in-1440.png'),fullPage:true});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Desktop sign-in fits the viewport');
        await page.getByRole('button',{name:'Continue with Google'}).focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('summary').evaluate(node=>node===document.activeElement),true);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('details.workspace-help').evaluate(node=>node.open),true);
        await assertEnlargedProcess(page);
        await page.evaluate(()=>{window.testState.holdSignIn=true});
        await page.getByRole('button',{name:'Continue with Google'}).click();
        await page.waitForFunction(()=>!!window.testState.releaseSignIn);
        assert.equal(await page.getByRole('button',{name:'Connecting…'}).isDisabled(),true);
        assert.equal(await page.evaluate(()=>window.testState.signInDestination),'staff');
        await page.evaluate(()=>window.testState.releaseSignIn());
        await page.getByRole('button',{name:'Continue with Google'}).waitFor();
      }
    }
  }
  const svg = denseAuthenticatorSvg();
  const qrCode = authenticatorQrDataUrl("data:image/svg+xml;utf-8," + svg);
  assert.ok(qrCode);
  await page.evaluate(data => window.mountForm(data), { ...enrollment, qrCode });
  await page.getByRole("button", { name: "Set up authenticator", exact: true }).click();
  await page.getByRole("img",{name:"Scan this code with your authenticator app",exact:true}).waitFor();
  assert.equal(await page.getByRole("img",{name:"Scan this code with your authenticator app",exact:true}).evaluate(async image => { await image.decode(); return image.naturalWidth; }), 195);

  for(const colorScheme of ['light','dark'])for(const width of [320,375,414,768,1024,1440]){
   await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
   await assertRecruitmentSurface(page,"MFA "+width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const headerRow = page.getByRole('banner').locator('.header-inner');
   assert.equal(await headerRow.evaluate(el => el.getBoundingClientRect().height), width <= 560 ? 56 : 60);
   if(colorScheme==='light'&&[375,1440].includes(width))await page.screenshot({path:path.join(output,'setup-'+width+'.png'),fullPage:true});
  }
  await assertInlineFailure(page,'Enable and continue','mfa-code');
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('mfa-code')).borderTopColor==='rgb(180, 35, 24)');
  await assertEnlargedProcess(page,'mfa-code');
  assert.equal(await page.evaluate(()=>window.testState.verifications.length),0);
  // Both a missing normalized image and a browser image error retain manual setup.
  for (const fallbackQr of [null, "data:image/svg+xml,broken"]) {
    await page.evaluate(data => window.mountForm(data), { ...enrollment, qrCode: fallbackQr });
    await page.getByRole("button", { name: "Set up authenticator", exact: true }).click();
    await page.getByRole("status").waitFor();
    assert.equal(await page.locator(".mfa-enrollment details").evaluate(details => details.open), true);
    assert.equal(await page.locator(".mfa-secret").textContent(), enrollment.secret);
    assert.equal(await page.getByRole("img",{name:"Scan this code with your authenticator app",exact:true}).count(), 0);
    await page.evaluate(() => { window.testState.rejectCode = true; });
    await page.getByLabel("Authenticator code").fill("123456");
    await page.getByRole("button", { name: "Enable and continue" }).click();
    await page.locator("#mfa-code-error").waitFor();
    await page.waitForFunction(()=>document.activeElement?.id === "mfa-code");
    assert.equal(await page.getByLabel("Authenticator code").inputValue(), "");
    assert.equal(await page.locator(".mfa-secret").textContent(), enrollment.secret);
    await page.evaluate(() => { window.testState.rejectCode = false; });
    await page.getByLabel("Authenticator code").fill("654321");
    await page.getByRole("button", { name: "Enable and continue" }).click();
    await page.waitForFunction(() => window.testState.destination === "/recruitment/admin");
    assert.deepEqual(await page.evaluate(() => window.testState.verifications.map(item => item.factorId)), [factorId, factorId]);
    assert.equal(await page.locator(".mfa-secret").count(), 0);
  }
  await page.evaluate(data => window.mountForm(data), enrollment);
  await page.getByRole("button", { name: "Set up authenticator", exact: true }).click();
  await page.getByRole("button", { name: "Cancel setup" }).click();
  await page.getByRole("button", { name: "Set up authenticator", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.testState.cancelledFactor), factorId);
  assert.equal(await page.locator(".mfa-secret").count(), 0);
  await page.evaluate(id => window.mountForm(null, [{ id, name: "Existing authenticator" }]), factorId);
  await page.getByRole("button", { name: "Verify and continue" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Set up authenticator", exact: true }).count(), 0);
  assert.equal(await page.locator('.mfa-panel h2').evaluate(node=>getComputedStyle(node).textAlign),'left');
  assert.equal(await page.getByLabel('Authenticator code').evaluate(node=>getComputedStyle(node).borderRadius),'12px');
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:950});
    await page.screenshot({path:path.join(output,'verify-'+width+'.png'),fullPage:true});
  }
  // Multiple authenticators, paste/autofill semantics and pending/error recovery.
  await page.evaluate(id=>window.mountForm(null,[{id,name:'Primary authenticator'},{id:'second-factor',name:'Backup authenticator'}]),factorId);
  await page.getByLabel('Authenticator',{exact:true}).selectOption('second-factor');
  const input=page.getByLabel('Authenticator code');
  assert.equal(await input.getAttribute('autocomplete'),'one-time-code');
  assert.equal(await input.getAttribute('inputmode'),'numeric');
  await input.focus();
  await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin});
  await page.evaluate(()=>navigator.clipboard.writeText('123456'));
  await input.press('Control+V');
  assert.equal(await input.inputValue(),'123456');
  await page.evaluate(()=>{window.testState.holdVerification=true;window.testState.verifyError=true});
  await page.getByRole('button',{name:'Verify and continue'}).click();
  await page.waitForFunction(()=>!!window.testState.releaseVerification);
  assert.equal(await input.isDisabled(),true);
  assert.equal(await page.getByLabel('Authenticator',{exact:true}).isDisabled(),true);
  assert.equal(await page.locator('.mfa-panel').getAttribute('aria-busy'),'true');
  await page.evaluate(()=>window.testState.releaseVerification());
  await page.getByRole('alert').waitFor();
  assert.equal(await input.inputValue(),'');
  assert.equal(await input.isEnabled(),true);
  assert.equal(await page.getByLabel('Authenticator',{exact:true}).inputValue(),'second-factor');
  await assertRecruitmentSurface(page,'Verification outage');
  await page.evaluate(()=>{window.testState.holdVerification=false;window.testState.verifyError=false});
  await input.fill('654321');
  await page.getByRole('button',{name:'Verify and continue'}).click();
  await page.waitForFunction(()=>window.testState.destination==='/recruitment/admin');
  assert.deepEqual(await page.evaluate(()=>window.testState.verifications),[{factorId:'second-factor',code:'123456'},{factorId:'second-factor',code:'654321'}]);
  await page.evaluate(data=>window.mountForm(data),enrollment);
  await page.evaluate(()=>{window.testState.beginError=true});
  await page.getByRole('button',{name:'Set up authenticator',exact:true}).click();
  await page.getByRole('alert').waitFor();
  await assertRecruitmentSurface(page,'Setup outage');
  await page.evaluate(()=>{window.testState.beginError=false});
  await page.getByRole('button',{name:'Set up authenticator',exact:true}).click();
  await page.getByRole('button',{name:'Cancel setup'}).waitFor();
  await page.evaluate(()=>{window.testState.cancelError=true});
  await page.getByRole('button',{name:'Cancel setup'}).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.mfa-secret').textContent(),enrollment.secret);
  await page.evaluate(()=>{window.testState.cancelError=false});
  await page.getByRole('button',{name:'Cancel setup'}).click();
  await page.getByRole('button',{name:'Set up authenticator',exact:true}).waitFor();
  await page.evaluate(data=>window.mountGuard(data),enrollment);
  await page.getByRole('button',{name:'Set up authenticator',exact:true}).click();
  await page.locator('.mfa-secret').waitFor();
  await page.evaluate(()=>{window.testState.allowedAccess=window.testState.access;window.testState.access={kind:'unavailable'};window.dispatchEvent(new Event('focus'))});
  await page.getByRole('button',{name:'Retry access check'}).waitFor();
  assert.equal(await page.locator('.mfa-secret').isVisible(),false);
  for(const width of [320,375,1440]){
    await page.setViewportSize({width,height:812});
    await assertRecruitmentSurface(page,'Staff access outage '+width);
    assert.equal(await page.locator('.recruitment-process>.portal.narrow').evaluate(node=>getComputedStyle(node).borderRadius),'28px');
    assert.equal(await page.locator('.recruitment-process>.portal.narrow').evaluate(node=>getComputedStyle(node).paddingTop),width<600?'24px':'40px');
  }
  await page.emulateMedia({forcedColors:'active'});
  assert.equal(await page.locator('.recruitment-process>.portal.narrow').evaluate(node=>getComputedStyle(node).boxShadow),'none');
  await page.emulateMedia({forcedColors:'none'});
  await page.evaluate(()=>{window.testState.access=window.testState.allowedAccess});
  await page.getByRole('button',{name:'Retry access check'}).click();
  await page.locator('.mfa-secret').waitFor({state:'visible'});
  assert.equal(await page.locator('.mfa-secret').textContent(),enrollment.secret);
  await page.evaluate(()=>{window.testState.access={kind:'anonymous'};window.dispatchEvent(new Event('focus'))});
  await page.getByRole('heading',{name:'Your access has changed'}).waitFor();
  assert.equal(await page.locator('.mfa-secret').count(),0);
  assert.equal(await page.getByRole('link',{name:'Check staff access'}).getAttribute('href'),'/recruitment/staff');
  await assertRecruitmentSurface(page,'Staff access loss');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ staffAccessStates:8, responsiveAndEnlargedText:'passed', keyboardAndPaste:'passed', pendingAndRetry:'passed', accessLossAndRecovery:'passed', denseSvgCharacters: svg.length, denseImage: "passed", manualFallback: "passed", imageErrorFallback: "passed", verificationAndCancel: "passed", existingFactor: "passed", pageErrors: 0 }));
} finally {
  await browser.close();
}

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
const formPath = path.join(project, "app/staff/mfa-form.tsx");
const { code } = await transform(await readFile(formPath, "utf8"), {
  filename: formPath,
  jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
});
const modules = new Map([["form", code]]);
for(const [name,relative] of [['@/app/components/ui','app/components/ui.tsx'],['@/lib/format-date','lib/format-date.ts']]){
 const filename=path.join(project,relative);const {code:source}=await transform(await readFile(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}});modules.set(name,source);
}
modules.set('next/link',"exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");
modules.set('@/app/auth/actions','exports.signOut=async()=>{};');
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
modules.set("next/navigation", "exports.useRouter = () => window.testRouter;exports.usePathname=()=>'/staff';exports.useSelectedLayoutSegments=()=>['staff'];");
modules.set("next/image", `exports.__esModule = true; exports.default = props => {
  const { unoptimized, priority, ...imageProps } = props;
  return require('react/jsx-runtime').jsx('img', imageProps);
};`);

modules.set("./actions", `
  exports.beginAuthenticator = async () => {
    window.testState.beginCalls++;
    return { ok: true, data: window.testState.enrollment };
  };
  exports.cancelAuthenticator = async (_, factorId) => {
    window.testState.cancelledFactor = factorId;
    return { ok: true, data: null };
  };
  exports.verifyAuthenticator = async (_, factorId, code) => {
    window.testState.verifications.push({ factorId, code });
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
    const {jsx,jsxs}=require('react/jsx-runtime'),ui=require('@/app/components/ui');
    root.render(jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn:true,staff:{role:'administrator',status:'active',needsMfa:true}}),jsx(require('./recruitment-shell').RecruitmentShell,{frame:'staff',children:jsxs('main',{id:'main-content',className:'container portal workspace-redesign workspace-auth',children:[jsx('h1',{className:'sr-only',children:'Administrator verification'}),jsx('div',{className:'workspace-auth-content',children:jsx(require('form').MfaForm,{accountId:'00000000-0000-4000-8000-000000000001',factors})})]})}),jsx(ui.Footer,{})]},String(++revision)));
  };
})();`;

const playwrightEntry = process.argv[2];
const { chromium } = await import(playwrightEntry ? pathToFileURL(path.resolve(playwrightEntry)).href : "playwright");
const shell=await readFile(path.join(project,'.next/server/app/admin.html'),'utf8');
const styles=[...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(m=>m[1]);assert.ok(styles.length,'Build before running the browser harness');
const output=path.join(project,'.next/verification/authenticator');await mkdir(output,{recursive:true});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const origin='https://authenticator.example.test';
  await page.route(origin+'/**',async route=>{const pathname=new URL(route.request().url()).pathname;
   if(styles.includes(pathname))return route.fulfill({contentType:'text/css',body:await readFile(path.join(project,'.next',pathname.slice('/_next/'.length)))});
   if(pathname.startsWith('/brand/')||pathname.startsWith('/fonts/'))return route.fulfill({body:await readFile(path.join(project,'public',pathname))});
   return route.fulfill({contentType:'text/html',body:'<html lang="en"><head>'+styles.map(style=>'<link rel="stylesheet" href="'+style+'">').join('')+'</head><body class="alpha-app"><div id="root"></div></body></html>'});
  });
  await page.goto(origin);
  await page.addScriptTag({ content: bundle });
  const factorId = "00000000-0000-4000-8000-000000000002";
  const enrollment = { factorId, secret: "SYNTHETICSETUPKEY", qrCode: null };
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
   assert.equal(await page.getByRole('banner').evaluate(el=>el.getBoundingClientRect().height),width<640?73:81);
   if(colorScheme==='light'&&[375,1440].includes(width))await page.screenshot({path:path.join(output,'setup-'+width+'.png'),fullPage:true});
  }
  await assertInlineFailure(page,'Enable and continue','mfa-code');
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
    await page.waitForFunction(() => window.testState.destination === "/admin");
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
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ denseSvgCharacters: svg.length, denseImage: "passed", manualFallback: "passed", imageErrorFallback: "passed", verificationAndCancel: "passed", existingFactor: "passed", pageErrors: 0 }));
} finally {
  await browser.close();
}

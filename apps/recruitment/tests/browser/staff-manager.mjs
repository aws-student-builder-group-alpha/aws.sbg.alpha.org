// Real manager, UI, transport, access guard, HTTP handlers, and SQL; synthetic identity/motion dependencies.
// Synthetic identities only; screenshots exercise the actual shared frame.
import assert from "node:assert/strict";
import { installBrowserMotion, installRecruitmentUI, assertRecruitmentSurface, assertInlineFailure, assertEnlargedProcess, assertProcessAppearance, openDisclosure } from "../fixtures/browser-motion.mjs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { createStaffRoute } from "../fixtures/staff-http-runtime.mjs";

const require = createRequire(import.meta.url);
const project = fileURLToPath(new URL("../../", import.meta.url));
const { loadBindings, transform } = require("next/dist/build/swc");
await loadBindings();
const modules = new Map();
for (const [name, relative] of [
  ["manager", "app/admin/staff-manager.tsx"], ["@/app/components/access-guard", "app/components/access-guard.tsx"],
  ["@/app/components/admin-navigation", "app/components/admin-navigation.tsx"],
  ["@/lib/staff-client", "lib/staff-client.ts"], ["./staff.ts", "lib/staff.ts"],
  ["./drafts.ts", "lib/drafts.ts"], ["./catalog.ts", "lib/catalog.ts"], ["./http-request.ts", "lib/http-request.ts"],
  ["@/app/components/ui", "app/components/ui.tsx"], ["@/lib/format-date", "lib/format-date.ts"],
]) {
  const filename = path.join(project, relative);
  const { code } = await transform(await readFile(filename, "utf8"), { filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
  modules.set(name, code);
}
for (const [alias, original] of [["@/lib/staff", "./staff.ts"], ["@/lib/drafts", "./drafts.ts"], ["@/lib/http-request", "./http-request.ts"]]) modules.set(alias, modules.get(original));
for (const [name, pkg, file] of [
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"], ["scheduler", "scheduler", "scheduler.development.js"],
]) modules.set(name, await readFile(path.join(path.dirname(require.resolve(pkg + "/package.json")), "cjs", file), "utf8"));
modules.set("next/link", "exports.__esModule=true;exports.default=props=>require('react/jsx-runtime').jsx('a',props);");
modules.set("next/image", "exports.__esModule=true;exports.default=({priority,unoptimized,...props})=>require('react/jsx-runtime').jsx('img',props);");
modules.set("next/navigation", "exports.usePathname=()=>'/admin';exports.useSelectedLayoutSegments=()=>['admin'];");
modules.set("@/app/auth/actions", "exports.signOut=async()=>{};");
await installBrowserMotion(modules);
await installRecruitmentUI(modules);
modules.set("./ui", modules.get("@/app/components/ui"));
const bundle = `(()=>{const process={env:{NODE_ENV:'development'}};const modules={${[...modules].map(([name, code]) => JSON.stringify(name) + ":function(module,exports,require){" + code + "\n}").join(",")}};
const cache={};function require(name){if(!cache[name]){if(!modules[name])throw Error('Unmocked browser module: '+name);const module=cache[name]={exports:{}};modules[name](module,module.exports,require);}return cache[name].exports;}
const {jsx}=require('react/jsx-runtime');const root=require('react-dom/client').createRoot(document.getElementById('root'));let revision=0;
window.mount=(accountId,members,expected='administrator',guardOnly=false)=>root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',staff:{role:'administrator',status:'active',needsMfa:false},children:jsx(require('@/app/components/access-guard').AccessGuard,{accountId,expected,children:guardOnly?jsx('input',{'aria-label':'Unsaved applicant answer',defaultValue:'Preserved synthetic answer'}):jsx(require('manager').StaffManager,{accountId,initialStaff:members})})},String(++revision)));
window.mountMembers=accountId=>root.render(jsx(require('recruitment-test-frame').Frame,{frame:'administrator',staff:{role:'administrator',status:'active',needsMfa:false},children:require('react/jsx-runtime').jsxs('div',{className:'container community-admin-extras',children:[jsx(require('./member-administration').MemberAdministration,{accountId}),jsx(require('./member-administration').SecurityLog,{accountId})]})},String(++revision)));})();`;

const db = new PGlite();
let browser;
const origin = "https://staff.example.test";
// Use the production stylesheet order, including Tailwind's compiled reset.
const buildDirectory = path.resolve(project, process.env.ALPHA_BROWSER_BUILD_DIR || ".next");
const shell = await readFile(path.join(buildDirectory, "server/app/admin.html"), "utf8");
const styles = [...shell.matchAll(/href="([^"?]+\.css)(?:\?[^"]*)?"/g)].map(match => match[1]);
assert.ok(styles.length, "Run npm run build before the browser check");
const owner = crypto.randomUUID(), second = crypto.randomUUID();
async function identity(id = crypto.randomUUID()) {
  await db.query("insert into auth.users values ($1,$2,now())", [id, `${id}@example.test`]);
  await db.query("insert into auth.identities values ($1,'google')", [id]); return id;
}
async function rpc(actor, name, args = {}) {
  const calls = {
    manage_staff_access: ["select public.manage_staff_access($1) as value", [args.p_request]],
    list_staff_members: ["select public.list_staff_members() as value", []],
    list_staff_history: ["select public.list_staff_history($1,$2) as value", [args.p_target_id, args.p_before_version ?? null]],
  };
  if (!calls[name]) throw new Error("Unexpected RPC");
  return db.transaction(async tx => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [actor, JSON.stringify({ sub: actor, aal: "aal2" })]);
    return (await tx.query(...calls[name])).rows[0].value;
  });
}
const grant = (id, role = "evaluator") => ({ action: "grant", email: `${id}@example.test`, targetId: "", role, expectedVersion: 0, mutationId: crypto.randomUUID(), reason: "Synthetic browser fixture" });
async function change(actor, member, action, role = member.role) {
  return rpc(actor, "manage_staff_access", { p_request: { action, email: "", targetId: member.userId, role, expectedVersion: member.version, mutationId: crypto.randomUUID(), reason: "Synthetic concurrent change" } });
}
async function session() {
  const membership = (await db.query("select role,status from public.staff_memberships where user_id=$1", [owner])).rows[0];
  return { kind: "staff", identity: { id: owner }, membership, needsMfa: false, client: { rpc: async (name, args) => {
    try { return { data: await rpc(owner, name, args), error: null }; }
    catch (error) { return { data: null, error: { code: error.code } }; }
  } } };
}
async function until(predicate) {
  const end = Date.now() + 10000;
  while (!predicate()) { if (Date.now() > end) throw new Error("Synthetic request did not reach its checkpoint"); await delay(10); }
}

try {
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid,provider text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to anon,authenticated;`);
  for (const migration of ["202610180001_applicant_drafts.sql", "202610190001_staff_access.sql", "202610190002_staff_reason_validation.sql", "20261019053837_nonretryable_application_conflicts.sql", "20261019060538_applicant_submission.sql"]) await db.exec(await readFile(path.join(project, "supabase/migrations", migration), "utf8"));
  await identity(owner); await identity(second);
  await db.query("select public.bootstrap_first_staff_admin($1,$2)", [`${owner}@example.test`, "Synthetic browser bootstrap"]);
  await rpc(owner, "manage_staff_access", { p_request: grant(second, "administrator") });
  const handlers = await createStaffRoute(session, origin);
  const { chromium } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : "playwright");
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  let faults, target, memberFailure = false;
  const memberPosts = [];
  await page.route(origin + "/**", async route => {
    const incoming = route.request(), url = new URL(incoming.url());
    if (styles.includes(url.pathname)) return route.fulfill({ contentType: "text/css", body: await readFile(path.join(buildDirectory, url.pathname.replace(/^.*?\/_next\//, ""))) });
    if (url.pathname.startsWith("/brand/")) return route.fulfill({ body: await readFile(path.join(project, "public", url.pathname)) });
    if (url.pathname === "/api/access") {
      faults.accessReads++;
      if (faults.stallAccess) return;
      return route.fulfill({ json: faults.access || { kind: "staff", accountId: owner, role: "administrator", status: "active", needsMfa: false } });
    }
    if (url.pathname === "/api/community") {
      if (incoming.method() === "GET") return route.fulfill({ json: { ok: true, data: [] } });
      const payload = JSON.parse(incoming.postData()); memberPosts.push(payload);
      return memberFailure
        ? route.fulfill({ status: 404, json: { ok: false, message: "The member must sign in with their verified Google account first" } })
        : route.fulfill({ json: { ok: true, data: { id: "ALPHA-2026-ABCDEF123456", status: payload.status } } });
    }
    if (url.pathname !== "/api/staff") return route.fulfill({ contentType: "text/html", body: `<html lang="en" data-theme="light"><head>${styles.map(style => `<link rel="stylesheet" href="${style}">`).join("")}</head><body class="alpha-app"><div id="root"></div></body></html>` });
    if (incoming.method() === "GET" && url.searchParams.has("targetId") && faults.historyUnavailable) return route.fulfill({status:503,json:{ok:false,code:"UNAVAILABLE",message:"Synthetic history outage"}});
    if (incoming.method() === "GET" && !url.searchParams.has("targetId")) {
      faults.directoryReads++;
      if (faults.stallDirectory) return;
      if (faults.staleDirectory) return route.fulfill({ json: { ok: true, data: faults.staleDirectory } });
    }
    const request = new Request(incoming.url(), { method: incoming.method(), headers: await incoming.allHeaders(), ...(incoming.method() === "POST" ? { body: incoming.postData() } : {}) });
    const response = await handlers[incoming.method()](request);
    const body = await response.text();
    if (incoming.method() === "POST") {
      faults.posts.push(JSON.parse(incoming.postData()));
      if (faults.stallPost) { faults.committed = true; return; }
    }
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body });
  });
  faults = { accessReads: 0 }; await page.goto(origin); await page.addScriptTag({ content: bundle }); await page.clock.install();
  const passed = [];
  async function mount(options = {}) {
    target = await rpc(owner, "manage_staff_access", { p_request: grant(await identity()) });
    faults = { posts: [], directoryReads: 0, accessReads: 0, ...options };
    await page.evaluate(({ accountId, members }) => window.mount(accountId, members), { accountId: owner, members: await rpc(owner, "list_staff_members") });
    await page.locator(".staff-member-list button").filter({ hasText: target.email }).click();
  }
  async function prepare(action = "suspend") {
    await page.getByLabel("Access change").selectOption(action);
    await page.getByLabel("Reason for this change").fill("Synthetic browser command reason");
    await page.getByRole("button", { name: "Review access change", exact: true }).click();
  }
  async function confirm() { await page.getByRole("button", { name: "Confirm access change", exact: true }).click(); }
  async function history() { return rpc(owner, "list_staff_history", { p_target_id: target.userId }); }

  await mount({historyUnavailable:true});await page.getByRole("button",{name:"Retry history",exact:true}).waitFor();assert.equal(await page.locator(".workspace-disclosure").evaluate(node=>node.open),true);delete faults.historyUnavailable;await page.getByRole("button",{name:"Retry history",exact:true}).click();await page.getByRole("button",{name:"Retry history",exact:true}).waitFor({state:"detached"});
  await mount();assert.equal(await page.locator(".workspace-disclosure").evaluate(node=>node.open),false);assert.equal(await page.locator(".staff-history").count(),1);await openDisclosure(page,"Access history");await page.locator(".workspace-disclosure > summary").click();await assertRecruitmentSurface(page,"Staff directory");await assertInlineFailure(page,"Review access change","staff-reason");await assertEnlargedProcess(page,"staff-reason");await page.setViewportSize({width:375,height:812});
  await page.getByLabel('Reason for this change').fill('Preserved across mobile views');
  await page.getByRole('button',{name:'Back to staff list',exact:true}).click();
  assert.equal(await page.locator('.staff-member-detail').isVisible(),false);
  await page.locator('.staff-member-list button').filter({hasText:target.email}).click();
  assert.equal(await page.getByLabel('Reason for this change').inputValue(),'Preserved across mobile views');
  assert.equal(faults.posts.length,0);
  const previewDir=path.join(project,'.next/verification/staff-confirmation');await mkdir(previewDir,{recursive:true});
  for(const width of [375,1440]){await page.setViewportSize({width,height:950});await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0);});await page.screenshot({path:path.join(previewDir,'staff-detail-'+width+'.png')});}
  passed.push('mobile staff list/detail preserves unfinished reason without a write; shared black frame rendered');
  await page.setViewportSize({width:375,height:812});
  const addStaff=page.getByRole('button',{name:'Add staff',exact:true});
  await addStaff.click();
  await assertInlineFailure(page,'Review access change','staff-email');
  await page.getByLabel('Google account email').fill(target.email);
  await assertInlineFailure(page,'Review access change','staff-email');
  assert.match(await page.locator('#staff-email-error').textContent(),/already has a staff record/);
  await page.getByLabel('Google account email').fill('new-staff@example.test');
  await page.getByLabel('Role',{exact:true}).selectOption('administrator');
  await page.getByLabel('Reason for this change').fill('Preserve unfinished grant');
  await page.getByRole('button',{name:'Back to staff list',exact:true}).click();
  await page.waitForFunction(()=>document.activeElement?.textContent==='Add staff');
  await addStaff.click();
  assert.equal(await page.getByLabel('Google account email').inputValue(),'new-staff@example.test');
  assert.equal(await page.getByLabel('Role',{exact:true}).inputValue(),'administrator');
  assert.equal(await page.getByLabel('Reason for this change').inputValue(),'Preserve unfinished grant');
  assert.equal(faults.posts.length,0);
  passed.push('relocated Add staff restores focus on mobile Back and preserves email, role and reason without a write');
  await mount({ stallPost: true }); await prepare(); await confirm(); await until(() => faults.committed);
  assert.equal(await page.getByRole("button", { name: "Updating access…", exact: true }).isDisabled(), true);
  // Repeated clicks cannot dispatch another request while the original acknowledgement is missing.
  await page.getByRole("button", { name: "Updating access…", exact: true }).dispatchEvent("click");
  assert.equal(faults.posts.length, 1);
  await page.clock.runFor(15001);
  await page.getByRole("button", { name: "Retry confirmation", exact: true }).waitFor();
  assert.match(await page.getByRole("alert").textContent(), /may have completed/);
  const artifactDir = path.join(project, ".next/verification/staff-confirmation");
  await mkdir(artifactDir, { recursive: true });
  for (const colorScheme of ["light", "dark"]) for (const width of [320, 375, 414, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ colorScheme });
    await assertProcessAppearance(page,".recruitment-process","Staff "+width);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "light");
    const layout = await page.getByRole("dialog").evaluate(dialog => ({ left: dialog.getBoundingClientRect().left, right: dialog.getBoundingClientRect().right, overflow: dialog.scrollWidth > dialog.clientWidth + 1, pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 }));
    assert.ok(layout.left >= 0 && layout.right <= width + 1 && !layout.overflow && !layout.pageOverflow, `${colorScheme} ${width}: ${JSON.stringify(layout)}`);
    if (colorScheme === "dark" && width === 375 || colorScheme === "light" && width === 1440) await page.screenshot({ path: path.join(artifactDir, `light-prefers-${colorScheme}-${width}.png`), fullPage: true });
  }
  passed.push("native retry dialog fits six widths with light/dark device preferences, fixed light appearance, and reduced motion");
  const original = faults.posts[0]; faults.stallPost = false;
  await page.getByRole("button", { name: "Retry confirmation", exact: true }).focus(); await page.keyboard.press("Enter");
  await page.getByText("Staff access updated and recorded.", { exact: true }).waitFor();
  assert.deepEqual(faults.posts[1], original);
  assert.equal((await history()).filter(event => event.action === "suspend").length, 1);
  assert.equal((await rpc(owner, "list_staff_members")).find(member => member.userId === target.userId).version, 2);
  passed.push("committed write, lost acknowledgement, identical retry, one SQL history event, duplicate-click guard");

  await mount({ stallDirectory: true }); await prepare(); await confirm();
  await page.getByText("Staff access updated and recorded.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.match(await page.locator(".staff-member-detail > p").first().textContent(), /Suspended/);
  await until(() => faults.directoryReads > 0); await page.clock.runFor(8001);
  await page.getByRole("alert").waitFor();
  await page.waitForFunction(() => document.activeElement?.matches(".staff-member-detail"));
  assert.equal(await page.getByText("Staff access updated and recorded.", { exact: true }).count(), 1);
  faults.stallDirectory = false; await page.getByRole("button", { name: "Reload staff details" }).click();
  await page.getByRole("button", { name: "Refresh", exact: true }).waitFor();
  passed.push("successful write is independent of stalled directory refresh, read timeout and recovery");

  await mount(); faults.staleDirectory = await rpc(owner, "list_staff_members");
  await prepare(); await confirm(); await page.getByText("Staff access updated and recorded.", { exact: true }).waitFor();
  await until(() => faults.directoryReads > 0);
  assert.match(await page.locator(".staff-member-detail > p").first().textContent(), /Suspended/);
  passed.push("stale directory response cannot downgrade acknowledged membership");

  await mount(); await prepare("revoke");
  await change(second, target, "suspend"); await confirm();
  await page.getByRole("button", { name: "Reload latest details", exact: true }).waitFor();
  assert.match(await page.getByRole("alert").textContent(), /changed in another session/);
  assert.equal((await history()).some(event => event.action === "revoke"), false);
  await page.getByRole("button", { name: "Reload latest details", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.equal(await page.getByLabel("Reason for this change").inputValue(), "Synthetic browser command reason");
  passed.push("two-administrator stale confirmation rejected, no history event, reason retained");

  await mount({ stallPost: true }); await prepare(); await confirm(); await until(() => faults.committed);
  faults.access = { kind: "staff", accountId: owner, role: "evaluator", status: "active", needsMfa: false };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading", { name: "Your access has changed", exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.getByText("Staff access updated and recorded.", { exact: true }).count(), 0);
  passed.push("access loss unmounts private confirmation and cancels pending command");

  await mount({ stallPost: true }); await prepare(); await confirm(); await until(() => faults.committed);
  faults.access = { kind: "staff", accountId: second, role: "administrator", status: "active", needsMfa: false };
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.getByRole("heading", { name: "Your access has changed", exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  passed.push("account change clears private data while a command is pending");

  await mount({ stallPost: true }); await prepare(); await confirm(); await until(() => faults.committed);
  faults.stallAccess = true; const pendingReads = faults.accessReads;
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await until(() => faults.accessReads > pendingReads);
  await page.clock.runFor(8001);
  await page.getByRole("button", { name: "Retry access check", exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0);
  faults.stallAccess = false; faults.stallPost = false;
  await page.getByRole("button", { name: "Retry access check", exact: true }).click();
  await page.getByRole("button", { name: "Retry confirmation", exact: true }).waitFor();
  await page.getByRole("button", { name: "Retry confirmation", exact: true }).click();
  await page.getByText("Staff access updated and recorded.", { exact: true }).waitFor();
  assert.deepEqual(faults.posts[0], faults.posts[1]);
  assert.equal((await history()).filter(event => event.action === "suspend").length, 1);
  passed.push("temporary access outage preserves an uncertain confirmation for the same-command retry");

  await mount(); faults.stallAccess = true;
  const reads = faults.accessReads;
  await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await until(() => faults.accessReads > reads);
  await page.clock.runFor(8001);
  await page.getByRole("button", { name: "Retry access check", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Staff management", exact: true }).isVisible(), false);
  faults.stallAccess = false; await page.getByRole("button", { name: "Retry access check", exact: true }).click();
  await page.getByRole("heading", { name: "Staff management", exact: true }).waitFor();
  passed.push("access-check timeout hides staff data and permits re-verification");

  faults = { accessReads: 0, stallAccess: true };
  await page.evaluate(accountId => window.mount(accountId, [], "applicant", true), owner);
  await until(() => faults.accessReads > 0); await page.clock.runFor(8001);
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByLabel("Unsaved applicant answer").inputValue(), "Preserved synthetic answer");
  assert.equal(await page.getByLabel("Unsaved applicant answer").isVisible(), true);
  passed.push("applicant unsaved input survives access-check timeout");

  await page.evaluate(accountId => window.mountMembers(accountId), owner);
  await page.getByRole("heading", { name: "Organization members", exact: true }).waitFor();
  await page.getByRole("button", { name: "Add existing member", exact: true }).click();
  await page.getByLabel("Verified Google email").fill("existing-member@example.test");
  await page.getByLabel("Member name", { exact: true }).fill("Existing Alpha Member");
  await page.getByLabel("Position", { exact: true }).fill("Committee Member");
  await page.getByLabel("Date joined").fill("2026-11-01");
  await page.getByLabel("Private reason").fill("Verified existing organization membership");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Review and add member", exact: true }).click();
  assert.equal(memberPosts.length, 0, "Cancelling confirmation creates no membership command");
  memberFailure = true;
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Review and add member", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "sign in with their verified Google account first" }).waitFor();
  assert.equal(await page.getByLabel("Member name", { exact: true }).inputValue(), "Existing Alpha Member");
  memberFailure = false;
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Review and add member", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Membership saved. ID: ALPHA-2026-ABCDEF123456" }).waitFor();
  assert.equal(memberPosts.at(-1).action, "issueMember");
  assert.equal(memberPosts.at(-1).accountId, owner);
  assert.equal(memberPosts.at(-1).status, "active");
  assert.equal(await page.getByLabel("Verified Google email").count(), 0);
  await page.getByRole("button", { name: "Update or revoke membership", exact: true }).click();
  await page.getByLabel("Verified Google email").fill("existing-member@example.test");
  await page.getByLabel("Member name", { exact: true }).fill("Existing Alpha Member");
  await page.getByLabel("Membership access").selectOption("revoked");
  await page.getByLabel("Private reason").fill("Membership ended");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Review membership change", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Membership revoked." }).waitFor();
  assert.doesNotMatch(await page.getByRole("status").textContent(), /download/);
  await page.getByText("Security activity log", { exact: true }).click();
  await page.getByRole("button", { name: "Load latest activity", exact: true }).click();
  await page.getByText("No activity recorded yet.", { exact: true }).waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const colors = await page.locator(".community-admin-panel").evaluateAll(panels => panels.map(panel => ({
      background: getComputedStyle(panel).backgroundColor,
      text: getComputedStyle(panel.querySelector("h2, summary")).color,
    })));
    for (const { background, text } of colors) {
      assert.equal(background, "rgb(255, 255, 255)", "Panels are opaque above the gradient");
      const rgb = text.match(/\d+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      assert.ok(1.05 / (luminance + .05) >= 4.5, "Admin headings and disclosure text remain readable");
    }
    await page.locator(".community-admin-extras").evaluate(node => node.scrollIntoView({ block: "start" }));
    if (width === 390 || width === 1440) await page.screenshot({ path: path.join(previewDir, "member-admin-" + width + ".png") });
  }
  passed.push("existing-member form confirms/cancels, preserves failed input, distinguishes revocation and stays readable over the gradient; synthetic community transport");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, pageErrors: 0, backend: "isolated PGlite with synthetic identity; actual HTTP authorization and SQL functions", hosted: false }));
} finally { await browser?.close(); await db.close(); }

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);

/** Compile the real layout/validation primitives for the standalone browser shells. */
export async function installRecruitmentUI(modules) {
  const { transform } = require("next/dist/build/swc");
  const pathsFile = fileURLToPath(new URL("../../lib/site-paths.ts", import.meta.url));
  const { code: sitePaths } = await transform(await readFile(pathsFile, "utf8"), { filename: pathsFile, jsc: { parser: { syntax: "typescript" } }, module: { type: "commonjs" } });
  modules.set("@/recruitment/lib/site-paths", sitePaths);
  modules.set("./site-paths.ts", sitePaths);
  for (const name of ["use-opportunity-availability", "inline-validation", "admin-navigation-guard", "admin-shell", "workspace-skeleton", "recruitment-shell", "wave-gradient", "enrollment-upload", "notification-inbox", "member-administration", "member-invitations", "applicant-outreach"]) {
    const filename = fileURLToPath(new URL(`../../../app/(recruitment)/recruitment/components/${name}.${["inline-validation", "use-opportunity-availability", "admin-navigation-guard"].includes(name) ? "ts" : "tsx"}`, import.meta.url));
    const { code } = await transform(await readFile(filename, "utf8"), { filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
    modules.set(`./${name}`, code);
    modules.set(`@/app/(recruitment)/recruitment/components/${name}`, code);
  }
  for(const name of ['opportunity-availability','community','community-client','http-request','format-date']){
    const filename=fileURLToPath(new URL(`../../lib/${name}.ts`,import.meta.url));
    const {code}=await transform(await readFile(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}});
    modules.set(`@/recruitment/lib/${name}`,code);modules.set(`./${name}.ts`,code);
  }
  modules.set("recruitment-test-frame", `exports.Frame=({frame,children,staff,signedIn=true})=>{const {jsx,jsxs}=require('react/jsx-runtime');const ui=require('./ui');return jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn,staff}),jsx(require('./recruitment-shell').RecruitmentShell,{frame,children,adminAccount:jsx(require('./admin-shell').AdminAccount,{signedIn,label:'Synthetic administrator'})}),jsx(ui.Footer,{})]});};`);
}

export async function assertRecruitmentSurface(page, label) {
  await assertProcessAppearance(page, ".recruitment-process", label);
  assert.equal(await page.locator(".recruitment-process").count(), 1, label + " has one layout host");
  const staff = await page.locator('.recruitment-process[data-workspace-frame="staff"]').count() > 0;
  const administrator = await page.locator('.recruitment-process[data-workspace-frame="administrator"]').count() > 0;
  assert.equal(await page.locator(".workspace-atmosphere canvas").count(), 1, label + " has its route-specific background");
  assert.equal(await page.locator(".site-footer").count(), 0, label + " has no process footer");
  assert.equal(await page.locator(".error-summary").count(), 0, label + " uses field-only errors");
  const invalid = await page.evaluate(() => [...document.querySelectorAll('main button, main input:not([type="hidden"]), main select, main textarea, dialog button')].filter(node => {
    if (!node.getClientRects().length || getComputedStyle(node).visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.left < -1 || rect.right > innerWidth + 1;
  }).map(node => node.id || node.textContent.slice(0, 80)));
  assert.deepEqual(invalid, [], label + " controls fit the viewport");
  if (administrator) {
    assert.equal(await page.locator('.recruitment-process').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)', label + ' exposes the applicant atmosphere');
    return;
  }
  if (staff) {
    const background = await page.locator('.recruitment-process').evaluate(node => { const style = getComputedStyle(node); return {color:style.backgroundColor,image:style.backgroundImage,animation:style.animationName}; });
    assert.equal(background.color, 'rgba(0, 0, 0, 0)', label + ' has the navy Staff background');
    assert.equal(background.image, 'none', label + ' exposes the shared applicant atmosphere');
    assert.equal(background.animation, 'none', label + ' background stays still');
    assert.equal(await page.locator('.staff-auth-emblem').count(), 0, label + ' omits the shield emblem');
    const cards = await page.locator('.staff-auth-card, .recruitment-process>.portal.narrow').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => getComputedStyle(node).backgroundColor));
    assert.ok(cards.length && cards.every(color => color === 'rgb(255, 255, 255)'), label + ' keeps a clear white card');
    return;
  }
  await page.waitForFunction(() => { const canvas = document.querySelector(".workspace-atmosphere canvas"); return canvas && canvas.width <= innerWidth * 1.5 + 1 && canvas.height <= innerHeight * 1.5 + 1; });
  const canvas = await page.locator(".workspace-atmosphere canvas").evaluate(node => ({ width: node.width, height: node.height, viewportWidth: innerWidth, viewportHeight: innerHeight }));
  assert.ok(canvas.width <= canvas.viewportWidth * 1.5 + 1 && canvas.height <= canvas.viewportHeight * 1.5 + 1, label + " canvas is viewport bounded");
}

export async function assertProcessAppearance(page, selector = ".process-root", label = "Process") {
  const result = await page.locator(selector).evaluate(root => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    const rgba = value => { context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    const luminance = color => color.slice(0, 3).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    const over = (a, b) => a.slice(0, 3).map((channel, index) => channel * a[3] / 255 + b[index] * (1 - a[3] / 255)).concat(255);
    const paintedBackground = node => {
      const ancestors = [];
      for (let current = node; current && root.contains(current); current = current.parentElement) ancestors.unshift(current);
      return ancestors.reduce((background, current) => over(rgba(getComputedStyle(current).backgroundColor), background), [8, 9, 10, 255]);
    };
    const issues = [];
    for (const node of root.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, .notice, .badge, .field-error, .modal")) {
      if (!node.getClientRects().length || getComputedStyle(node).visibility === "hidden") continue;
      const style = getComputedStyle(node), background = rgba(style.backgroundColor), foreground = rgba(style.color);
      if (node.closest(".apply-auth:not(.apply-step-entry), .workspace-anonymous") && background[3] && luminance(background) > .15) issues.push((node.id || node.className) + " auth surface is too light");
      if (background[3] === 255 && contrast(foreground, background) < 4.5) issues.push((node.id || node.className) + " text contrast");
      if (node.matches("input,select,textarea") && !node.matches(":disabled")) {
        if (style.colorScheme !== "light") issues.push(node.id + " native control scheme");
        if (contrast(rgba(style.borderTopColor), background) < 3) issues.push(node.id + " control border contrast");
      }
    }
    for (const node of root.querySelectorAll("label, legend, dt, .muted, .field-hint, .field-error, .notice-title, .notice-content, .text-button, .button-danger, .staff-auth-description, .staff-auth-eyebrow, .staff-auth-support a, .staff-auth-card h1, .staff-auth-card h2, .staff-auth-card summary, .staff-auth-card .button, .staff-auth-card .workspace-account")) {
      if (!node.getClientRects().length || node.closest('[hidden], [inert]') || getComputedStyle(node).visibility === "hidden") continue;
      const background = paintedBackground(node), foreground = over(rgba(getComputedStyle(node).color), background);
      if (contrast(foreground, background) < 4.5) issues.push((node.id || node.className || node.tagName) + " transparent text contrast");
    }
    for (const node of root.querySelectorAll('.process-choice.selected, .process-opportunity.selected, .evaluation-list-item[aria-pressed="true"], .staff-member-list button.selected')) {
      if (!node.getClientRects().length) continue;
      if (rgba(getComputedStyle(node).backgroundColor).join(",") !== "255,241,218,255") issues.push("Selected row does not use the light selection tint");
    }
    return { expectedScheme: root.matches("[data-appearance=dark]") ? "dark" : "light", scheme: getComputedStyle(root).colorScheme, publicScheme: getComputedStyle(document.documentElement).colorScheme, surface: rgba(getComputedStyle(root).getPropertyValue("--color-process-surface")), issues };
  });
  assert.equal(result.scheme, result.expectedScheme, label + " has a fixed working/auth scope");
  assert.equal(result.publicScheme, "light", label + " does not change public native controls");
  assert.deepEqual(result.surface, [255, 255, 255, 255], label + " uses the approved white working token");
  assert.deepEqual(result.issues, [], label + " working/auth surface/control/text contrast");
}

export async function assertInlineFailure(page, button, id) {
  await page.getByRole("button", { name: button, exact: true }).click();
  await page.waitForFunction(id => document.activeElement?.id === id, id);
  assert.equal(await page.locator(`#${id}`).getAttribute("aria-invalid"), "true");
  assert.match(await page.locator(`#${id}`).getAttribute("aria-describedby"), new RegExp(`${id}-error`));
  assert.ok((await page.locator(`#${id}-error`).textContent()).trim());
  assert.equal(await page.locator(".error-summary").count(), 0);
}

export async function openDisclosure(page, label) {
  const summary = page.locator("summary").filter({ hasText: new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") });
  if (!await summary.evaluate(node => node.parentElement.open)) await summary.click();
}

export async function assertEnlargedProcess(page, field) {
  // Resize checks and explicit short-screen focus are separate assertions.
  // A still-focused invalid textarea can trigger native caret scrolling while
  // the viewport/fonts change, racing the positioning check below.
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertRecruitmentSurface(page, "200% text " + width);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await page.setViewportSize({ width: 375, height: 480 });
  if (field) {
    // Let responsive layout and the measured fixed-header row settle before
    // explicitly positioning the field. Native focus scrolling can otherwise
    // race this scroll when leaving the enlarged-text viewport.
    await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    await page.waitForFunction(() => {
      const row = document.querySelector(".site-header .header-inner");
      const published = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height"));
      return !row || Math.abs(row.getBoundingClientRect().height - published) < 1;
    });
    await page.locator(`#${field}`).evaluate(async node => {
      node.focus({ preventScroll: true });
      // Allow native textarea caret positioning to finish before explicitly
      // scrolling the field; its selection may be at the end of a long value.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      node.scrollIntoView({ block: "start", behavior: "instant" });
    });
    const visible = await page.waitForFunction(id => {
      const bounds = document.getElementById(id)?.getBoundingClientRect();
      const header = document.querySelector(".site-header")?.getBoundingClientRect();
      const offset = header ? Math.max(0, header.bottom) : 0;
      return bounds && bounds.y >= offset && bounds.y < innerHeight ? { y: bounds.y, offset, height: innerHeight } : false;
    }, field).catch(async error => {
      const geometry = await page.evaluate(id => {
        const node = document.getElementById(id), header = document.querySelector('.site-header');
        return { field:node?.getBoundingClientRect().toJSON(), header:header?.getBoundingClientRect().toJSON(), focused:document.activeElement?.id, scrollY, viewport:innerHeight };
      }, field);
      throw new Error(error.message + ' Focus geometry: ' + JSON.stringify(geometry));
    });
    const bounds = await visible.jsonValue();
    assert.ok(bounds && bounds.y >= bounds.offset && bounds.y < bounds.height, "focused field remains visible below the fixed header in a short viewport");
  }
  await page.setViewportSize({ width: 1440, height: 950 });
}

/** Real header/dialog lifecycles; ordinary decorative entrances stay synthetic. */
export async function installBrowserMotion(modules, { realEntrances = false } = {}) {
  modules.set("gsap", await readFile(require.resolve("gsap/dist/gsap.js"), "utf8"));
  modules.set("@gsap/react", await readFile(require.resolve("@gsap/react"), "utf8"));
  let motion = "exports.motionPresets={dialog:0};exports.useEntrance=()=>{};exports.useGSAP=require('@gsap/react').useGSAP;exports.WorkspaceEntranceSection=({enabled,...props})=>require('react/jsx-runtime').jsx('section',props);";
  if (realEntrances) {
    modules.set("gsap/ScrollTrigger", await readFile(require.resolve("gsap/dist/ScrollTrigger.js"), "utf8"));
    const filename = fileURLToPath(new URL("../../../app/(recruitment)/recruitment/components/motion.tsx", import.meta.url));
    const { transform } = require("next/dist/build/swc");
    ({ code: motion } = await transform(await readFile(filename, "utf8"), {
      filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" },
    }));
  }
  modules.set("./motion", motion);
  modules.set("@/app/(recruitment)/recruitment/components/motion", motion);
}

/** Observe actual tween styles without racing the first animation frame. */
export async function watchWorkspaceEntrance(page, selector) {
  await page.evaluate(selector => {
    window.workspaceEntranceObserver?.disconnect();
    window.workspaceEntranceSeen = false;
    window.workspaceEntranceObserver = new MutationObserver(records => {
      if (records.some(({ target, oldValue }) => target.matches(selector)
        && (/opacity: 0\.[6-9]/.test(oldValue || "") || Number(target.style.opacity) > 0 && Number(target.style.opacity) < 1))) {
        window.workspaceEntranceSeen = true;
      }
    });
    window.workspaceEntranceObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["style"], attributeOldValue: true });
  }, selector);
}

export async function assertWorkspaceEntrance(page, selector) {
  await page.waitForFunction(() => window.workspaceEntranceSeen);
  await page.waitForFunction(selector => {
    const nodes = [...document.querySelectorAll(selector)];
    return nodes.length > 0 && nodes.every(node => !node.style.opacity && !node.style.transform);
  }, selector);
}

/** Exercise fresh route mounts at both workspace breakpoints. */
export async function assertResponsiveEntrances(page, check) {
  const viewport = page.viewportSize();
  const reducedMotion = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 950 });
      await check(width);
    }
  } finally {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  }
}

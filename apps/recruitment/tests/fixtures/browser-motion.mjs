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
  modules.set("@/lib/site-paths", sitePaths);
  modules.set("./site-paths.ts", sitePaths);
  for (const name of ["use-opportunity-availability", "inline-validation", "recruitment-shell", "wave-gradient", "enrollment-upload", "notification-inbox", "member-administration", "member-invitations", "applicant-outreach"]) {
    const filename = fileURLToPath(new URL(`../../app/components/${name}.${["inline-validation", "use-opportunity-availability"].includes(name) ? "ts" : "tsx"}`, import.meta.url));
    const { code } = await transform(await readFile(filename, "utf8"), { filename, jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
    modules.set(`./${name}`, code);
    modules.set(`@/app/components/${name}`, code);
  }
  for(const name of ['opportunity-availability','community','community-client','http-request','format-date']){
    const filename=fileURLToPath(new URL(`../../lib/${name}.ts`,import.meta.url));
    const {code}=await transform(await readFile(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}});
    modules.set(`@/lib/${name}`,code);modules.set(`./${name}.ts`,code);
  }
  modules.set("recruitment-test-frame", `exports.Frame=({frame,children,staff,signedIn=true})=>{const {jsx,jsxs}=require('react/jsx-runtime');const ui=require('./ui');return jsxs(require('react').Fragment,{children:[jsx(ui.SiteHeader,{signedIn,staff}),jsx(require('./recruitment-shell').RecruitmentShell,{frame,children}),jsx(ui.Footer,{})]});};`);
}

export async function assertRecruitmentSurface(page, label) {
  await assertProcessAppearance(page, ".recruitment-process", label);
  assert.equal(await page.locator(".recruitment-process").count(), 1, label + " has one layout host");
  assert.equal(await page.locator(".workspace-atmosphere canvas").count(), 1, label + " has one decorative canvas");
  assert.equal(await page.locator(".site-footer").count(), 0, label + " has no process footer");
  assert.equal(await page.locator(".error-summary").count(), 0, label + " uses field-only errors");
  const invalid = await page.evaluate(() => [...document.querySelectorAll('main button, main input:not([type="hidden"]), main select, main textarea, dialog button')].filter(node => {
    if (!node.getClientRects().length || getComputedStyle(node).visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.left < -1 || rect.right > innerWidth + 1;
  }).map(node => node.id || node.textContent.slice(0, 80)));
  assert.deepEqual(invalid, [], label + " controls fit the viewport");
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
      if (node.closest(".apply-auth, .workspace-anonymous") && background[3] && luminance(background) > .15) issues.push((node.id || node.className) + " auth surface is too light");
      if (background[3] === 255 && contrast(foreground, background) < 4.5) issues.push((node.id || node.className) + " text contrast");
      if (node.matches("input,select,textarea") && !node.matches(":disabled")) {
        if (style.colorScheme !== "light") issues.push(node.id + " native control scheme");
        if (contrast(rgba(style.borderTopColor), background) < 3) issues.push(node.id + " control border contrast");
      }
    }
    for (const node of root.querySelectorAll("label, legend, dt, .muted, .field-hint, .field-error, .notice-title, .notice-content, .text-button, .button-danger")) {
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
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 812 });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertRecruitmentSurface(page, "200% text " + width);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
  await page.setViewportSize({ width: 375, height: 480 });
  if (field) {
    // Resizing from 200% text can publish the new sticky-header height a frame
    // after the viewport changes. Scroll using the current CSS scroll offset.
    await page.waitForFunction(() => {
      const header = document.querySelector(".site-header");
      const published = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height"));
      return !header || Math.abs(header.getBoundingClientRect().height - published) < 1;
    });
    await page.locator(`#${field}`).focus();
    // The page enables smooth scrolling; measure only after an immediate scroll.
    await page.locator(`#${field}`).evaluate(node => node.scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForFunction(id => { const bounds = document.getElementById(id)?.getBoundingClientRect(); return bounds && bounds.y >= 0 && bounds.y < innerHeight; }, field);
    // Read and assert the same visible frame; navbar/reflow synchronization may follow.
    const visible = await page.waitForFunction(id => {
      const bounds = document.getElementById(id)?.getBoundingClientRect();
      return bounds && bounds.y >= 0 && bounds.y < innerHeight ? { y: bounds.y, height: innerHeight } : false;
    }, field);
    const bounds = await visible.jsonValue();
    assert.ok(bounds && bounds.y >= 0 && bounds.y < bounds.height, "focused field remains reachable in a short viewport");
  }
  await page.setViewportSize({ width: 1440, height: 950 });
}

/** Real header/dialog lifecycles; ordinary decorative entrances stay synthetic. */
export async function installBrowserMotion(modules) {
  modules.set("gsap", await readFile(require.resolve("gsap/dist/gsap.js"), "utf8"));
  modules.set("@gsap/react", await readFile(require.resolve("@gsap/react"), "utf8"));
  const motion = "exports.motionPresets={dialog:0};exports.useEntrance=()=>{};exports.useGSAP=require('@gsap/react').useGSAP;";
  modules.set("./motion", motion);
  modules.set("@/app/components/motion", motion);
}

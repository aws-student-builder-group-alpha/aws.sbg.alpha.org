// Render and hydrate the shared intro with the production mascot, preferences and CSS.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const requireReactDOM = createRequire(require.resolve("react-dom/package.json"));
const project = fileURLToPath(new URL("../../", import.meta.url));
const { loadBindings, transform } = require("next/dist/build/swc");
await loadBindings();

const modules = new Map([["next/navigation", "exports.usePathname = () => '/recruitment';"]]);
for (const [name, relativePath] of [
  ["loader", "../components/page-loader.tsx"],
  ["@/app/(main)/(landing)/hero/pixel-wolf", "../app/(main)/(landing)/hero/pixel-wolf.tsx"],
  ["@/lib/site-preferences", "../lib/site-preferences.ts"],
]) {
  const filename = path.join(project, relativePath);
  const { code } = await transform(await readFile(filename, "utf8"), {
    filename,
    jsc: { parser: { syntax: "typescript", tsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  modules.set(name, code);
}

const cache = new Map();
function requireFixture(name) {
  if (!modules.has(name)) return require(name);
  if (!cache.has(name)) {
    const compiled = { exports: {} };
    new Function("module", "exports", "require", modules.get(name))(compiled, compiled.exports, requireFixture);
    cache.set(name, compiled.exports);
  }
  return cache.get(name);
}

const markup = require("react-dom/server").renderToStaticMarkup(
  require("react").createElement(requireFixture("loader").default, { replayOnDocument: true }),
);
for (const [name, pkg, filename] of [
  ["react", "react", "react.development.js"],
  ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"],
  ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
]) {
  const packagePath = requireReactDOM.resolve(pkg + "/package.json");
  modules.set(name, await readFile(path.join(path.dirname(packagePath), "cjs", filename), "utf8"));
}

const bundle = `(() => {
  const process = { env: { NODE_ENV: "development" } };
  const modules = {${[...modules].map(([name, code]) => JSON.stringify(name) + ":function(module,exports,require){" + code + "\n}").join(",")}};
  const cache = {};
  function require(name) {
    if (!cache[name]) {
      const module = cache[name] = { exports: {} };
      modules[name](module, module.exports, require);
    }
    return cache[name].exports;
  }
  const { jsx } = require("react/jsx-runtime");
  const root = document.getElementById("intro-root");
  require("react-dom/client").hydrateRoot(root, jsx(require("loader").default, { replayOnDocument: true }));
  document.getElementById("internal").onclick = event => {
    event.preventDefault();
    history.pushState({}, "", event.currentTarget.href);
  };
})();`;

const css = await readFile(path.join(project, "../components/page-loader.css"), "utf8");
const output = path.join(project, ".next/page-loader-preview");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];
const origin = "https://intro.example.test";
const selector = ".alpha-page-loader";
const baseMarkup = `<meta charset="utf-8"><style>body{margin:0}${css}</style><div id="intro-root">${markup}</div>
  <main><h1>Page content</h1><a id="internal" href="/recruitment/membership">Internal page</a><input aria-label="Example field"></main>`;

try {
  const context = await browser.newContext();
  await context.addInitScript(() => sessionStorage.setItem("alpha-intro-shown", "1"));
  await context.route(origin + "/**", route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: baseMarkup + (params.has("nohydrate") ? "" : "<script>" + bundle + "</script>"),
    });
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  const intro = page.locator(selector);
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [568, 320]]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await intro.locator(".alpha-page-loader-wolf").waitFor({ state: "visible" });
    assert.equal((await intro.textContent()).trim(), "Loading");
    assert.equal(await intro.getAttribute("aria-hidden"), "true");
    assert.equal(await intro.locator("svg").count(), 1);

    const motion = await intro.evaluate(node => {
      const animations = node.getAnimations({ subtree: true });
      for (const animation of animations) animation.pause();
      const seek = time => { for (const animation of animations) animation.currentTime = time; };
      const scene = node.querySelector(".alpha-page-loader-scene");
      const wolf = node.querySelector(".alpha-page-loader-wolf");
      const title = node.querySelector(".alpha-page-loader-title");
      const sticker = node.querySelector(".alpha-page-loader-sticker");
      const track = node.querySelector(".alpha-page-loader-track");
      const release = animations.find(animation => animation.animationName === "alpha-page-loader-release");
      const trackOffset = () => new DOMMatrixReadOnly(getComputedStyle(track, "::after").transform).e;

      seek(180);
      const edge = parseFloat(getComputedStyle(scene).getPropertyValue("--alpha-sticker-edge"));
      const start = wolf.getBoundingClientRect();
      const sweepStart = trackOffset();
      seek(460);
      const sweepTravel = trackOffset() - sweepStart;
      const apex = wolf.getBoundingClientRect();
      seek(780);
      const landing = wolf.getBoundingClientRect();
      seek(1100);
      const end = wolf.getBoundingClientRect();
      const travelX = start.left + start.width / 2 - end.left - end.width / 2;
      const travelY = end.top + end.height / 2 - start.top - start.height / 2;
      const sceneWidth = scene.offsetWidth;
      const centered = Math.abs(title.offsetLeft + title.offsetWidth / 2 - sticker.clientWidth * .75) <= 2
        && Math.abs(title.offsetTop + title.offsetHeight / 2 - sticker.clientHeight / 2) <= 2;
      const fits = title.offsetLeft >= sticker.clientWidth / 2
        && title.offsetLeft + title.offsetWidth <= sticker.clientWidth;
      seek(1580);
      const wipeHeight = parseFloat(getComputedStyle(node).clipPath.split(" ")[1]);
      seek(180);
      return {
        edge, sweepTravel, travelX, travelY, sceneWidth, wipeHeight,
        centered, fits, duration: release.effect.getComputedTiming().endTime,
        bounds: [start, apex, landing, end],
      };
    });
    assert.ok(motion.centered && motion.fits, "Loading is centered and fits inside the right half");
    assert.equal(motion.duration, 1850);
    assert.ok(motion.edge > 8 && motion.edge < 100, "the sticker unfurls");
    assert.ok(motion.sweepTravel > 40, "the loading highlight travels across the track");
    assert.ok(motion.travelX > motion.sceneWidth * .25, "the wolf crosses at least a quarter of the sticker");
    assert.ok(motion.travelY > motion.sceneWidth * .12, "the wolf drops into its landing position");
    assert.ok(motion.wipeHeight > 32 && motion.wipeHeight < 175, "the curved wipe reveals the page");
    for (const bounds of motion.bounds) {
      assert.ok(
        bounds.left >= 0 && bounds.top >= 0 && bounds.right <= width && bounds.bottom <= height,
        `wolf stays inside the ${width}×${height} viewport at y=${bounds.top.toFixed(1)}`,
      );
    }
    if (width === 1440) await page.screenshot({ path: path.join(output, "intro-unfurl.png") });
    await intro.evaluate(node => {
      for (const animation of node.getAnimations({ subtree: true })) animation.currentTime = 1100;
    });
    assert.ok(await intro.evaluate(node => {
      const content = node.firstElementChild.getBoundingClientRect();
      return content.left > 0 && content.top > 0 && content.right < innerWidth && content.bottom < innerHeight;
    }));
    await page.screenshot({ path: path.join(output, `intro-${width}.png`) });
    await intro.evaluate(node => {
      for (const animation of node.getAnimations({ subtree: true })) animation.play();
    });
    await intro.waitFor({ state: "hidden" });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }

  await page.getByRole("link", { name: "Internal page" }).click();
  assert.equal(new URL(page.url()).pathname, "/recruitment/membership");
  assert.equal(await intro.isVisible(), false);

  await page.reload({ waitUntil: "domcontentloaded" });
  await intro.waitFor({ state: "visible" });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await intro.waitFor({ state: "hidden" });

  await page.reload({ waitUntil: "domcontentloaded" });
  await intro.waitFor({ state: "visible" });
  await page.getByRole("textbox").focus();
  assert.equal(await page.getByRole("textbox").evaluate(node => node === document.activeElement), true);
  await intro.waitFor({ state: "hidden" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  assert.equal(await intro.isVisible(), false);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    localStorage.setItem("alpha-cookie-preferences", "true");
    localStorage.setItem("alpha-reduced-motion", "true");
  });
  await page.reload();
  assert.equal(await intro.isVisible(), false);
  await page.evaluate(() => localStorage.clear());

  await page.goto(origin + "/?nohydrate", { waitUntil: "domcontentloaded" });
  await intro.waitFor({ state: "visible" });
  await intro.waitFor({ state: "hidden", timeout: 3000 });

  await context.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await intro.waitFor({ state: "visible" });
  await intro.waitFor({ state: "hidden" });

  const nojs = await browser.newContext({ javaScriptEnabled: false });
  await nojs.route(origin + "/**", route => route.fulfill({ contentType: "text/html", body: baseMarkup }));
  const plain = await nojs.newPage();
  await plain.goto(origin);
  assert.equal(await plain.locator(selector).isVisible(), false);
  await plain.getByRole("heading", { name: "Page content" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("Mascot travel, loading sweep and wipe verified at 320, 390, 568 and 1440px, including navigation, history and accessibility fallbacks.");
} finally {
  await browser.close();
}

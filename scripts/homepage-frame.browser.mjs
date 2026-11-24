// Run against a running build with APP_URL=http://localhost:3000 node scripts/homepage-frame.browser.mjs.
import assert from "node:assert/strict"
import { chromium, devices } from "playwright"

const browser = await chromium.launch()
try {
  const page = await browser.newPage(devices["Pixel 7"])
  await page.goto(process.env.APP_URL ?? "http://localhost:3000")
  await page.locator(".alpha-page-loader").waitFor({ state: "hidden" })
  const frame = page.locator(".alpha-viewport-frame")
  assert.equal(await frame.getAttribute("aria-hidden"), "true")
  assert.equal(await frame.evaluate(node => getComputedStyle(node).pointerEvents), "none")

  async function assertAligned() {
    await page.waitForFunction(() => {
      const bounds = document.querySelector(".alpha-viewport-frame")?.getBoundingClientRect()
      if (!bounds || !window.visualViewport) return false
      const { offsetLeft, offsetTop, width, height } = window.visualViewport
      return Math.max(
        Math.abs(bounds.x - offsetLeft),
        Math.abs(bounds.y - offsetTop),
        Math.abs(bounds.width - width),
        Math.abs(bounds.height - height),
      ) < 1
    }, {}, { timeout: 3000 })
  }

  await assertAligned()
  await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }))
  await page.waitForFunction(() => scrollY >= 600)
  await assertAligned()

  const session = await page.context().newCDPSession(page)
  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.5 })
  await page.waitForFunction(() => window.visualViewport.scale > 1)
  await assertAligned()
  await page.evaluate(() => scrollTo({ top: 1200, behavior: "instant" }))
  await page.waitForFunction(() => scrollY >= 1200)
  await assertAligned()

  await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 })
  await page.setViewportSize({ width: 412, height: 700 })
  await assertAligned()
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }))
  await page.waitForFunction(() => scrollY === 0)
  await assertAligned()
  console.log("Homepage frame follows mobile scrolling, zoom and viewport resizing.")
} finally {
  await browser.close()
}

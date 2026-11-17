import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const require = createRequire(new URL('../package.json', import.meta.url))
const { transform, loadBindings } = require('next/dist/build/swc')
await loadBindings()
const { code } = await transform(await readFile(new URL('../src/lib/site-preferences.ts', import.meta.url), 'utf8'), {
  filename: 'site-preferences.ts', jsc: { parser: { syntax: 'typescript' } }, module: { type: 'commonjs' },
})

function setup({ saved = {}, systemReduced = false, blocked = false } = {}) {
  const values = new Map(Object.entries(saved))
  const listeners = new Map(), mediaListeners = new Set()
  const dataset = {}
  const media = { matches: systemReduced, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }
  const storage = {
    getItem(key) { if (blocked) throw Error('Storage blocked'); return values.get(key) ?? null },
    setItem(key, value) { if (blocked) throw Error('Storage blocked'); values.set(key, value) },
    removeItem(key) { if (blocked) throw Error('Storage blocked'); values.delete(key) },
  }
  const window = {
    matchMedia: () => media,
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn) },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn) },
    dispatchEvent(event) { for (const fn of listeners.get(event.type) ?? []) fn(event) },
  }
  const testModule = { exports: {} }
  const context = { module: testModule, exports: testModule.exports, window, document: { documentElement: { dataset } }, localStorage: storage, Event: class { constructor(type) { this.type = type } } }
  runInNewContext(code, context)
  return { api: testModule.exports, values, window, media, mediaListeners, dataset, context }
}

test('motion changes immediately without saving optional preferences by default', () => {
  const app = setup()
  let changes = 0
  const unsubscribe = app.api.subscribeToSitePreferences(() => changes++)
  app.api.updateSitePreferences({ reducedMotion: true })
  assert.equal(app.api.getReducedMotion(), true)
  assert.equal(app.dataset.reducedMotion, 'true')
  assert.equal(app.values.has(app.api.MOTION_PREFERENCE_KEY), false)
  assert.equal(changes, 1)
  app.api.updateSitePreferences({ reducedMotion: false })
  assert.equal(app.api.getReducedMotion(), false)
  unsubscribe()
  assert.equal(app.mediaListeners.size, 0)
})

test('opting in remembers the motion setting and opting out deletes it', () => {
  const app = setup()
  app.api.updateSitePreferences({ reducedMotion: true, rememberPreferences: true })
  const reload = setup({ saved: Object.fromEntries(app.values) })
  assert.equal(reload.api.getReducedMotion(), true)
  app.api.updateSitePreferences({ rememberPreferences: false })
  assert.equal(app.values.has(app.api.MOTION_PREFERENCE_KEY), false)
  assert.equal(app.api.getReducedMotion(), true, 'The current visit keeps its motion choice')
  assert.equal(setup({ saved: Object.fromEntries(app.values) }).api.getReducedMotion(), false)
})

test('device reduced motion is respected and changes live', () => {
  const app = setup({ systemReduced: true })
  const unsubscribe = app.api.subscribeToSitePreferences(() => {})
  app.api.updateSitePreferences({ reducedMotion: false })
  assert.equal(app.api.getReducedMotion(), true)
  app.media.matches = false
  for (const fn of app.mediaListeners) fn()
  assert.equal(app.api.getReducedMotion(), false)
  assert.equal(app.dataset.reducedMotion, 'false')
  unsubscribe()
})

test('blocked storage does not break the controls or startup', () => {
  const app = setup({ blocked: true })
  assert.doesNotThrow(() => runInNewContext(app.api.SITE_PREFERENCES_BOOTSTRAP, app.context))
  assert.doesNotThrow(() => app.api.updateSitePreferences({ reducedMotion: true, rememberPreferences: true }))
  assert.equal(app.api.getReducedMotion(), true)
})

test('another tab can revoke preference storage without leaving a stale motion override', () => {
  const app = setup({ saved: { 'alpha-cookie-preferences': 'true', 'alpha-reduced-motion': 'true' } })
  const unsubscribe = app.api.subscribeToSitePreferences(() => {})
  assert.equal(app.api.getReducedMotion(), true)
  app.values.clear()
  app.window.dispatchEvent({ type: 'storage', key: null })
  assert.equal(app.api.getReducedMotion(), false)
  assert.equal(app.api.getSitePreferences().rememberPreferences, false)
  unsubscribe()
})

test('the first frame uses only a consented motion preference or the device setting', () => {
  for (const [saved, systemReduced, expected] of [
    [{ 'alpha-reduced-motion': 'true' }, false, 'false'],
    [{ 'alpha-cookie-preferences': 'true', 'alpha-reduced-motion': 'true' }, false, 'true'],
    [{}, true, 'true'],
  ]) {
    const app = setup({ saved, systemReduced })
    runInNewContext(app.api.SITE_PREFERENCES_BOOTSTRAP, app.context)
    assert.equal(app.dataset.reducedMotion, expected)
  }
})

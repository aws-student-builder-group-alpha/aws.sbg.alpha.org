import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const require = createRequire(new URL('../package.json', import.meta.url))
const { transform, loadBindings } = require('next/dist/build/swc')
await loadBindings()
const { code } = await transform(await readFile(new URL('../src/lib/home-reload-scroll.ts', import.meta.url), 'utf8'), {
  filename: 'home-reload-scroll.ts', jsc: { parser: { syntax: 'typescript' } }, module: { type: 'commonjs' },
})
const compiled = { exports: {} }
new Function('module', 'exports', code)(compiled, compiled.exports)

function run({ type = 'reload', pathname = '/', hash = '', search = '', restoration = 'auto' } = {}) {
  const calls = [], listeners = new Map()
  const state = { nextRouterState: 'preserve' }
  const history = { state, scrollRestoration: restoration, replaceState(...args) { calls.push(['replace', ...args]) } }
  const window = { scrollTo(options) { calls.push(['scroll', { ...options }]) }, addEventListener(name, callback, options) { listeners.set(name, { callback, options }) } }
  runInNewContext(compiled.exports.HOME_RELOAD_SCROLL, { window, history, location: { pathname, hash, search }, performance: { getEntriesByType: () => type ? [{ type }] : [] } })
  return { calls, history, state, listeners }
}

test('a plain homepage reload disables native restoration and opens at the hero', () => {
  const app = run()
  assert.equal(app.history.scrollRestoration, 'manual')
  assert.deepEqual(app.calls, [['scroll', { top: 0, left: 0, behavior: 'instant' }]])
  app.listeners.get('pageshow').callback({ persisted: false })
  assert.equal(app.calls.length, 2, 'The final load also starts at the top')
})
test('a homepage reload removes a stale section hash while preserving query and router state', () => {
  const app = run({ hash: '#events', search: '?source=community' })
  assert.deepEqual(app.calls[0], ['replace', app.state, '', '/?source=community'])
  assert.equal(app.calls[1][0], 'scroll')
})
test('direct section links, back/forward visits, and other routes retain normal navigation', () => {
  for (const options of [{ type: 'navigate', hash: '#events' }, { type: 'back_forward', hash: '#members' }, { pathname: '/events', hash: '#past' }, { type: null }]) {
    const app = run(options)
    assert.equal(app.history.scrollRestoration, 'auto')
    assert.equal(app.calls.length, 0)
    assert.equal(app.listeners.size, 0)
  }
})
test('leaving the page restores browser history behavior and cached pages are not reset', () => {
  const app = run()
  app.listeners.get('pagehide').callback()
  assert.equal(app.history.scrollRestoration, 'auto')
  app.listeners.get('pageshow').callback({ persisted: true })
  assert.equal(app.calls.length, 1)
  assert.equal(app.listeners.get('pageshow').options.once, true)
})

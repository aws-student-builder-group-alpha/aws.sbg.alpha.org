import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

// Exercise the real hook's lifecycle while simulating the layout changes caused by pins.
const require = createRequire(new URL('../package.json', import.meta.url));
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const { code } = await transform(await readFile(new URL('../src/components/smooth-scroll.tsx', import.meta.url), 'utf8'), {
  filename: 'smooth-scroll.tsx', jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' },
});

function harness(reduced = false, pathname = '/', coarse = false) {
  const saved = Object.fromEntries(['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const effects = [], listeners = new Map(), frames = new Map(), calls = [];
  let nextFrame = 0, pins = [], smoothInstances = 0;
  const media = new Map();
  const team = { getBoundingClientRect: () => ({ top: 2000 - window.scrollY }) };
  const about = { getBoundingClientRect: () => ({ top: 1000 - window.scrollY }) };
  const add = (event, handler) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(handler); };
  const remove = (event, handler) => listeners.get(event)?.delete(handler);
  globalThis.window = { location: { hash: '#members' }, scrollY: 0, matchMedia: query => {
    if (!media.has(query)) media.set(query, { matches: query.includes('reduced') ? reduced : coarse,
      addEventListener: (_, handler) => add('media:' + query, handler), removeEventListener: (_, handler) => remove('media:' + query, handler) });
    return media.get(query);
  }, addEventListener: add, removeEventListener: remove,
    scrollTo(options) { calls.push({ method: 'native', ...options }); this.scrollY = options.top; } };
  globalThis.document = { fonts: { ready: Promise.resolve() }, getElementById: id => id === 'members' ? team : id === 'about' ? about : null,
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 80 }) }) };
  globalThis.requestAnimationFrame = fn => { frames.set(++nextFrame, fn); return nextFrame; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  class Lenis {
    constructor() { smoothInstances++; }
    on() {} off() {} raf() {} resize() {} destroy() { smoothInstances--; }
    scrollTo(top, options) { calls.push({ method: 'lenis', top, ...options }); window.scrollY = top; }
  }
  const dependencies = {
    react: { useEffect: callback => effects.push(callback), useRef: () => ({ current: null }) },
    'react/jsx-runtime': { Fragment: Symbol('fragment'), jsx: () => null },
    'next/navigation': { usePathname: () => pathname },
    'lenis/dist/lenis.css': {},
    lenis: { __esModule: true, default: Lenis },
    gsap: { __esModule: true, default: { registerPlugin() {}, ticker: { add() {}, remove() {}, lagSmoothing() {} } } },
    'gsap/ScrollTrigger': { ScrollTrigger: { getAll: () => pins, addEventListener: add, removeEventListener: remove, update() {} } },
  };
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => { if (!(name in dependencies)) throw Error('Unexpected dependency: ' + name); return dependencies[name]; }, compiledModule, compiledModule.exports);
  compiledModule.exports.default({ children: null });
  const cleanups = effects.map(effect => effect()).filter(value => typeof value === 'function');
  return {
    calls, team,
    get smoothInstances() { return smoothInstances; },
    setReduced(value) { const query = '(prefers-reduced-motion: reduce)'; media.get(query).matches = value; for (const handler of listeners.get('media:' + query) || []) handler(); },
    pin(start) { pins = [{ trigger: team, pin: team, start }]; },
    emit(event) { for (const handler of listeners.get(event) || []) handler(); },
    flush() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } },
    close() {
      for (const cleanup of cleanups) cleanup();
      assert.equal([...listeners.values()].reduce((sum, entries) => sum + entries.size, 0), 0);
      assert.equal(frames.size, 0);
      assert.equal(smoothInstances, 0);
      for (const [key, descriptor] of Object.entries(saved)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
    },
  };
}

test('a section link follows the final pin position after page navigation without restarting animations', () => {
  const app = harness(false, '/events');
  try {
    app.flush(); assert.equal(app.calls.at(-1).top, 1904);
    app.pin(6000); app.emit('refresh'); app.flush(); assert.equal(app.calls.at(-1).top, 5904);
    assert.equal(app.calls.at(-1).immediate, true);
    app.emit('wheel'); app.pin(8000); app.emit('refresh'); app.flush(); assert.equal(app.calls.at(-1).top, 5904, 'Manual scrolling stops alignment');
    window.location.hash = '#about'; app.emit('hashchange'); app.flush(); assert.equal(app.calls.at(-1).top, 904);
  } finally { app.close(); }
});

test('reduced motion uses native section navigation and tolerates missing or malformed hashes', () => {
  const app = harness(true);
  try {
    app.flush(); assert.deepEqual(app.calls.at(-1), { method: 'native', top: 1904, behavior: 'instant' });
    const count = app.calls.length;
    for (const hash of ['#missing', '#%E0%A4%A', '']) { window.location.hash = hash; app.emit('hashchange'); app.flush(); }
    assert.equal(app.calls.length, count);
  } finally { app.close(); }
});

test('homepage uses smooth scrolling and aligns compatibility anchors', () => {
  const app = harness();
  try {
    app.flush(); assert.deepEqual(app.calls.at(-1), { method: 'lenis', top: 1904, immediate: true, force: true });
    window.location.hash = '#about'; app.emit('hashchange'); app.flush();
    assert.deepEqual(app.calls.at(-1), { method: 'lenis', top: 904, immediate: true, force: true });
  } finally { app.close(); }
});

test('touch devices use native scrolling and changing motion preferences cleans up smoothing', () => {
  const touch = harness(false, '/', true);
  try { touch.flush(); assert.equal(touch.smoothInstances, 0); assert.equal(touch.calls.at(-1).method, 'native'); }
  finally { touch.close(); }
  const desktop = harness();
  try {
    assert.equal(desktop.smoothInstances, 1);
    desktop.setReduced(true); assert.equal(desktop.smoothInstances, 0);
    desktop.setReduced(false); assert.equal(desktop.smoothInstances, 1);
  } finally { desktop.close(); }
});

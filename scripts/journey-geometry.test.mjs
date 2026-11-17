import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(new URL('../package.json', import.meta.url))
const { transform, loadBindings } = require('next/dist/build/swc')
await loadBindings()
const { code } = await transform(await readFile(new URL('../src/app/(landing)/journey-geometry.ts', import.meta.url), 'utf8'), {
  filename: 'journey-geometry.ts', jsc: { parser: { syntax: 'typescript' } }, module: { type: 'commonjs' },
})
const compiled = { exports: {} }
new Function('module', 'exports', code)(compiled, compiled.exports)
const { wolfPose } = compiled.exports
const route = [
  { x: 500, y: 450, width: 500, scroll: 0 },
  { x: 160, y: 1400, width: 120, scroll: 1000 },
  { x: 700, y: 2400, width: 100, scroll: 2000 },
]

test('the traveling wolf reaches each measured anchor at its scroll checkpoint', () => {
  for (const point of route) {
    const pose = wolfPose(point.scroll, route, 1000)
    assert.equal(pose.width, point.width)
    assert.equal(pose.x + pose.width / 2, point.x)
    assert.ok(Math.abs(pose.y + pose.width * 4 / 9 + point.scroll - point.y) < .001)
  }
})
test('reversing scroll returns the wolf to the same position and scale', () => {
  const positions = [0, 250, 750, 1000, 1500, 2000]
  const forward = positions.map(scroll => wolfPose(scroll, route, 1000))
  for (const scroll of [...positions].reverse()) assert.deepEqual(wolfPose(scroll, route, 1000), forward[positions.indexOf(scroll)])
  assert.ok(forward[1].width < forward[0].width)
  assert.ok(forward[1].width > forward[3].width)
})
test('mobile poses stay within the viewport and missing checkpoints are safe', () => {
  for (let scroll = 0; scroll <= 2500; scroll += 100) {
    const pose = wolfPose(scroll, route, 320)
    assert.ok(pose.x >= 8)
    assert.ok(pose.width <= 304)
    assert.ok(pose.x + pose.width <= 312)
    assert.ok(Number.isFinite(pose.y))
  }
  assert.equal(wolfPose(0, [], 320), null)
  assert.ok(Number.isFinite(wolfPose(0, [route[0], { ...route[1], scroll: 0 }], 320).x))
})

test('overscroll cannot enlarge the mascot or shift it beyond the top pose', () => {
  const oversized = [{ ...route[0], width: 1200 }, route[1]]
  const top = wolfPose(0, oversized, 1720, 1000)
  assert.equal(top.width, 520)
  assert.deepEqual(wolfPose(-250, oversized, 1720, 1000), top)
  assert.ok(wolfPose(0, oversized, 1720, 600).width <= 330)
})

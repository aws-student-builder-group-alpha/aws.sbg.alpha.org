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

test('the mascot yields to headings and controls, including its rotated corners', () => {
  const { wolfCoversText } = compiled.exports
  const pose = { x: 100, y: 100, width: 100, rotation: 0, index: 0 }
  assert.equal(wolfCoversText(pose, [{ left: 150, right: 250, top: 100, bottom: 150 }]), true)
  assert.equal(wolfCoversText(pose, [{ left: 230, right: 300, top: 100, bottom: 150 }]), false)
  assert.equal(wolfCoversText(pose, [{ left: 230, right: 300, top: 100, bottom: 150 }], 40), true)
  assert.equal(wolfCoversText(pose, [{ left: 150, right: 150, top: 100, bottom: 150 }]), false)
})


test('the moving wolf steers around text, controls and team portraits', () => {
  const { safeWolfPose, wolfCoversText } = compiled.exports
  const desired = { x: 350, y: 300, width: 180, rotation: 12, index: 2 }
  const regions = [{ left: 280, right: 650, top: 200, bottom: 700 }]
  const pose = safeWolfPose(desired, regions, 1000, 1000)
  assert.ok(pose)
  assert.equal(wolfCoversText(pose, regions), false)
  assert.ok(pose.x + pose.width < 280 || pose.x > 650)
  assert.ok(pose.y >= 120 && pose.y + pose.width * 8 / 9 <= 890)
})
test('the wolf keeps moving with scroll rather than locking to a section anchor', () => {
  const { safeWolfPose } = compiled.exports
  const poses = [250, 500, 750].map(scroll => safeWolfPose(wolfPose(scroll, route, 1000), [], 1000, 1000))
  assert.notEqual(poses[0].x, poses[1].x)
  assert.notEqual(poses[1].x, poses[2].x)
})
test('a narrow viewport with no free space hides the wolf instead of covering content', () => {
  const { safeWolfPose } = compiled.exports
  assert.equal(safeWolfPose({ x: 50, y: 300, width: 120, rotation: 0, index: 1 }, [{ left: 0, right: 320, top: 96, bottom: 780 }], 320, 780), null)
})

test('the mascot stays beside whole photo and service panels, not inside their empty areas', () => {
  const { safeWolfPose, wolfCoversText } = compiled.exports
  const desired = { x: 800, y: 300, width: 110, rotation: 0, index: 1 }
  const content = [
    { left: 90, right: 630, top: 250, bottom: 650 },
    { left: 790, right: 1330, top: 200, bottom: 700 },
  ]
  const pose = safeWolfPose(desired, content, 1440, 1000)
  assert.ok(pose)
  assert.equal(wolfCoversText(pose, content), false)
  assert.ok(pose.x + pose.width <= 790 || pose.x >= 1330 || pose.y + pose.width * 8 / 9 <= 200 || pose.y >= 700)
})
test('the hero mascot uses an intermediate size when photos leave room for it', () => {
  const { safeWolfPose, wolfCoversText } = compiled.exports
  const desired = { x: 550, y: 250, width: 500, rotation: 0, index: 0 }
  const photos = [
    { left: 500, right: 650, top: 650, bottom: 800 },
    { left: 950, right: 1100, top: 200, bottom: 360 },
  ]
  const pose = safeWolfPose(desired, photos, 1400, 1000)
  assert.ok(pose && pose.width >= 250)
  assert.equal(wolfCoversText(pose, photos), false)
})

test('travel routes bend around a content block instead of crossing or fading through it', () => {
  const { wolfRoute, wolfSegmentClear } = compiled.exports
  const from = { x: 100, y: 300 }, to = { x: 800, y: 300 }
  const content = [{ left: 400, right: 600, top: 250, bottom: 500 }]
  assert.equal(wolfSegmentClear(from, to, 80, content), false)
  const path = wolfRoute(from, to, 80, content, 1200, 900, 80)
  assert.ok(path && path.length > 1)
  let previous = from
  for (const point of path) {
    assert.equal(wolfSegmentClear(previous, point, 80, content), true)
    previous = point
  }
  assert.deepEqual(previous, to)
})
test('sudden target reversals cannot teleport or abruptly resize the visible mascot', () => {
  const { stepWolfPose } = compiled.exports
  let pose = { x: 100, y: 300, width: 180, rotation: 0, index: 1 }
  for (const x of [1000, -1000, 900, 0, 800]) {
    const next = stepWolfPose(pose, { ...pose, x, y: x, width: 76, rotation: 5 }, 1 / 60)
    assert.ok(Math.hypot(next.x - pose.x, next.y - pose.y) <= 8.001)
    assert.ok(Math.abs(next.width - pose.width) <= 1.667)
    pose = next
  }
})
test('frame stalls are capped and motion remains consistent at 30 and 60 fps', () => {
  const { stepWolfPose } = compiled.exports
  const initial = { x: 100, y: 300, width: 180, rotation: 0, index: 1 }
  const target = { ...initial, x: 1000, width: 76 }
  assert.ok(stepWolfPose(initial, target, 5).x - initial.x <= 24)
  const simulate = fps => {
    let pose = initial
    for (let frame = 0; frame < fps; frame++) pose = stepWolfPose(pose, target, 1 / fps)
    return pose
  }
  assert.ok(Math.abs(simulate(30).x - simulate(60).x) < 2)
})

test('resizing a mascot preserves its visual center instead of shifting it into a corner', () => {
  const { resizeWolfPose } = compiled.exports
  const pose = { x: 1000, y: 300, width: 500, rotation: 0, index: 0 }
  const smaller = resizeWolfPose(pose, 280)
  assert.equal(smaller.x + smaller.width / 2, pose.x + pose.width / 2)
  assert.equal(smaller.y + smaller.width * 4 / 9, pose.y + pose.width * 4 / 9)
  assert.deepEqual(resizeWolfPose(smaller, 500), pose)
})

test('a viewport resize lets the mascot travel back on screen around content', () => {
  const { wolfRoute, wolfSegmentClear } = compiled.exports
  const from = { x: 1100, y: 300 }, to = { x: 20, y: 300 }
  const content = [{ left: 200, right: 300, top: 200, bottom: 500 }]
  const path = wolfRoute(from, to, 80, content, 320, 780)
  assert.ok(path)
  let previous = from
  for (const point of path) {
    assert.equal(wolfSegmentClear(previous, point, 80, content), true)
    previous = point
  }
  assert.deepEqual(previous, to)
})

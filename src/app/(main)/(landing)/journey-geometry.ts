export interface WolfStop {
  x: number
  y: number
  width: number
  scroll: number
}

/** Interpolate document-space checkpoints, then place the wolf in the viewport. */
export function wolfPose(scroll: number, stops: WolfStop[], viewportWidth: number, viewportHeight = Infinity) {
  if (!stops.length) return null
  const position = Math.max(0, scroll)
  let index = 0
  while (index < stops.length - 2 && position > stops[index + 1].scroll) index++
  const from = stops[index]
  const to = stops[index + 1] ?? from
  const distance = to.scroll - from.scroll
  const progress = distance > 0 ? Math.max(0, Math.min(1, (position - from.scroll) / distance)) : 0
  const mix = (a: number, b: number) => a + (b - a) * progress
  const width = Math.min(mix(from.width, to.width), 520, Math.max(1, viewportWidth - 16), Math.max(1, viewportHeight * .55))
  const arc = Math.sin(progress * Math.PI)
  return {
    x: Math.max(8, Math.min(viewportWidth - width - 8, mix(from.x, to.x) - width / 2)),
    y: mix(from.y, to.y) - position - width * 4 / 9 - arc * Math.min(65, viewportWidth * .08),
    width,
    rotation: Math.sin(progress * Math.PI * 2) * 16,
    index: progress < .5 ? index : Math.min(index + 1, stops.length - 1),
  }
}

export interface ReadingArea { left: number; top: number; right: number; bottom: number }

/** Include a margin so the mascot fades before its rotated bounds reach text. */
export function wolfCoversText(pose: NonNullable<ReturnType<typeof wolfPose>>, regions: ReadingArea[], lean = 0) {
  const radians = (pose.rotation + lean) * Math.PI / 180
  const height = pose.width * 8 / 9
  const halfWidth = (Math.abs(Math.cos(radians)) * pose.width + Math.abs(Math.sin(radians)) * height) / 2
  const halfHeight = (Math.abs(Math.sin(radians)) * pose.width + Math.abs(Math.cos(radians)) * height) / 2
  const centerX = pose.x + pose.width / 2
  const centerY = pose.y + height / 2
  return regions.some(rect => rect.right > rect.left && rect.bottom > rect.top &&
    centerX + halfWidth + 28 > rect.left && centerX - halfWidth - 28 < rect.right &&
    centerY + halfHeight + 28 > rect.top && centerY - halfHeight - 28 < rect.bottom)
}

/** Steer the moving mascot into open space without covering copy or controls. */
export function safeWolfPose(desired: NonNullable<ReturnType<typeof wolfPose>>, regions: ReadingArea[], viewportWidth: number, viewportHeight: number, headerBottom = 96, previous?: NonNullable<ReturnType<typeof wolfPose>>) {
  const top = headerBottom + 24
  const bottom = viewportHeight - 110
  const obstacles = regions.filter(rect => rect.bottom > top && rect.top < bottom && rect.right > 0 && rect.left < viewportWidth)
  let best: typeof desired | null = null
  let cost = Infinity
  for (const width of [...new Set([desired.width, desired.width * .8, desired.width * .65, desired.width * .5, Math.min(desired.width, 144), Math.min(desired.width, 104), Math.min(desired.width, 76)])].filter(width => width >= Math.min(76, desired.width))) {
    const height = width * 8 / 9
    if (height > bottom - top || width > viewportWidth - 32) continue
    const clampX = (x: number) => Math.max(16, Math.min(viewportWidth - width - 16, x))
    const clampY = (y: number) => Math.max(top, Math.min(bottom - height, y))
    const idealX = clampX(desired.x + (desired.width - width) / 2)
    const idealY = clampY(desired.y + (desired.width - width) * 4 / 9)
    const clearance = 40 + width * .06
    const xs = [...new Set([idealX, 16, viewportWidth - width - 16, ...obstacles.flatMap(rect => [rect.left - width - clearance, rect.right + clearance])].map(clampX))]
    const ys = [...new Set([idealY, top, bottom - height, ...obstacles.flatMap(rect => [rect.top - height - clearance, rect.bottom + clearance])].map(clampY))]
    for (const x of xs) for (const y of ys) {
      const pose = { ...desired, x, y, width, rotation: Math.max(-5, Math.min(5, desired.rotation)) }
      if (wolfCoversText(pose, obstacles)) continue
      const continuity = previous ? Math.hypot(x - previous.x, y - previous.y) * .8 + Math.abs(width - previous.width) : 0
      const score = Math.hypot(x + width / 2 - (desired.x + desired.width / 2), y + height / 2 - (desired.y + desired.width * 4 / 9)) + (1 - width / desired.width) * 300 + continuity
      if (score < cost) { best = pose; cost = score }
    }
  }
  return best
}

export type WolfPose = NonNullable<ReturnType<typeof wolfPose>>
export interface WolfPoint { x: number; y: number }

export function resizeWolfPose(pose: WolfPose, width: number): WolfPose {
  return { ...pose, x: pose.x + (pose.width - width) / 2, y: pose.y + (pose.width - width) * 4 / 9, width }
}

function wolfObstacles(width: number, regions: ReadingArea[]) {
  const padding = 28 + width * .06
  return regions.filter(rect => rect.right > rect.left && rect.bottom > rect.top).map(rect => ({
    left: rect.left - width - padding, right: rect.right + padding,
    top: rect.top - width * 8 / 9 - padding, bottom: rect.bottom + padding,
  }))
}

function inside(point: WolfPoint, rect: ReadingArea) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
}

/** Test the entire movement segment, not just its destination. */
function hitsRect(from: WolfPoint, to: WolfPoint, rect: ReadingArea) {
  let enter = 0, leave = 1
  for (const [start, delta, min, max] of [[from.x, to.x - from.x, rect.left, rect.right], [from.y, to.y - from.y, rect.top, rect.bottom]]) {
    if (Math.abs(delta) < .0001) { if (start < min || start > max) return false; continue }
    const first = (min - start) / delta, last = (max - start) / delta
    enter = Math.max(enter, Math.min(first, last))
    leave = Math.min(leave, Math.max(first, last))
    if (enter > leave) return false
  }
  return true
}

export function wolfSegmentClear(from: WolfPoint, to: WolfPoint, width: number, regions: ReadingArea[]) {
  return !wolfObstacles(width, regions).some(rect => hitsRect(from, to, rect))
}

/** A short visibility-graph route goes around content instead of fading through it. */
export function wolfRoute(from: WolfPoint, to: WolfPoint, width: number, regions: ReadingArea[], viewportWidth: number, viewportHeight: number, headerBottom = 96): WolfPoint[] | null {
  const obstacles = wolfObstacles(width, regions)
  const minX = Math.min(8, from.x), maxX = Math.max(viewportWidth - width - 8, from.x)
  const minY = Math.min(headerBottom + 24, from.y), maxY = Math.max(viewportHeight - width * 8 / 9 - 110, from.y)
  const corners = obstacles.flatMap(rect => [
    { x: rect.left - 1, y: rect.top - 1 }, { x: rect.right + 1, y: rect.top - 1 },
    { x: rect.left - 1, y: rect.bottom + 1 }, { x: rect.right + 1, y: rect.bottom + 1 },
  ]).filter(point => point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY && !obstacles.some(rect => inside(point, rect)))
  const nodes = [from, to, ...corners]
  const distance = nodes.map(() => Infinity), parent = nodes.map(() => -1), visited = new Set<number>()
  distance[0] = 0
  for (let iteration = 0; iteration < nodes.length; iteration++) {
    let current = -1
    for (let index = 0; index < nodes.length; index++) if (!visited.has(index) && (current < 0 || distance[index] < distance[current])) current = index
    if (current < 0 || !Number.isFinite(distance[current])) return null
    if (current === 1) {
      const path: WolfPoint[] = []
      for (let index = 1; index !== 0; index = parent[index]) path.unshift(nodes[index])
      return path
    }
    visited.add(current)
    for (let next = 0; next < nodes.length; next++) {
      if (visited.has(next)) continue
      // Moving content may touch the current position: allow an exit, never an entry.
      const blocked = obstacles.some(rect => !(current === 0 && inside(from, rect)) && hitsRect(nodes[current], nodes[next], rect))
      if (blocked) continue
      const cost = distance[current] + Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y)
      if (cost < distance[next]) { distance[next] = cost; parent[next] = current }
    }
  }
  return null
}

/** Frame-rate independent limits prevent target changes from producing visible jumps. */
export function stepWolfPose(from: WolfPose, to: WolfPose, elapsed: number): WolfPose {
  const seconds = Math.max(0, Math.min(elapsed, .05))
  const dx = to.x - from.x, dy = to.y - from.y, distance = Math.hypot(dx, dy)
  const travel = Math.min(distance, 480 * seconds, distance * (1 - Math.exp(-10 * seconds)))
  const approach = (value: number, target: number, speed: number) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), speed * seconds)
  return {
    ...to, x: from.x + (distance ? dx / distance * travel : 0), y: from.y + (distance ? dy / distance * travel : 0),
    width: approach(from.width, to.width, 100), rotation: approach(from.rotation, to.rotation, 60),
  }
}

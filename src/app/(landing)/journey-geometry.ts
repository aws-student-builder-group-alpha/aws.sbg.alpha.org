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
export function safeWolfPose(desired: NonNullable<ReturnType<typeof wolfPose>>, regions: ReadingArea[], viewportWidth: number, viewportHeight: number, headerBottom = 96) {
  const top = headerBottom + 24
  const bottom = viewportHeight - 110
  const obstacles = regions.filter(rect => rect.bottom > top && rect.top < bottom && rect.right > 0 && rect.left < viewportWidth)
  let best: typeof desired | null = null
  let cost = Infinity
  for (const width of [...new Set([desired.width, Math.min(desired.width, 144), Math.min(desired.width, 104), Math.min(desired.width, 76)])]) {
    const height = width * 8 / 9
    if (height > bottom - top || width > viewportWidth - 32) continue
    const clampX = (x: number) => Math.max(16, Math.min(viewportWidth - width - 16, x))
    const clampY = (y: number) => Math.max(top, Math.min(bottom - height, y))
    const idealX = clampX(desired.x + (desired.width - width) / 2)
    const idealY = clampY(desired.y + (desired.width - width) * 4 / 9)
    const xs = [...new Set([idealX, 16, viewportWidth - width - 16, ...obstacles.flatMap(rect => [rect.left - width - 40, rect.right + 40])].map(clampX))]
    const ys = [...new Set([idealY, top, bottom - height, ...obstacles.flatMap(rect => [rect.top - height - 40, rect.bottom + 40])].map(clampY))]
    for (const x of xs) for (const y of ys) {
      const pose = { ...desired, x, y, width, rotation: Math.max(-5, Math.min(5, desired.rotation)) }
      if (wolfCoversText(pose, obstacles)) continue
      const score = Math.hypot(x + width / 2 - (desired.x + desired.width / 2), y + height / 2 - (desired.y + desired.width * 4 / 9)) + (1 - width / desired.width) * 180
      if (score < cost) { best = pose; cost = score }
    }
  }
  return best
}

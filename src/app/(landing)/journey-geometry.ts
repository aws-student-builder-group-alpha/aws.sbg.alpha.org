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

export interface WolfStop {
  x: number
  y: number
  width: number
  scroll: number
}

/** Interpolate document-space checkpoints, then place the wolf in the viewport. */
export function wolfPose(scroll: number, stops: WolfStop[], viewportWidth: number) {
  if (!stops.length) return null
  let index = 0
  while (index < stops.length - 2 && scroll > stops[index + 1].scroll) index++
  const from = stops[index]
  const to = stops[index + 1] ?? from
  const distance = to.scroll - from.scroll
  const progress = distance > 0 ? Math.max(0, Math.min(1, (scroll - from.scroll) / distance)) : 0
  const mix = (a: number, b: number) => a + (b - a) * progress
  const width = Math.min(mix(from.width, to.width), Math.max(1, viewportWidth - 16))
  const arc = Math.sin(progress * Math.PI)
  return {
    x: Math.max(8, Math.min(viewportWidth - width - 8, mix(from.x, to.x) - width / 2)),
    y: mix(from.y, to.y) - scroll - width * 4 / 9 - arc * Math.min(65, viewportWidth * .08),
    width,
    rotation: Math.sin(progress * Math.PI * 2) * 16,
    index: progress < .5 ? index : Math.min(index + 1, stops.length - 1),
  }
}

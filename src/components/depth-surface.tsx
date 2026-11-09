'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/** Decorative pointer depth. Content and actions never depend on hover. */
export default function DepthSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let x = 0, y = 0
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0
      element.style.setProperty('--depth-x', '0deg')
      element.style.setProperty('--depth-y', '0deg')
      element.style.setProperty('--depth-lift', '0px')
    }
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return
      const box = element.getBoundingClientRect()
      x = Math.max(-.5, Math.min(.5, (event.clientX-box.left)/box.width-.5))
      y = Math.max(-.5, Math.min(.5, (event.clientY-box.top)/box.height-.5))
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        element.style.setProperty('--depth-x', (-y*6)+'deg')
        element.style.setProperty('--depth-y', (x*8)+'deg')
        element.style.setProperty('--depth-lift', '-6px')
      })
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', reset)
    element.addEventListener('pointercancel', reset)
    media.addEventListener('change', reset)
    return () => {
      reset()
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', reset)
      element.removeEventListener('pointercancel', reset)
      media.removeEventListener('change', reset)
    }
  }, [])
  return <div ref={ref} className={'alpha-depth '+className}>{children}</div>
}

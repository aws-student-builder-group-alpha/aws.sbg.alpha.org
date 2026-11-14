'use client'

import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const positions = [[-.36, -.27], [.31, -.3], [-.14, .22], [.4, .25], [-.34, .32], [.08, -.08]]
const clamp = (value: number) => Math.max(0, Math.min(1, value))

/** Scroll advances a projected camera; no timer, render loop or React updates per frame. */
export function useGalleryZoom(root: RefObject<HTMLDivElement | null>, enabled: boolean, identity: string) {
  useLayoutEffect(() => {
    const gallery = root.current
    if (!gallery || !enabled) return
    const stage = gallery.querySelector<HTMLElement>('.gallery-grid')
    const cards = [...gallery.querySelectorAll<HTMLElement>('.gallery-item')]
    if (!stage || !cards.length) return

    const media = gsap.matchMedia(gallery)
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const originals = cards.map(card => ({
        style: card.getAttribute('style'),
        button: card.querySelector<HTMLButtonElement>('.gallery-trigger'),
        tabindex: card.querySelector('.gallery-trigger')?.getAttribute('tabindex') ?? null,
      }))
      gallery.dataset.zoomGallery = ''
      let width = 1, height = 1
      let sizes: { width: number; height: number }[] = []
      const visibleStates: boolean[] = [], interactiveStates: boolean[] = []
      let lastProgress = -1
      const measure = () => {
        width = stage.clientWidth
        height = stage.clientHeight
        sizes = cards.map(card => ({ width: card.offsetWidth, height: card.offsetHeight }))
      }
      const travel = 1600 + (cards.length - 1) * 320 + 900

      const render = (progress: number, force = false) => {
        if (!force && progress === lastProgress) return
        lastProgress = progress
        gallery.style.setProperty('--zoom-progress', String(progress))
        cards.forEach((card, index) => {
          const z = -1600 - index * 320 + progress * travel
          const final = index === cards.length - 1
          const fit = Math.min(width * .96 / sizes[index].width, height * .94 / sizes[index].height)
          const scale = final ? Math.min(fit, 1000 / Math.max(100, 1000 - z)) : z < 800 ? 1000 / (1000 - z) : 0
          const opacity = scale ? clamp((z + 8200) / 1800) * (final ? 1 : clamp((800 - z) / 350)) : 0
          const position = index === cards.length - 1 ? [0, 0] : positions[index % positions.length]
          const x = position[0] * width * 2.4 * scale
          const y = position[1] * height * 2 * scale
          const halfWidth = sizes[index].width * scale / 2
          const halfHeight = sizes[index].height * scale / 2
          const onScreen = opacity > .025 && Math.abs(x) < width / 2 + halfWidth && Math.abs(y) < height / 2 + halfHeight
          const interactive = onScreen && opacity > .15 && halfWidth >= 22
          if (onScreen) {
            card.style.transform = `translate3d(calc(-50% + ${x}px),calc(-50% + ${y}px),0) scale(${scale})`
            card.style.opacity = String(opacity)
          }
          if (visibleStates[index] !== onScreen) {
            visibleStates[index] = onScreen
            card.style.visibility = onScreen ? 'visible' : 'hidden'
          }
          if (interactiveStates[index] !== interactive) {
            interactiveStates[index] = interactive
            card.style.pointerEvents = interactive ? 'auto' : 'none'
            if (originals[index].button) originals[index].button.tabIndex = interactive ? 0 : -1
          }
        })
      }

      measure()
      cards.forEach((card, index) => { card.style.zIndex = String(cards.length - index) })
      const trigger = ScrollTrigger.create({
        trigger: gallery,
        pin: gallery,
        start: 'top 100px',
        end: () => `+=${Math.max(700, Math.min(3600, cards.length * 160))}`,
        scrub: true,
        // Sort every refresh in document order, including pins created by sibling effects.
        refreshPriority: 0,
        invalidateOnRefresh: true,
        onRefresh: self => { measure(); render(self.progress, true) },
        onUpdate: self => render(self.progress),
      })
      render(trigger.progress)

      return () => {
        trigger.kill(true)
        delete gallery.dataset.zoomGallery
        gallery.style.removeProperty('--zoom-progress')
        cards.forEach((card, index) => {
          const original = originals[index]
          if (original.style === null) card.removeAttribute('style')
          else card.setAttribute('style', original.style)
          if (original.button) {
            if (original.tabindex === null) original.button.removeAttribute('tabindex')
            else original.button.setAttribute('tabindex', original.tabindex)
          }
        })
      }
    })
    return () => media.revert()
  }, [root, enabled, identity])
}

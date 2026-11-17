import type { CSSProperties } from "react"

/** A dedicated color boundary keeps the scroll sweep clear of section content. */
export default function SceneTransition({ from, to }: { from: string; to: string }) {
  return <div className="alpha-scene-transition" aria-hidden="true" style={{ "--scene-from": from, "--scene-to": to } as CSSProperties}><span className="alpha-transition-fill" /></div>
}

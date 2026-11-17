const LETTERS: Record<string, string[]> = {
 A: ["01110", "11011", "11011", "11111", "11011", "11011", "11011"],
 L: ["11000", "11000", "11000", "11000", "11000", "11000", "11111"],
 P: ["11110", "11011", "11011", "11110", "11000", "11000", "11000"],
 H: ["11011", "11011", "11011", "11111", "11011", "11011", "11011"],
}

export function PixelAlpha() {
 return <svg className="alpha-pixel-wordmark" viewBox="0 0 29 7" fill="currentColor" aria-hidden="true" shapeRendering="crispEdges">
  {Array.from("ALPHA").flatMap((letter, column) => LETTERS[letter].flatMap((row, y) => Array.from(row).map((pixel, x) => pixel === "1" ? <rect key={`${column}-${x}-${y}`} x={column * 6 + x} y={y} width="1" height="1" /> : null)))}
 </svg>
}

export function PixelCloud({ className = "" }: { className?: string }) {
 return <svg className={className} viewBox="0 0 32 20" fill="none" aria-hidden="true" shapeRendering="crispEdges">
  <path d="M10 2H20V5H24V8H28V11H31V17H28V20H3V17H0V11H3V8H7V5H10V2Z" fill="currentColor" fillOpacity=".08" />
  <path d="M10 2H20V5H24V8H28V11H31V17H28V20H3V17H0V11H3V8H7V5H10V2Z" stroke="currentColor" strokeWidth="1" />
  <path d="M7 13H10V16H7V13ZM20 13H23V16H20V13Z" fill="currentColor" />
 </svg>
}

export function PixelWorld() {
 return <div className="alpha-pixel-world" aria-hidden="true">
  <div className="alpha-pixel-grid" />
  <PixelCloud className="alpha-pixel-cloud alpha-pixel-cloud-one" />
  <PixelCloud className="alpha-pixel-cloud alpha-pixel-cloud-two" />
  <span className="alpha-pixel-spark alpha-pixel-spark-one" />
  <span className="alpha-pixel-spark alpha-pixel-spark-two" />
  <span className="alpha-pixel-spark alpha-pixel-spark-three" />
  <span className="alpha-pixel-stairs" />
  <span className="alpha-pixel-coordinate">CLOUD WORLD / 01</span>
 </div>
}

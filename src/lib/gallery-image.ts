export function galleryImage(src: string, variant: "card" | "full") {
  if (!src.startsWith("/gallery/")) return src
  const filename = src.slice("/gallery/".length).replace(/\.[^.]+$/, ".webp")
  return "/optimized/gallery/" + variant + "/" + filename
}

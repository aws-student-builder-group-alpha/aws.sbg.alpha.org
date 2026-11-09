import { mkdir, readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const publicRoot = path.join(project, "public")
let sourceBytes = 0
let outputBytes = 0
let outputFiles = 0

async function exportImage(source, destination, width, quality = 80) {
  await mkdir(path.dirname(destination), { recursive: true })
  const image = sharp(source).rotate().resize({ width, withoutEnlargement: true })
  if (destination.endsWith(".png")) await image.png({ compressionLevel: 9 }).toFile(destination)
  else await image.webp({ quality, effort: 5 }).toFile(destination)
  outputBytes += (await stat(destination)).size
  outputFiles += 1
}

async function optimize(source, destination, width, quality) {
  sourceBytes += (await stat(source)).size
  await exportImage(source, destination, width, quality)
}

const logo = path.join(publicRoot, "Logo (2).png")
const output = path.join(publicRoot, "optimized")
await optimize(logo, path.join(output, "alpha-logo.webp"), 256, 88)
await exportImage(logo, path.join(output, "favicon.png"), 48)
await exportImage(logo, path.join(output, "apple-touch-icon.png"), 180)
await optimize(path.join(publicRoot, "Banner.png"), path.join(output, "banner.webp"), 1640, 84)

for (const filename of await readdir(path.join(publicRoot, "board-members"))) {
  if (!filename.endsWith(".webp")) continue
  await optimize(path.join(publicRoot, "board-members", filename), path.join(output, "board-members", filename), 768, 82)
}

const stories = JSON.parse(await readFile(path.join(project, "src/data/community-stories.json"), "utf8"))
const galleryPhotos = new Set(stories.flatMap(story => story.images.map(image => image.src)).filter(src => src.startsWith("/gallery/")))
for (const src of galleryPhotos) {
  const source = path.join(publicRoot, src)
  const filename = path.basename(src, path.extname(src)) + ".webp"
  await optimize(source, path.join(output, "gallery/card", filename), 960, 80)
  await exportImage(source, path.join(output, "gallery/full", filename), 1600, 84)
}

const recruitmentArg = process.argv.indexOf("--recruitment-root")
if (recruitmentArg !== -1) {
  const brand = path.resolve(process.argv[recruitmentArg + 1], "public/brand")
  const recruitmentLogo = path.join(brand, "alpha-logo.png")
  await optimize(recruitmentLogo, path.join(brand, "alpha-logo.webp"), 256, 88)
  await exportImage(recruitmentLogo, path.join(brand, "alpha-icon.png"), 48)
  await exportImage(recruitmentLogo, path.join(brand, "apple-icon.png"), 180)
  await optimize(path.join(brand, "day-one-banner.png"), path.join(brand, "day-one-banner.webp"), 1640, 84)
}

console.log(JSON.stringify({ outputFiles, sourceBytes, outputBytes }))

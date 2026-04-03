/**
 * One-time / CI: generates PWA icons under public/icons/.
 * Uses public/rayenna_logo.jpg or .png when present; otherwise a Zenith "Z" placeholder.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconsDir = join(publicDir, 'icons')

function findLogo() {
  for (const name of ['rayenna_logo.jpg', 'rayenna_logo.jpeg', 'rayenna_logo.png']) {
    const p = join(publicDir, name)
    if (existsSync(p)) return p
  }
  return null
}

async function basePipelineFromLogo(logoPath) {
  return sharp(logoPath).ensureAlpha().resize(512, 512, { fit: 'contain', background: { r: 10, g: 10, b: 15, alpha: 1 } })
}

async function basePipelinePlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#0A0A0F"/>
    <text x="50%" y="54%" text-anchor="middle" font-size="220" fill="#F5A623" font-family="system-ui,sans-serif" font-weight="700">Z</text>
  </svg>`
  return sharp(Buffer.from(svg)).resize(512, 512)
}

async function writeMaskable512(from512Buffer) {
  const padded = await sharp(from512Buffer)
    .resize(432, 432, { fit: 'cover' })
    .extend({
      top: 40,
      bottom: 40,
      left: 40,
      right: 40,
      background: { r: 10, g: 10, b: 15, alpha: 1 },
    })
    .resize(512, 512)
    .png()
    .toBuffer()
  return padded
}

async function main() {
  mkdirSync(iconsDir, { recursive: true })
  const logoPath = findLogo()
  const base512 = logoPath
    ? await basePipelineFromLogo(logoPath).then((p) => p.png().toBuffer())
    : await basePipelinePlaceholder().png().toBuffer()

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
  for (const size of sizes) {
    await sharp(base512).resize(size, size).png().toFile(join(iconsDir, `icon-${size}x${size}.png`))
  }

  const maskable512 = await writeMaskable512(base512)
  await sharp(maskable512).resize(192, 192).png().toFile(join(iconsDir, 'icon-maskable-192x192.png'))
  await sharp(maskable512).png().toFile(join(iconsDir, 'icon-maskable-512x512.png'))

  await sharp(base512).resize(180, 180).png().toFile(join(iconsDir, 'apple-touch-icon.png'))

  console.log(logoPath ? `PWA icons generated from ${logoPath}` : 'PWA icons generated (placeholder Z — add public/rayenna_logo.jpg for branded icons)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

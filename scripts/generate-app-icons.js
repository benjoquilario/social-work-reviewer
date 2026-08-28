/**
 * Regenerates the app icon set from assets/images/logo.png.
 *
 * The logo is neon artwork on near-black, which makes the alpha channel easy
 * to recover: the backdrop is black, so a pixel's brightest channel IS its
 * coverage. Keying on that and un-premultiplying against black gives a clean
 * cutout of the mark — glow included — that composites onto any brand surface
 * without a grey halo.
 *
 * The source is a wide lockup (mark above a wordmark), so the mark is measured
 * on its own, cut out, and re-centered on a square canvas rather than
 * square-cropped in place — a centered square crop would either swallow the
 * wordmark or leave the mark sitting low in the frame.
 *
 * Run: node scripts/generate-app-icons.js
 */
const fs = require("fs")
const path = require("path")
const { PNG } = require("pngjs")

const ROOT = path.join(__dirname, "..")
const IMAGES = path.join(ROOT, "assets", "images")
const SOURCE = path.join(IMAGES, "logo.png")

/** BRAND.ink from lib/theme.ts — the near-black the logo is set on. */
const INK = [0x01, 0x06, 0x0d]
/** Everything below this fraction of the height is wordmark, not mark. */
const WORDMARK_TOP_RATIO = 0.71
/**
 * A pixel counts as solid artwork above this. Set high enough that the outer
 * glow does not inflate the bounds — at the glow's own level the mark measures
 * 1136px wide instead of its true 793px.
 */
const SOLID_THRESHOLD = 180
/** Glow kept around the solid artwork, as a fraction of its longest side. */
const GLOW_MARGIN = 0.17
/** Alpha below which un-premultiplication stops (see `sampleRect`). */
const UNPREMULTIPLY_FLOOR = 48

/** Bounding box of the solid artwork above the wordmark. */
function findMarkRect({ width, height, data }) {
  const limit = Math.floor(height * WORDMARK_TOP_RATIO)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < limit; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) << 2
      if (Math.max(data[i], data[i + 1], data[i + 2]) < SOLID_THRESHOLD) {
        continue
      }
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  const margin = Math.round(Math.max(maxX - minX, maxY - minY) * GLOW_MARGIN)
  const top = minY - margin
  // The bottom is clamped instead of padded: below the mark is the wordmark,
  // and above it is empty backdrop that costs nothing to include.
  const bottom = Math.min(maxY + margin, limit)

  return {
    left: minX - margin,
    top,
    width: maxX - minX + margin * 2,
    height: bottom - top,
    /** Backdrop kept on each side, in source pixels — the feather budget. */
    margins: {
      left: margin,
      right: margin,
      top: minY - top,
      bottom: bottom - maxY,
    },
  }
}

/**
 * Fades alpha to zero across each edge's backdrop margin.
 *
 * Without this the cutout carries a hard rectangular seam: the source's
 * backdrop is not pure black near the mark — it holds a faint blue cast from
 * the glow — so the sampled rect ends in a visible step against flat ink.
 * The bands only ever cover backdrop, never the solid artwork.
 */
function featherEdges(image, bands) {
  const ramp = (distance, band) =>
    band <= 0 ? 1 : Math.min(1, Math.max(0, distance / band))

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (image.width * y + x) << 2
      if (image.data[i + 3] === 0) continue

      const falloff = Math.min(
        ramp(x, bands.left),
        ramp(image.width - 1 - x, bands.right),
        ramp(y, bands.top),
        ramp(image.height - 1 - y, bands.bottom)
      )

      // Smoothstep, so the fade has no visible banding of its own.
      const eased = falloff * falloff * (3 - 2 * falloff)
      image.data[i + 3] = Math.round(image.data[i + 3] * eased)
    }
  }

  return image
}

/**
 * Box-filter `rect` from the source down to `width`×`height`.
 *
 * With `keyAlpha`, alpha is recovered from the black backdrop and the color is
 * un-premultiplied so the cutout keeps the artwork's full saturation.
 * Otherwise the result is opaque over `INK`.
 */
function sampleRect(source, rect, width, height, { keyAlpha }) {
  const out = new PNG({ width, height })
  const stepX = rect.width / width
  const stepY = rect.height / height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(rect.left + x * stepX)
      const y0 = Math.floor(rect.top + y * stepY)
      const x1 = Math.max(x0 + 1, Math.floor(rect.left + (x + 1) * stepX))
      const y1 = Math.max(y0 + 1, Math.floor(rect.top + (y + 1) * stepY))

      let r = 0
      let g = 0
      let b = 0
      let n = 0

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          n++
          // Outside the source is backdrop, which is black — contributes zero.
          if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) {
            continue
          }
          const i = (source.width * sy + sx) << 2
          r += source.data[i]
          g += source.data[i + 1]
          b += source.data[i + 2]
        }
      }

      r /= n
      g /= n
      b /= n

      const o = (width * y + x) << 2
      if (keyAlpha) {
        const alpha = Math.max(r, g, b)
        // Un-premultiply, but stop dividing once alpha gets very low: at
        // alpha≈1 the division is pure noise amplification and turns the
        // faintest glow into confetti. Below the floor the glow simply stays
        // dim, which is what it looks like over ink anyway.
        const scale = alpha > 0 ? 255 / Math.max(alpha, UNPREMULTIPLY_FLOOR) : 0
        out.data[o] = Math.min(255, Math.round(r * scale))
        out.data[o + 1] = Math.min(255, Math.round(g * scale))
        out.data[o + 2] = Math.min(255, Math.round(b * scale))
        out.data[o + 3] = Math.round(alpha)
      } else {
        out.data[o] = Math.round(r + INK[0] * (1 - Math.max(r, g, b) / 255))
        out.data[o + 1] = Math.round(g + INK[1] * (1 - Math.max(r, g, b) / 255))
        out.data[o + 2] = Math.round(b + INK[2] * (1 - Math.max(r, g, b) / 255))
        out.data[o + 3] = 255
      }
    }
  }

  return out
}

/** Centers `image` on a square canvas, scaled to `scale` of the canvas. */
function centerOnSquare(image, size, scale, background) {
  const out = new PNG({ width: size, height: size })

  if (background) {
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = background[0]
      out.data[i + 1] = background[1]
      out.data[i + 2] = background[2]
      out.data[i + 3] = 255
    }
  }

  const box = size * scale
  const ratio = Math.min(box / image.width, box / image.height)
  const drawWidth = Math.round(image.width * ratio)
  const drawHeight = Math.round(image.height * ratio)
  const offsetX = Math.round((size - drawWidth) / 2)
  const offsetY = Math.round((size - drawHeight) / 2)

  for (let y = 0; y < drawHeight; y++) {
    for (let x = 0; x < drawWidth; x++) {
      const sx = Math.min(image.width - 1, Math.floor((x / drawWidth) * image.width))
      const sy = Math.min(
        image.height - 1,
        Math.floor((y / drawHeight) * image.height)
      )
      const i = (image.width * sy + sx) << 2
      const o = (size * (y + offsetY) + (x + offsetX)) << 2
      const a = image.data[i + 3] / 255

      if (background) {
        out.data[o] = Math.round(image.data[i] * a + out.data[o] * (1 - a))
        out.data[o + 1] = Math.round(
          image.data[i + 1] * a + out.data[o + 1] * (1 - a)
        )
        out.data[o + 2] = Math.round(
          image.data[i + 2] * a + out.data[o + 2] * (1 - a)
        )
        out.data[o + 3] = 255
      } else {
        out.data[o] = image.data[i]
        out.data[o + 1] = image.data[i + 1]
        out.data[o + 2] = image.data[i + 2]
        out.data[o + 3] = image.data[i + 3]
      }
    }
  }

  return out
}

/**
 * A soft bloom derived from the artwork itself: average the image down to a
 * coarse grid, then bilinearly expand it back. Compositing that under the
 * sharp mark reproduces the halo the logo already has, and — because it is
 * radial and smooth — it dissolves the rectangular edge the sampled crop
 * would otherwise leave against a flat backdrop.
 */
function bloom(image, grid, strength) {
  const size = image.width
  const cell = size / grid
  const cells = new Float64Array(grid * grid * 4)

  for (let y = 0; y < size; y++) {
    const gy = Math.min(grid - 1, Math.floor(y / cell))
    for (let x = 0; x < size; x++) {
      const gx = Math.min(grid - 1, Math.floor(x / cell))
      const i = (size * y + x) << 2
      const c = (grid * gy + gx) << 2
      const a = image.data[i + 3] / 255
      cells[c] += image.data[i] * a
      cells[c + 1] += image.data[i + 1] * a
      cells[c + 2] += image.data[i + 2] * a
      cells[c + 3] += a
    }
  }

  const per = cell * cell
  for (let i = 0; i < cells.length; i += 4) {
    cells[i] /= per
    cells[i + 1] /= per
    cells[i + 2] /= per
    cells[i + 3] /= per
  }

  const sample = (gx, gy, channel) => {
    const cx = Math.min(grid - 1, Math.max(0, gx))
    const cy = Math.min(grid - 1, Math.max(0, gy))
    return cells[((grid * cy + cx) << 2) + channel]
  }

  const out = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    const fy = y / cell - 0.5
    const gy = Math.floor(fy)
    const ty = fy - gy
    for (let x = 0; x < size; x++) {
      const fx = x / cell - 0.5
      const gx = Math.floor(fx)
      const tx = fx - gx
      const o = (size * y + x) << 2

      for (let channel = 0; channel < 4; channel++) {
        const top =
          sample(gx, gy, channel) * (1 - tx) + sample(gx + 1, gy, channel) * tx
        const bottom =
          sample(gx, gy + 1, channel) * (1 - tx) +
          sample(gx + 1, gy + 1, channel) * tx
        const value = top * (1 - ty) + bottom * ty
        out.data[o + channel] =
          channel === 3
            ? Math.min(255, Math.round(value * 255 * strength))
            : Math.min(255, Math.round(value))
      }
    }
  }

  return out
}

/** Alpha-composites `top` over `base`, in place on a copy of `base`. */
function compositeOver(base, top) {
  const out = new PNG({ width: base.width, height: base.height })
  base.data.copy(out.data)

  for (let i = 0; i < out.data.length; i += 4) {
    const a = top.data[i + 3] / 255
    if (a === 0) continue
    out.data[i] = Math.round(top.data[i] * a + out.data[i] * (1 - a))
    out.data[i + 1] = Math.round(top.data[i + 1] * a + out.data[i + 1] * (1 - a))
    out.data[i + 2] = Math.round(top.data[i + 2] * a + out.data[i + 2] * (1 - a))
    out.data[i + 3] = Math.max(out.data[i + 3], top.data[i + 3])
  }

  return out
}

/** Box-filters a square image down to `size`. */
function downsampleSquare(image, size) {
  const out = new PNG({ width: size, height: size })
  const step = image.width / size

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0

      for (let sy = Math.floor(y * step); sy < Math.floor((y + 1) * step); sy++) {
        for (
          let sx = Math.floor(x * step);
          sx < Math.floor((x + 1) * step);
          sx++
        ) {
          const i = (image.width * sy + sx) << 2
          r += image.data[i]
          g += image.data[i + 1]
          b += image.data[i + 2]
          a += image.data[i + 3]
          n++
        }
      }

      const o = (size * y + x) << 2
      out.data[o] = Math.round(r / n)
      out.data[o + 1] = Math.round(g / n)
      out.data[o + 2] = Math.round(b / n)
      out.data[o + 3] = Math.round(a / n)
    }
  }

  return out
}

function solid(size, color) {
  const out = new PNG({ width: size, height: size })
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = color[0]
    out.data[i + 1] = color[1]
    out.data[i + 2] = color[2]
    out.data[i + 3] = 255
  }
  return out
}

/** White silhouette on transparent, for the Android themed-icon slot. */
function monochrome(image) {
  const out = new PNG({ width: image.width, height: image.height })
  for (let i = 0; i < image.data.length; i += 4) {
    out.data[i] = 255
    out.data[i + 1] = 255
    out.data[i + 2] = 255
    // Lift the glow's low alpha so the silhouette stays legible once the
    // system tints it flat.
    out.data[i + 3] = Math.min(255, Math.round(image.data[i + 3] * 1.6))
  }
  return out
}

function write(name, png) {
  const file = path.join(IMAGES, name)
  fs.writeFileSync(file, PNG.sync.write(png))
  const { size } = fs.statSync(file)
  console.log(
    `${name.padEnd(30)} ${png.width}x${png.height}  ${(size / 1024).toFixed(1)}kb`
  )
}

const source = PNG.sync.read(fs.readFileSync(SOURCE))
const rect = findMarkRect(source)
console.log(
  `mark rect  left ${rect.left} top ${rect.top} ${rect.width}x${rect.height}`
)

// One high-resolution cutout, reused for every target.
const CUTOUT_WIDTH = 1024
const scale = CUTOUT_WIDTH / rect.width
const cutout = featherEdges(
  sampleRect(
    source,
    rect,
    CUTOUT_WIDTH,
    Math.round(CUTOUT_WIDTH * (rect.height / rect.width)),
    { keyAlpha: true }
  ),
  {
    left: rect.margins.left * scale,
    right: rect.margins.right * scale,
    top: rect.margins.top * scale,
    bottom: rect.margins.bottom * scale,
  }
)

// iOS / store icon: opaque, the mark over its own bloom on an ink backdrop.
const placed = centerOnSquare(cutout, 1024, 0.98, null)
const icon = compositeOver(
  compositeOver(solid(1024, INK), bloom(placed, 22, 0.6)),
  placed
)
write("icon.png", icon)

// Android adaptive. Every mask shape crops the outer third, so the mark is
// held inside the safe zone. The foreground is opaque ink rather than a
// cutout: the background layer is ink too, so the two are indistinguishable,
// and an opaque layer renders identically under every OEM mask and under the
// launcher's parallax — a translucent glow does not.
const safe = centerOnSquare(cutout, 1024, 0.72, null)
write(
  "android-icon-foreground.png",
  compositeOver(compositeOver(solid(1024, INK), bloom(safe, 22, 0.6)), safe)
)
write("android-icon-background.png", solid(1024, INK))
write("android-icon-monochrome.png", monochrome(safe))

// Splash: transparent mark, sized to sit inside expo-splash-screen's box.
write("splash-icon.png", centerOnSquare(cutout, 512, 0.98, null))

// In-app mark, for auth and onboarding.
write("logo-mark.png", centerOnSquare(cutout, 512, 1, null))

// Web favicon — box-filtered from the finished icon so it stays identical.
write("favicon.png", downsampleSquare(icon, 64))

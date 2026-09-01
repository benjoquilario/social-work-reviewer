import { File } from "expo-file-system"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"

/**
 * ─── Shrink a picked image before it leaves the phone ─────────────────────
 *
 * `launchImageLibraryAsync` hands back the full-resolution asset. `quality`
 * only sets the re-encode quality; it does not touch the dimensions, so a
 * 12 MP camera roll photo still arrives as a 12 MP photo — a few megabytes —
 * and then gets uploaded, stored, and paid for at that size in order to be
 * displayed a few hundred pixels wide.
 *
 * Resizing here costs one pass on a file that is already on disk and cuts the
 * upload by an order of magnitude, which on Philippine mobile data is the
 * difference between an avatar change that works and one that times out.
 *
 * It also removes a real failure: some Android providers return a content URI
 * with no `fileSize`, and both callers used to reject those outright. The size
 * is read from the file that is actually about to be uploaded, so it is always
 * present and always accurate.
 */

export type UploadReadyImage = {
  uri: string
  name: string
  type: string
  size: number
}

export type PickedImage = {
  uri: string
  width?: number | null
  height?: number | null
}

type PrepareOptions = {
  /** Longest edge of the result, in pixels. */
  maxEdge: number
  /** JPEG quality, 0..1. */
  compress: number
  /** Used to build the upload filename. */
  baseName: string
}

export async function prepareImageForUpload(
  asset: PickedImage,
  { maxEdge, compress, baseName }: PrepareOptions
): Promise<UploadReadyImage> {
  const context = ImageManipulator.manipulate(asset.uri)

  const width = asset.width ?? 0
  const height = asset.height ?? 0
  const longest = Math.max(width, height)

  // Resize only when the source is actually larger. Scaling a small image up
  // would add bytes without adding detail.
  if (longest > maxEdge) {
    context.resize(
      width >= height ? { width: maxEdge } : { height: maxEdge }
    )
  }

  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress,
  })

  const size = new File(result.uri).size

  if (!size) {
    throw new Error("The processed image could not be read. Please try again.")
  }

  return {
    uri: result.uri,
    name: `${baseName}-${Date.now()}.jpg`,
    type: "image/jpeg",
    size,
  }
}

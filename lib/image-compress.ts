import sharp from 'sharp'

// Product images above this size are candidates for compression.
export const SIZE_THRESHOLD_BYTES = 500 * 1024 // 500 KB
// Product images rarely need to exceed this; Shopify zoom uses up to 2048px.
export const MAX_DIMENSION = 2048
// Only keep the compressed version if it saves at least this fraction.
export const MIN_SAVING_RATIO = 0.1 // 10%

export interface CompressResult {
  buffer: Buffer
  format: 'jpeg' | 'png' | 'webp'
  contentType: string
  ext: string
  originalSize: number
  newSize: number
  savedBytes: number
}

/** HEAD request to read an image's byte size without downloading it. */
export async function headImageSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return null
    const len = res.headers.get('content-length')
    return len ? parseInt(len, 10) : null
  } catch {
    return null
  }
}

/**
 * Downloads an image and re-encodes it with Sharp: downscales anything wider
 * than MAX_DIMENSION and re-compresses in its original format. Returns null if
 * the result isn't meaningfully smaller (so we never replace an image with a
 * bigger or marginally-different one).
 */
export async function compressFromUrl(url: string): Promise<CompressResult | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const input = Buffer.from(await res.arrayBuffer())
  const originalSize = input.length

  const img = sharp(input, { failOn: 'none' })
  const meta = await img.metadata()

  // Downscale if larger than MAX_DIMENSION on the longest side
  if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
    img.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
  }

  let buffer: Buffer
  let format: CompressResult['format']
  let contentType: string
  let ext: string

  switch (meta.format) {
    case 'png':
      buffer = await img.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer()
      format = 'png'; contentType = 'image/png'; ext = 'png'
      break
    case 'webp':
      buffer = await img.webp({ quality: 80 }).toBuffer()
      format = 'webp'; contentType = 'image/webp'; ext = 'webp'
      break
    default:
      // jpeg and everything else → optimized progressive JPEG
      buffer = await img.jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer()
      format = 'jpeg'; contentType = 'image/jpeg'; ext = 'jpg'
  }

  const newSize = buffer.length
  const savedBytes = originalSize - newSize
  if (savedBytes <= 0 || savedBytes / originalSize < MIN_SAVING_RATIO) {
    return null // not worth replacing
  }

  return { buffer, format, contentType, ext, originalSize, newSize, savedBytes }
}

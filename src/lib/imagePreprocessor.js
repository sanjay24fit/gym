// Client-side image preprocessing using HTML5 Canvas
// - Resizing large phone photos to prevent browser memory crashes
// - 90-degree rotations
// - Optional grayscale and contrast enhancement to improve OCR readability
// - Cropping rectangle to focus on the register/notebook section

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (_err) => reject(new Error('Failed to load image'))
    img.src = src
  })
}

// Preprocess image onto a Canvas and return data URL or blob
export async function preprocessImage(imageSrc, options = {}) {
  const {
    rotation = 0, // 0, 90, 180, 270
    grayscale = false,
    contrast = 1.0, // 1.0 = normal, 1.3 = higher contrast
    crop = null, // { xPercent, yPercent, widthPercent, heightPercent }
    maxDimension = 1920,
  } = options

  const img = await loadImage(imageSrc)

  // Determine source dimensions
  let srcX = 0
  let srcY = 0
  let srcW = img.naturalWidth || img.width
  let srcH = img.naturalHeight || img.height

  // Apply crop if provided (in percentages)
  if (crop) {
    srcX = (crop.xPercent / 100) * srcW
    srcY = (crop.yPercent / 100) * srcH
    srcW = (crop.widthPercent / 100) * srcW
    srcH = (crop.heightPercent / 100) * srcH
  }

  // Calculate downscaling ratio to ensure resolution is crisp but safe
  let scale = 1
  const maxSrcDim = Math.max(srcW, srcH)
  if (maxSrcDim > maxDimension) {
    scale = maxDimension / maxSrcDim
  }

  const destW = Math.round(srcW * scale)
  const destH = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // Handle rotation
  const rad = ((rotation % 360) * Math.PI) / 180
  const isPerpendicular = rotation % 180 !== 0

  canvas.width = isPerpendicular ? destH : destW
  canvas.height = isPerpendicular ? destW : destH

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -destW / 2, -destH / 2, destW, destH)
  ctx.restore()

  // Apply Grayscale and Contrast enhancement if requested
  if (grayscale || contrast !== 1.0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]

      if (grayscale) {
        // Luminance formula
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        r = gray
        g = gray
        b = gray
      }

      if (contrast !== 1.0) {
        r = factor * (r - 128) + 128
        g = factor * (g - 128) + 128
        b = factor * (b - 128) + 128
      }

      data[i] = Math.min(255, Math.max(0, r))
      data[i + 1] = Math.min(255, Math.max(0, g))
      data[i + 2] = Math.min(255, Math.max(0, b))
    }
    ctx.putImageData(imageData, 0, 0)
  }

  return canvas.toDataURL('image/jpeg', 0.88)
}

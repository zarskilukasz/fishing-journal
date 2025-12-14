/**
 * Client-side image utilities for resizing before upload.
 * Uses native Canvas API (OffscreenCanvas when available).
 */

/**
 * Resize image to fit within maxSize while maintaining aspect ratio.
 * Uses OffscreenCanvas for better performance when available.
 *
 * @param file - Original image file
 * @param maxSize - Maximum dimension (width or height) in pixels
 * @returns Resized image as Blob
 */
export async function resizeImage(file: File, maxSize = 2000): Promise<Blob> {
  // Create image bitmap from file
  const img = await createImageBitmap(file);

  // Calculate scale factor
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));

  // If no resize needed, return original
  if (scale === 1) {
    return file;
  }

  // Calculate new dimensions
  const newWidth = Math.round(img.width * scale);
  const newHeight = Math.round(img.height * scale);

  // Use OffscreenCanvas if available (better performance, works in workers)
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Draw scaled image
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to blob (JPEG for smaller size)
    return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  }

  // Fallback to regular canvas for older browsers
  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not convert canvas to blob"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

/**
 * Read file as Data URL for preview.
 *
 * @param file - File to read
 * @returns Data URL string
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from file.
 *
 * @param file - Image file
 * @returns Object with width and height
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await createImageBitmap(file);
  return { width: img.width, height: img.height };
}

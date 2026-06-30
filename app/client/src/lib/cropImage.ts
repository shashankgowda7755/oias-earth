/**
 * Shared image-crop helpers for the PFA uploader.
 *
 * `cropToRatio` is the silent centre-crop (used as a graceful fallback when the
 * interactive Cropper.js modal can't load). `outSize` picks export dimensions
 * for a target aspect ratio, and `canvasToJpegFile` re-encodes a canvas to a
 * JPEG File — both shared by the CropModal so capture + fallback agree on output.
 */

/** Export dimensions for a target aspect ratio, longest edge = maxEdge. */
export function outSize(ratio: number, maxEdge = 1600): { width: number; height: number } {
  return ratio >= 1
    ? { width: maxEdge, height: Math.round(maxEdge / ratio) }
    : { width: Math.round(maxEdge * ratio), height: maxEdge };
}

/** Re-encode a canvas to a JPEG File (q0.92). */
export async function canvasToJpegFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.92));
  if (!blob) throw new Error('encode failed');
  return new File([blob], name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

/**
 * Centre-crop an image File to a target aspect ratio and re-encode as JPEG.
 * Crops the longer axis (never stretches), so the subject the operator framed in
 * the centre is preserved. Falls back to the original file on any decode error.
 */
export async function cropToRatio(file: File, ratio: number): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return file;
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (iw / ih > ratio) { sw = Math.round(ih * ratio); sx = Math.round((iw - sw) / 2); }
    else if (iw / ih < ratio) { sh = Math.round(iw / ratio); sy = Math.round((ih - sh) / 2); }
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    return await canvasToJpegFile(canvas, file.name);
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

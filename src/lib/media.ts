"use client";

import type { Media } from "@/lib/game";

/** The brief asks for images under about 500 KB. */
export const IMAGE_TARGET_BYTES = 500 * 1024;
/** Audio can't be re-encoded in the browser, so we cap it instead. */
export const AUDIO_MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

export interface MediaResult {
  media: Media;
  /** e.g. "Compressed 2.4 MB → 412 KB" */
  note: string;
}

export function formatBytes(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Bytes encoded in a data: URI (approximate). */
export function dataUriBytes(src: string): number {
  if (!src.startsWith("data:")) return 0;
  return Math.floor((src.length - src.indexOf(",") - 1) * 0.75);
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Re-encodes an image (WebP, falling back to JPEG) until it fits the target size. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  let best: Blob | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.72, 0.6]) {
      let blob = await canvasToBlob(canvas, "image/webp", quality);
      // Older Safari can't encode WebP and silently returns PNG.
      if (!blob || blob.type !== "image/webp") {
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff"; // JPEG has no alpha
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= IMAGE_TARGET_BYTES) {
        bitmap.close();
        return blob;
      }
    }
    scale *= 0.75;
  }
  bitmap.close();
  if (!best) throw new Error("This image couldn't be read.");
  return best;
}

/** Turns a dropped/picked file into embeddable media. Throws with a readable message. */
export async function fileToMedia(file: File): Promise<MediaResult> {
  if (file.type.startsWith("image/")) {
    // Small enough already: keep the original (preserves GIF animation, SVG, transparency).
    if (file.size <= IMAGE_TARGET_BYTES) {
      return { media: { type: "image", src: await readAsDataUrl(file) }, note: `Image · ${formatBytes(file.size)}` };
    }
    const blob = await compressImage(file);
    return {
      media: { type: "image", src: await readAsDataUrl(blob) },
      note: `Compressed ${formatBytes(file.size)} → ${formatBytes(blob.size)}`,
    };
  }
  if (file.type.startsWith("audio/")) {
    if (file.size > AUDIO_MAX_BYTES) {
      throw new Error(
        `That audio is ${formatBytes(file.size)}. Keep clips under ${formatBytes(AUDIO_MAX_BYTES)}: trim it, or paste a URL instead.`,
      );
    }
    return { media: { type: "audio", src: await readAsDataUrl(file) }, note: `Audio · ${formatBytes(file.size)}` };
  }
  throw new Error("Drop an image or an audio file.");
}

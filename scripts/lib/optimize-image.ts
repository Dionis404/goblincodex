/**
 * optimize-image.ts
 * Shared image compression for locally mirrored news/blog images.
 *
 * PNG/JPEG sources from CDNs are saved at their original resolution (often
 * 2-4 MB per file) but on the site they are displayed at card (~400-800px)
 * or article (~1000px) width, so shipping originals wastes ~90% of the
 * bytes. Every image is resized to MAX_WIDTH and re-encoded:
 *
 *   - "jpg"  — frontmatter preview images: they double as the article's
 *     og:image, and Telegram/WhatsApp link previews don't render WebP.
 *   - "webp" — in-article body images: browsers only, WebP is safe and
 *     smaller (and keeps alpha, unlike JPEG).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';

// На Windows libviips держит входной файл открытым ещё какое-то время после
// toFile() — unlink сразу за ним падает с EBUSY. Отключаем файловый кэш
// sharp, это стандартный обход (см. sharp#cached files issues).
sharp.cache(false);

export const MAX_WIDTH = 1600;
export const JPEG_QUALITY = 82;
export const WEBP_QUALITY = 82;

export type OptimizedFormat = 'jpg' | 'webp';

export interface OptimizeOutcome {
  /** Absolute path of the written file (source extension swapped for the new one). */
  outFile: string;
  beforeBytes: number;
  afterBytes: number;
}

/** Absolute source path -> web path relative to site root (posix separators). */
export function toWebPath(publicRootDir: string, absFile: string): string {
  return `/${path.relative(publicRootDir, absFile).split(path.sep).join('/')}`;
}

export function withFormatExt(file: string, format: OptimizedFormat): string {
  return file.replace(/\.(png|jpe?g|webp)$/i, format === 'jpg' ? '.jpg' : '.webp');
}

/** Windows-сторож: антивирус/индексация иногда держат файл после toFile. */
export function unlinkWithRetry(file: string, attempts = 8, delayMs = 400): void {
  for (let i = 1; ; i++) {
    try {
      fs.unlinkSync(file);
      return;
    } catch (e) {
      if (i >= attempts) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
}

/**
 * Resizes + re-encodes `srcFile` in place semantics: the optimized file is
 * written next to the source; the caller deletes the source after success.
 * Falls back to a flattened white background when a JPEG target has alpha.
 */
export async function optimizeImage(srcFile: string, format: OptimizedFormat): Promise<OptimizeOutcome> {
  const beforeBytes = fs.statSync(srcFile).size;
  const outFile = withFormatExt(srcFile, format);

  let pipeline = sharp(srcFile).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });

  const meta = await sharp(srcFile).metadata();
  if (format === 'jpg') {
    if (meta.hasAlpha) pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
  } else {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  }

  await pipeline.toFile(outFile);
  const afterBytes = fs.statSync(outFile).size;
  return { outFile, beforeBytes, afterBytes };
}

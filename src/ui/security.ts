/**
 * Small security helpers for user-supplied content.
 *
 * The app renders user-supplied URLs (slide images, document images/links).
 * These helpers reject dangerous schemes (javascript:, vbscript:, data:text/html)
 * so a shared .aioffice file or pasted URL can't smuggle active content.
 */

/** Allow http(s) and safe data:image URLs for images; reject everything else. */
export function sanitizeImageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  try {
    // Resolve relative to a dummy base so bare paths don't throw.
    const u = new URL(trimmed, 'https://invalid.local');
    if (u.protocol === 'http:' || u.protocol === 'https:') return trimmed;
    if (u.protocol === 'data:' && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/** Allow http(s) and mailto links; reject javascript: and friends. */
export function sanitizeLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  try {
    const u = new URL(trimmed, 'https://invalid.local');
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

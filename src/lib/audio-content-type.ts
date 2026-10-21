const AUDIO_CONTENT_TYPE = /^audio\/[a-z0-9.+-]+$/i;

export function isAudioContentType(value: string): boolean {
  return AUDIO_CONTENT_TYPE.test(value);
}

/**
 * Headers for serving stored audio from our own origin. The stored Content-Type came from
 * an upload, so anything that is not audio is downgraded to a download, and `nosniff` plus a
 * sandbox CSP stop the browser from ever rendering the body as a page (stored XSS).
 */
export function audioResponseHeaders(storedType: string | null, cacheControl: string): HeadersInit {
  return {
    "Content-Type":
      storedType && isAudioContentType(storedType) ? storedType : "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": cacheControl,
  };
}

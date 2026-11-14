import { audioResponseHeaders } from "./audio-content-type";
import { getSignedAudioUrl } from "./r2";

/**
 * Streams a stored audio object to the browser. The request's Range header is forwarded
 * to R2 and its partial response passed through, because browsers (Safari in particular)
 * need range requests to seek in audio and to play it reliably.
 */
export async function storedAudioResponse(
  request: Request,
  key: string,
  cacheControl: string,
): Promise<Response> {
  const range = request.headers.get("range");
  const signedUrl = await getSignedAudioUrl(key);
  const upstream = await fetch(signedUrl, { headers: range ? { Range: range } : undefined });

  if (upstream.status === 416) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": upstream.headers.get("content-range") ?? "bytes */*" },
    });
  }
  if (!upstream.ok) {
    return new Response("Failed to fetch audio", { status: 502 });
  }

  const headers = new Headers(
    audioResponseHeaders(upstream.headers.get("content-type"), cacheControl),
  );
  headers.set("Accept-Ranges", "bytes");
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  // 200 for a full body, 206 when R2 honoured the range.
  return new Response(upstream.body, { status: upstream.status, headers });
}

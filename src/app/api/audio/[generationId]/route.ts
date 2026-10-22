import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { generation } from "@/db/schema";
import { getOrgSession } from "@/lib/org-membership";
import { getSignedAudioUrl } from "@/lib/r2";
import { audioResponseHeaders } from "@/lib/audio-content-type";

export async function GET(request: Request, { params }: RouteContext<"/api/audio/[generationId]">) {
  const orgSession = await getOrgSession(request.headers);
  if (!orgSession) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { orgId } = orgSession;

  const { generationId } = await params;

  const [generationRecord] = await db
    .select({
      r2ObjectKey: generation.r2ObjectKey,
    })
    .from(generation)
    .where(and(eq(generation.id, generationId), eq(generation.orgId, orgId)))
    .limit(1);

  if (!generationRecord) {
    return new Response("Not found", { status: 404 });
  }

  if (!generationRecord.r2ObjectKey) {
    return new Response("Audio is not available yet", { status: 409 });
  }

  const signedUrl = await getSignedAudioUrl(generationRecord.r2ObjectKey);
  const audioResponse = await fetch(signedUrl);

  if (!audioResponse.ok) {
    return new Response("Failed to fetch audio", { status: 502 });
  }

  return new Response(audioResponse.body, {
    headers: audioResponseHeaders(
      audioResponse.headers.get("content-type"),
      "private, max-age=3600", // 1 hour
    ),
  });
}

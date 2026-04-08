import { eq } from "drizzle-orm";
import { db } from "@/db";
import { voice } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSignedAudioUrl } from "@/lib/r2";

export async function GET(request: Request, { params }: { params: Promise<{ voiceId: string }> }) {
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  const userId = sessionData?.user?.id;
  const orgId = sessionData?.session?.activeOrganizationId;

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { voiceId } = await params;

  const [voiceRecord] = await db
    .select({
      variant: voice.variant,
      orgId: voice.orgId,
      r2ObjectKey: voice.r2ObjectKey,
    })
    .from(voice)
    .where(eq(voice.id, voiceId))
    .limit(1);

  if (!voiceRecord) {
    return new Response("Not found", { status: 404 });
  }

  if (voiceRecord.variant === "CUSTOM" && voiceRecord.orgId !== orgId) {
    return new Response("Not found", { status: 404 });
  }

  if (!voiceRecord.r2ObjectKey) {
    return new Response("Voice audio is not available yet", { status: 409 });
  }

  const signedUrl = await getSignedAudioUrl(voiceRecord.r2ObjectKey);
  const audioResponse = await fetch(signedUrl);

  if (!audioResponse.ok) {
    return new Response("Failed to fetch voice audio", { status: 502 });
  }

  const contentType = audioResponse.headers.get("content-type") || "audio/wav";

  return new Response(audioResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        voiceRecord.variant === "SYSTEM" ? "public, max-age=86400" : "private, max-age=3600",
    },
  });
}

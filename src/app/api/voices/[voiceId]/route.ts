import { eq } from "drizzle-orm";
import { db } from "@/db";
import { voice } from "@/db/schema";
import { getOrgSession } from "@/lib/org-membership";
import { storedAudioResponse } from "@/lib/stored-audio-response";

export async function GET(request: Request, { params }: RouteContext<"/api/voices/[voiceId]">) {
  const orgSession = await getOrgSession(request.headers);
  if (!orgSession) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { orgId } = orgSession;

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

  return storedAudioResponse(
    request,
    voiceRecord.r2ObjectKey,
    voiceRecord.variant === "SYSTEM" ? "public, max-age=86400" : "private, max-age=3600",
  );
}

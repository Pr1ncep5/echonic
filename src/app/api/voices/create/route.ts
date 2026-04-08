import { parseBuffer } from "music-metadata";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { voice } from "@/db/schema";
import { auth } from "@/lib/auth";
import { uploadAudio } from "@/lib/r2";
import { VOICE_CATEGORIES, type VoiceCategory } from "@/features/voices/data/voice-categories";

const createVoiceSchema = z.object({
  name: z.string().min(1, "Voice name is required"),
  category: z.enum(VOICE_CATEGORIES as [VoiceCategory, ...VoiceCategory[]]),
  language: z.string().min(1, "Language is required"),
  description: z.string().nullish(),
});

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_AUDIO_DURATION_SECONDS = 10;

export async function POST(request: Request) {
  const sessionData = await auth.api.getSession({
    headers: request.headers,
  });

  const userId = sessionData?.user?.id;
  const orgId = sessionData?.session?.activeOrganizationId;

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);

  const validation = createVoiceSchema.safeParse({
    name: url.searchParams.get("name"),
    category: url.searchParams.get("category"),
    language: url.searchParams.get("language"),
    description: url.searchParams.get("description"),
  });

  if (!validation.success) {
    return Response.json(
      {
        error: "Invalid input",
        issues: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { name, category, language, description } = validation.data;

  const fileBuffer = await request.arrayBuffer();

  if (!fileBuffer.byteLength) {
    return Response.json({ error: "Please upload an audio file" }, { status: 400 });
  }

  if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json({ error: "Audio file exceeds the 20 MB size limit" }, { status: 413 });
  }

  const contentType = request.headers.get("content-type");

  if (!contentType) {
    return Response.json({ error: "Missing Content-Type header" }, { status: 400 });
  }

  const normalizedContentType = contentType.split(";")[0]?.trim() || "audio/wav";

  // Validate audio format and duration
  let duration: number;
  try {
    const metadata = await parseBuffer(
      new Uint8Array(fileBuffer),
      { mimeType: normalizedContentType },
      { duration: true },
    );
    duration = metadata.format.duration ?? 0;
  } catch {
    return Response.json({ error: "File is not a valid audio file" }, { status: 422 });
  }

  if (duration < MIN_AUDIO_DURATION_SECONDS) {
    return Response.json(
      {
        error: `Audio too short (${duration.toFixed(1)}s). Minimum duration is ${MIN_AUDIO_DURATION_SECONDS} seconds.`,
      },
      { status: 422 },
    );
  }

  let createdVoiceId: string | null = null;

  try {
    const [insertedVoice] = await db
      .insert(voice)
      .values({
        name,
        variant: "CUSTOM",
        orgId,
        description,
        category,
        language,
      })
      .returning({ id: voice.id });

    createdVoiceId = insertedVoice.id;
    const r2ObjectKey = `voices/orgs/${orgId}/${insertedVoice.id}`;

    await uploadAudio({
      buffer: Buffer.from(fileBuffer),
      key: r2ObjectKey,
      contentType: normalizedContentType,
    });

    await db.update(voice).set({ r2ObjectKey }).where(eq(voice.id, insertedVoice.id));
  } catch {
    if (createdVoiceId) {
      await db
        .delete(voice)
        .where(eq(voice.id, createdVoiceId))
        .catch(() => {});
    }

    return Response.json({ error: "Failed to create voice. Please retry." }, { status: 500 });
  }

  return Response.json({ name, message: "Voice created successfully" }, { status: 201 });
}

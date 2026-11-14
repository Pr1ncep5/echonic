import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Data, Effect } from "effect";
import { env } from "./env";

/**
 * Thrown when uploading audio to Cloudflare R2 fails.
 */
export class StorageUploadError extends Data.TaggedError("StorageUpload")<{
  readonly key: string;
  readonly cause: unknown;
}> {}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

type UploadAudioOptions = {
  buffer: Buffer;
  key: string;
  contentType?: string;
};

/**
 * Uploads audio. Callers queue a delayed cleanup for the key before calling this and cancel
 * it in the transaction that inserts the owning row, so a failed or interrupted request
 * never leaves an orphaned object (see outbox-service.ts).
 */
export function uploadAudio({
  buffer,
  key,
  contentType = "audio/wav",
}: UploadAudioOptions): Effect.Effect<void, StorageUploadError> {
  return Effect.tryPromise({
    try: () =>
      r2.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      ),
    catch: (cause) => new StorageUploadError({ key, cause }),
  }).pipe(Effect.asVoid);
}

export async function deleteAudio(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

/** Deletes every object under a prefix, e.g. all audio of a deleted Organization. */
export async function deleteAudioByPrefix(prefix: string): Promise<void> {
  let continuationToken: string | undefined;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (page.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : []));
    if (keys.length > 0) {
      const result = await r2.send(
        new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (result.Errors?.length) {
        throw new Error(`Failed to delete ${result.Errors.length} objects under ${prefix}`);
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
}

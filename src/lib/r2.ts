import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Data, Effect, Exit, type Scope } from "effect";
import * as Sentry from "@sentry/nextjs";
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

export async function uploadAudio({
  buffer,
  key,
  contentType = "audio/wav",
}: UploadAudioOptions): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

/**
 * Uploads audio as a saga step: if the enclosing scope fails, the object is deleted again.
 * The delete is skipped when `isReferenced` finds a row pointing at the key, because a
 * failed insert may still have committed (e.g. a timeout after commit). Failed rollbacks
 * are logged with the key so orphaned objects can be found later.
 */
export function uploadAudioWithRollback(
  options: UploadAudioOptions & { readonly isReferenced: () => Promise<boolean> },
): Effect.Effect<void, StorageUploadError, Scope.Scope> {
  const { isReferenced, ...upload } = options;
  return Effect.acquireRelease(
    Effect.tryPromise({
      try: () => uploadAudio(upload),
      catch: (cause) => new StorageUploadError({ key: upload.key, cause }),
    }),
    (_, exit) =>
      Exit.isFailure(exit)
        ? Effect.tryPromise(async () => {
            if (!(await isReferenced())) {
              await deleteAudio(upload.key);
            }
          }).pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                Sentry.logger.error("Failed to roll back uploaded audio", {
                  key: upload.key,
                  error,
                }),
              ),
            ),
          )
        : Effect.void,
  );
}

export async function deleteAudio(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function getSignedAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
}

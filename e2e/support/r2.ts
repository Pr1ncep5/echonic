import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { wavOfSeconds } from "../../src/tests/audio";
import { r2Env } from "./env";

/** Reads and writes the R2 test bucket directly, to set up and check what the app stored. */
function bucket() {
  const r2 = r2Env(process.env);
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.R2_ACCESS_KEY_ID, secretAccessKey: r2.R2_SECRET_ACCESS_KEY },
  });
  return { client, name: r2.R2_BUCKET_NAME };
}

export async function putAudio(key: string, seconds = 2) {
  const { client, name } = bucket();
  await client.send(
    new PutObjectCommand({
      Bucket: name,
      Key: key,
      Body: wavOfSeconds(seconds),
      ContentType: "audio/wav",
    }),
  );
}

export async function audioExists(key: string): Promise<boolean> {
  const { client, name } = bucket();
  try {
    await client.send(new HeadObjectCommand({ Bucket: name, Key: key }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFound") return false;
    throw error;
  }
}

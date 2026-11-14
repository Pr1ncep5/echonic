import { Effect } from "effect";
import * as Sentry from "@sentry/nextjs";
import { getOrgSession } from "@/lib/org-membership";
import { isInfrastructureError, toErrorResponse } from "@/features/voices/domain/errors";
import { createVoiceWorkflow } from "@/features/voices/workflows/create-voice-workflow";

export async function POST(request: Request) {
  const orgSession = await getOrgSession(request.headers);
  if (!orgSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgId, userId } = orgSession;

  const url = new URL(request.url);

  const program = createVoiceWorkflow(
    {
      params: {
        name: url.searchParams.get("name"),
        category: url.searchParams.get("category"),
        language: url.searchParams.get("language"),
        description: url.searchParams.get("description"),
        consent: url.searchParams.get("consent"),
      },
      contentTypeHeader: request.headers.get("content-type"),
      body: request.body,
    },
    { orgId, userId },
  ).pipe(
    Effect.map(({ name }) =>
      Response.json({ name, message: "Voice created successfully" }, { status: 201 }),
    ),
    Effect.catch((error) =>
      Effect.sync(() => {
        if (isInfrastructureError(error)) {
          // oxlint-disable-next-line eslint/no-underscore-dangle
          Sentry.captureException(error, { tags: { orgId, errorTag: error._tag } });
        }
        return toErrorResponse(error);
      }),
    ),
    Effect.catchDefect((defect: unknown) =>
      Effect.sync(() => {
        Sentry.captureException(defect, { tags: { orgId } });
        return Response.json({ error: "Failed to create voice. Please retry." }, { status: 500 });
      }),
    ),
  );

  return Effect.runPromise(program);
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AudioLines, AudioWaveform, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export function SettingsPanelHistory() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ generationId?: string }>();
  const [deleting, setDeleting] = useState<{ id: string; text: string } | null>(null);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuspenseInfiniteQuery(
    trpc.generations.list.infiniteQueryOptions(
      {},
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  );
  const generations = data.pages.flatMap((page) => page.items);

  const deleteMutation = useMutation(
    trpc.generations.delete.mutationOptions({
      onSuccess: (_result, { id }) => {
        toast.success("Generation deleted");
        void queryClient.invalidateQueries(trpc.generations.list.pathFilter());
        // The page for a deleted Generation no longer exists.
        if (params.generationId === id) {
          router.push("/text-to-speech");
        }
      },
      onError: (error) => toast.error(error.message || "Couldn't delete the generation"),
    }),
  );

  if (!generations.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
        <div className="relative flex w-25 items-center justify-center">
          <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-3">
            <AudioLines className="size-4 text-muted-foreground" />
          </div>

          <div className="relative z-10 rounded-full bg-foreground p-3">
            <AudioWaveform className="size-4 text-background" />
          </div>

          <div className="absolute right-0 rotate-30 rounded-full bg-muted p-3">
            <Clock className="size-4 text-muted-foreground" />
          </div>
        </div>
        <p className="font-semibold tracking-tight text-foreground">No generations yet</p>

        <p className="max-w-48 text-center text-xs text-muted-foreground">
          Generate some audio and it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {generations.map((generation) => (
        <div
          key={generation.id}
          className={cn(
            "group relative flex items-center rounded-lg transition-colors hover:bg-muted",
            params.generationId === generation.id && "bg-muted",
          )}
        >
          <Link
            href={`/text-to-speech/${generation.id}`}
            aria-current={params.generationId === generation.id ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <p className="truncate text-sm font-medium text-foreground">{generation.text}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <VoiceAvatar
                seed={generation.voiceId ?? generation.voiceName}
                name={generation.voiceName}
                className="shrink-0"
              />
              <span className="truncate">{generation.voiceName}</span>
              <span>&middot;</span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(generation.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete generation"
            className="mr-2 shrink-0 text-muted-foreground hover:text-destructive lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
            onClick={() => setDeleting({ id: generation.id, text: generation.text })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 text-muted-foreground"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage && <Spinner className="size-3" />}
          Load more
        </Button>
      )}

      <ConfirmActionDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this generation?"
        description="Its text and audio are removed for everyone in your organization. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteMutation.mutate({ id: deleting.id })}
      />
    </div>
  );
}

import Link from "next/link";
import { Mic, MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";

import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { VOICE_CATEGORY_LABELS } from "@/features/voices/data/voice-categories";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useTRPC } from "@/trpc/client";
import { useState } from "react";

export type VoiceItem = inferRouterOutputs<AppRouter>["voices"]["getAll"]["custom"][number];

interface VoiceCardProps {
  voice: VoiceItem;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function parseLanguage(locale: string) {
  const [, country] = locale.split("-");
  if (!country) return { flag: "", region: locale };

  const flag = [...country.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");

  const region = regionNames.of(country) ?? country;

  return { flag, region };
}

export function VoiceCard({ voice }: VoiceCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { flag, region } = parseLanguage(voice.language);

  const audioSrc = `/api/voices/${encodeURIComponent(voice.id)}`;
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(audioSrc);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(
    trpc.voices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Voice deleted successfully");
        queryClient.invalidateQueries({
          queryKey: trpc.voices.getAll.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete voice");
      },
    }),
  );

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6">
      <div className="relative h-24 w-20 shrink-0 lg:h-30 lg:w-24">
        <div className="absolute left-0 top-0 h-24 w-10 border-r bg-muted/50 lg:h-30 lg:w-12" />

        <div className="absolute inset-0 flex items-center justify-center">
          <VoiceAvatar
            seed={voice.id}
            name={voice.name}
            className="size-14 border-[1.5px] border-white shadow-xs lg:size-18"
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-3">
        <div className="flex items-center gap-1.5 line-clamp-1 text-sm font-medium tracking-tight">
          {voice.name}
          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="text-[#327c88]">{VOICE_CATEGORY_LABELS[voice.category]}</span>
        </div>

        <p className="line-clamp-1 text-xs text-muted-foreground">{voice.description}</p>

        <p className="flex items-center gap-1 text-xs">
          <span className="shrink-0">{flag}</span>
          <span className="truncate font-medium">{region}</span>
        </p>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-1 lg:ml-3 lg:gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner className="size-4" />
          ) : isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" className="rounded-full">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/text-to-speech?voiceId=${voice.id}`}>
                <Mic className="size-4 text-foreground" />
                <span className="font-medium">Use this voice</span>
              </Link>
            </DropdownMenuItem>
            {voice.variant === "CUSTOM" && (
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="font-medium">Delete voice</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {voice.variant === "CUSTOM" && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete voice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{voice.name}&quot;? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteMutation.mutate(
                      { id: voice.id },
                      { onSuccess: () => setShowDeleteDialog(false) },
                    );
                  }}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { VoicePreviewPlaceholder } from "@/features/text-to-speech/components/voice-preview-placeholder";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 p-4 lg:p-6">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>

          <div className="shrink-0 p-4 lg:p-6">
            <div className="flex flex-col gap-3 lg:hidden">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-9" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="hidden items-center justify-between gap-4 lg:flex">
              <Skeleton className="h-6 w-40 rounded-full" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          </div>
        </div>

        <VoicePreviewPlaceholder />
      </div>

      <div className="hidden w-105 min-h-0 flex-col border-l lg:flex">
        <div className="grid h-12 grid-cols-2 border-b">
          <div className="flex items-center justify-center border-r px-4">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-center px-4">
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <div className="space-y-3 border-b border-dashed pb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            <div className="space-y-6">
              {["creativity", "variety", "range", "flow"].map((item) => (
                <div key={item} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

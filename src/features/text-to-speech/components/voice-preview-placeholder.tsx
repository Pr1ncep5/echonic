import { AudioLines, Sparkles, Volume2 } from "lucide-react";

export function VoicePreviewPlaceholder() {
  return (
    <div className="hidden h-full flex-1 flex-col items-center justify-center gap-3 border-t lg:flex">
      <div className="relative flex w-32 items-center justify-center">
        <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-4">
          <Volume2 className="size-5 text-muted-foreground" />
        </div>

        <div className="relative z-10 rounded-full bg-foreground p-4">
          <Sparkles className="size-5 text-background" />
        </div>

        <div className="absolute right-0 -rotate-30 rounded-full bg-muted p-4">
          <AudioLines className="size-5 text-muted-foreground" />
        </div>
      </div>

      <p className="text-lg font-semibold tracking-tight text-foreground">
        Your audio will appear here
      </p>
      <p className="max-w-64 text-center text-sm text-muted-foreground">
        Write some text, pick a voice and generate. You can play and download the result here.
      </p>
    </div>
  );
}

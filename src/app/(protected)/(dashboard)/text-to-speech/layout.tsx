import { TextToSpeechLayout } from "@/features/text-to-speech/views/text-to-speech-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <TextToSpeechLayout>{children}</TextToSpeechLayout>;
}

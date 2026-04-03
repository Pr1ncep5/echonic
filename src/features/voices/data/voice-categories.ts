import { voiceCategoryEnum } from "@/db/schema";

export type VoiceCategory = (typeof voiceCategoryEnum.enumValues)[number];

// Remapping for UI
export const VOICE_CATEGORY_LABELS: Record<VoiceCategory, string> = {
  AUDIOBOOK: "Audiobook",
  CONVERSATIONAL: "Conversational",
  CUSTOMER_SERVICE: "Customer Service",
  GENERAL: "General",
  NARRATIVE: "Narrative",
  CHARACTERS: "Characters",
  MEDITATION: "Meditation",
  MOTIVATIONAL: "Motivational",
  PODCAST: "Podcast",
  ADVERTISING: "Advertising",
  VOICEOVER: "Voiceover",
  CORPORATE: "Corporate",
};

export const VOICE_CATEGORIES = Object.keys(VOICE_CATEGORY_LABELS) as VoiceCategory[];
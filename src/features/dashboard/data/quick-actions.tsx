import {
  BookOpen,
  Clapperboard,
  Gamepad2,
  Megaphone,
  Podcast,
  Sprout,
  type LucideIcon,
} from "lucide-react";

export interface QuickAction {
  title: string;
  description: string;
  icon: LucideIcon;
  /** The sample text the Text to speech page opens with. */
  text: string;
}

export const quickActions: QuickAction[] = [
  {
    title: "Narrate a story",
    description: "Bring characters to life with expressive narration",
    icon: BookOpen,
    text: "In a village tucked between mist-covered mountains, there lived an old clockmaker whose clocks never told the right time — but they always told the truth. One rainy evening, a stranger walked in and asked for a clock that could show him his future.",
  },
  {
    title: "Record an ad",
    description: "Create professional advertisements with lifelike voices",
    icon: Megaphone,
    text: "Introducing BrightBean Coffee — the smoothest roast you'll ever taste. Sourced from high-altitude farms, slow-roasted to perfection, and delivered fresh to your door every single week. Wake up to something extraordinary. Try BrightBean today and get your first bag free.",
  },
  {
    title: "Direct a movie scene",
    description: "Generate dramatic dialogue for film and video",
    icon: Clapperboard,
    text: "The rain hammered against the window as she turned to face him. You knew, didn't you? she whispered, her voice barely holding together. He stepped forward, jaw clenched. I did what I had to do. The silence between them was louder than the storm outside.",
  },
  {
    title: "Voice a game character",
    description: "Build immersive worlds with dynamic character voices",
    icon: Gamepad2,
    text: "Listen up, adventurer. The realm of Ashenvale is crumbling, and the Crystal of Eternity has been shattered into seven pieces. You are the only one who can reassemble it. Gather your courage, sharpen your blade, and meet me at the Gates of Dawn. Time is not on our side.",
  },
  {
    title: "Introduce your podcast",
    description: "Hook your listeners from the very first second",
    icon: Podcast,
    text: "Hey everyone, welcome back to another episode of The Curious Mind — the podcast where we dig into the stories, science, and strange ideas that shape our world. I'm your host, and today we have an incredible guest who's going to challenge everything you thought you knew.",
  },
  {
    title: "Guide a meditation",
    description: "Craft soothing, calming audio for wellness content",
    icon: Sprout,
    text: "Close your eyes and take a deep breath in. Hold it gently... and release. Feel the weight of the day slowly melting away. With each breath, you're sinking deeper into calm. There is nowhere else you need to be. Just here. Just now. Breathe in peace, breathe out tension.",
  },
];

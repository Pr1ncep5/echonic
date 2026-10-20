export interface QuickAction {
  title: string;
  description: string;
  gradient: string;
  href: string;
}

export const quickActions: QuickAction[] = [
  {
    title: "Narrate a Story",
    description: "Bring characters to life with expressive AI narration",
    gradient: "from-cyan-400 to-cyan-50",
    href: "/text-to-speech?text=In a village tucked between mist-covered mountains, there lived an old clockmaker whose clocks never told the right time — but they always told the truth. One rainy evening, a stranger walked in and asked for a clock that could show him his future.",
  },
  {
    title: "Record an Ad",
    description: "Create professional advertisements with lifelike AI voices",
    gradient: "from-pink-400 to-pink-100",
    href: "/text-to-speech?text=Introducing BrightBean Coffee — the smoothest roast you'll ever taste. Sourced from high-altitude farms, slow-roasted to perfection, and delivered fresh to your door every single week. Wake up to something extraordinary. Try BrightBean today and get your first bag free.",
  },
  {
    title: "Direct a Movie Scene",
    description: "Generate dramatic dialogue for film and video",
    gradient: "from-violet-500 to-violet-100",
    href: "/text-to-speech?text=The rain hammered against the window as she turned to face him. You knew, didn't you? she whispered, her voice barely holding together. He stepped forward, jaw clenched. I did what I had to do. The silence between them was louder than the storm outside.",
  },
  {
    title: "Voice a Game Character",
    description: "Build immersive worlds with dynamic character voices",
    gradient: "from-orange-400 to-orange-100",
    href: "/text-to-speech?text=Listen up, adventurer. The realm of Ashenvale is crumbling, and the Crystal of Eternity has been shattered into seven pieces. You are the only one who can reassemble it. Gather your courage, sharpen your blade, and meet me at the Gates of Dawn. Time is not on our side.",
  },
  {
    title: "Introduce Your Podcast",
    description: "Hook your listeners from the very first second",
    gradient: "from-blue-500 to-blue-100",
    href: "/text-to-speech?text=Hey everyone, welcome back to another episode of The Curious Mind — the podcast where we dig into the stories, science, and strange ideas that shape our world. I'm your host, and today we have an incredible guest who's going to challenge everything you thought you knew.",
  },
  {
    title: "Guide a Meditation",
    description: "Craft soothing, calming audio for wellness content",
    gradient: "from-lime-400 to-lime-100",
    href: "/text-to-speech?text=Close your eyes and take a deep breath in. Hold it gently... and release. Feel the weight of the day slowly melting away. With each breath, you're sinking deeper into calm. There is nowhere else you need to be. Just here. Just now. Breathe in peace, breathe out tension.",
  },
];

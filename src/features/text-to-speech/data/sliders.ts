interface Slider {
  id: "temperature" | "topP" | "topK" | "repetitionPenalty";
  label: string;
  description: string;
  leftLabel: string;
  rightLabel: string;
  min: number;
  max: number;
  step: number;
  /** Digits after the decimal point when showing the value. */
  precision: number;
}

export const sliders: Slider[] = [
  {
    id: "temperature",
    label: "Creativity",
    description: "How freely the delivery varies. Higher is livelier but less predictable.",
    leftLabel: "Consistent",
    rightLabel: "Expressive",
    min: 0,
    max: 2,
    step: 0.1,
    precision: 1,
  },
  {
    id: "topP",
    label: "Voice variety",
    description: "How many alternatives the model may pick from. Lower is safer.",
    leftLabel: "Stable",
    rightLabel: "Dynamic",
    min: 0,
    max: 1,
    step: 0.05,
    precision: 2,
  },
  {
    id: "topK",
    label: "Expression range",
    description: "A hard cap on those alternatives. Lower keeps the voice closer to its sample.",
    leftLabel: "Subtle",
    rightLabel: "Dramatic",
    min: 100,
    max: 10000,
    step: 100,
    precision: 0,
  },
  {
    id: "repetitionPenalty",
    label: "Natural flow",
    description: "Discourages repeated sounds. Raise it if the speech loops or stutters.",
    leftLabel: "Rhythmic",
    rightLabel: "Varied",
    min: 1,
    max: 2,
    step: 0.1,
    precision: 1,
  },
];

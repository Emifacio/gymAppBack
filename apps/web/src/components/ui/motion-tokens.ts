export const MotionTokens = {
  feedback: {
    successDuration: 1500,
    errorDuration: 3000,
    inlineFadeOut: 300,
  },
  highlight: {
    containerReset: 800,
    rowReset: 1500,
    newItemReset: 1500,
    emphasizedReset: 2000,
  },
  transition: {
    fast: 200,
    normal: 300,
    slow: 500,
    emphasized: 700,
  },
} as const;

export const SuccessTokens = {
  ring: {
    standard: "ring-2 ring-emerald-400/50",
    emphasized: "ring-4 ring-emerald-400/20",
  },
  background: {
    tint: "bg-emerald-50/30",
  },
  border: {
    standard: "border-emerald-400",
    emphasized: "border-emerald-500",
  },
  shadow: {
    standard: "shadow-emerald-100",
    emphasized: "shadow-emerald-200",
  },
  inline: {
    container: "border-emerald-200 bg-emerald-50",
    icon: "text-emerald-600",
    text: "text-emerald-800",
  },
  error: {
    container: "border-red-200 bg-red-50",
    icon: "text-red-600",
    text: "text-red-800",
  },
} as const;

export const ButtonMotionTokens = {
  colorTransition: 200,
} as const;

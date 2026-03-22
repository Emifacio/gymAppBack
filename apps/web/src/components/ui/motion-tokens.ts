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
    standard: "ring-2 ring-[var(--success)]/50",
    emphasized: "ring-4 ring-[var(--success)]/20",
  },
  background: {
    tint: "bg-[var(--success-soft)]/30",
  },
  border: {
    standard: "border-[var(--success)]",
    emphasized: "border-[var(--success)]",
  },
  shadow: {
    standard: "shadow-[var(--success-soft)]",
    emphasized: "shadow-[var(--success-soft)]",
  },
  inline: {
    container: "border-[var(--success-soft)] bg-[var(--success-soft)] rounded-xl border",
    icon: "text-[var(--success)]",
    text: "text-[var(--success)]",
  },
  error: {
    container: "border-[var(--danger-soft)] bg-[var(--danger-soft)] rounded-xl border",
    icon: "text-[var(--danger)]",
    text: "text-[var(--danger)]",
  },
} as const;

export const ButtonMotionTokens = {
  colorTransition: 200,
} as const;

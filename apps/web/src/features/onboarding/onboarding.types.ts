export interface OnboardingPopoverConfig {
  title?: string;
  description?: string | HTMLElement;
  side?: "left" | "right" | "top" | "bottom";
  align?: "start" | "center" | "end";
  show?: boolean;
  onNextClick?: () => void;
}

export interface OnboardingStepDefinition {
  id: string;
  route: string;
  selector: string;
  popover: OnboardingPopoverConfig;
  isOptional?: boolean;
  canRun?: () => boolean;
}

export type OnboardingRunState =
  | "idle"
  | "starting"
  | "waiting_for_element"
  | "showing_step"
  | "navigating"
  | "completing"
  | "aborting"
  | "completed"
  | "closed";

export interface OnboardingTransitionResult {
  success: boolean;
  reason?: string;
}

export interface OnboardingControllerOptions {
  userId?: string | null;
  onComplete: () => void;
  onClose: () => void;
  onAbort: (reason: string) => void;
  onStepChange?: (stepIndex: number, totalSteps: number) => void;
}

export interface OnboardingWaitOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

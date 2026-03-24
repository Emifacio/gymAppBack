import { useState } from "react";

import {
  publicOnboardingStore,
  type OnboardingCompletionStore
} from "@/features/public-onboarding/public-onboarding.store";

export function usePublicOnboarding(store: OnboardingCompletionStore = publicOnboardingStore) {
  const [isCompleted, setIsCompleted] = useState(() => store.hasCompleted());

  const complete = () => {
    store.markCompleted();
    setIsCompleted(true);
  };

  const reset = () => {
    store.reset();
    setIsCompleted(false);
  };

  return {
    complete,
    isCompleted,
    reset
  };
}

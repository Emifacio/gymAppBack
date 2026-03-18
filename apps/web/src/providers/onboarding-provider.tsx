import { type PropsWithChildren } from "react";
import { useOnboarding } from "@/features/onboarding/useOnboarding";

export function OnboardingProvider({ children }: PropsWithChildren) {
  useOnboarding({
    targetPath: "/dashboard",
  });

  return <>{children}</>;
}

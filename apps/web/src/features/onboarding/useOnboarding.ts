import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingSteps } from "./onboarding.steps";
import { hasSeenTour, resetTour } from "./onboarding.store";
import { useAuth } from "@/hooks/use-auth";
import type { OnboardingController } from "./onboarding.controller";

declare global {
  interface Window {
    resetOnboardingTour?: () => void;
  }
}

let hasStartedGlobally = false;

export interface UseOnboardingOptions {
  devMode?: boolean;
}

export function useOnboarding({ devMode = false }: UseOnboardingOptions = {}) {
  const { session } = useAuth();
  const memberId = session?.member?.id;
  const memberRole = session?.member?.role;
  const navigate = useNavigate();
  const controllerRef = useRef<OnboardingController | null>(null);
  const hasStarted = useRef(false);

  const isMember = memberRole === "member";

  const destroyController = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.destroy();
      controllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (devMode) {
      window.resetOnboardingTour = () => {
        console.log("[Onboarding] Dev reset triggered");
        destroyController();
        resetTour(memberId ?? undefined);
        hasStartedGlobally = false;
        hasStarted.current = false;
      };
    }

    if (!isMember) {
      console.log("[Onboarding] Skipped: not a member role");
      return;
    }

    if (hasStarted.current || hasStartedGlobally) {
      return;
    }

    if (hasSeenTour(memberId ?? undefined)) {
      console.log("[Onboarding] Skipped: already completed");
      return;
    }

    hasStarted.current = true;
    hasStartedGlobally = true;

    const steps = getOnboardingSteps();
    if (steps.length === 0) {
      console.log("[Onboarding] No steps defined, skipping");
      return;
    }

    console.log("[Onboarding] Initializing controller");

    void (async () => {
      try {
        const { OnboardingController } = await import("./onboarding.controller");
        if (isCancelled) {
          hasStarted.current = false;
          hasStartedGlobally = false;
          return;
        }

        const controller = new OnboardingController(
          steps,
          (path) => {
            void navigate(path);
          },
          {
            userId: memberId ?? null,
            onComplete: () => {
              console.log("[Onboarding] Tour completed");
              destroyController();
            },
            onClose: () => {
              console.log("[Onboarding] Tour closed early");
              destroyController();
            },
            onAbort: (reason) => {
              console.warn("[Onboarding] Tour aborted:", reason);
              destroyController();
            },
            onStepChange: (index, total) => {
              console.log(`[Onboarding] Step ${index + 1}/${total}`);
            }
          }
        );

        controllerRef.current = controller;

        setTimeout(() => {
          if (controllerRef.current === controller) {
            controller.start();
          }
        }, 500);
      } catch (error) {
        console.warn("[Onboarding] Failed to initialize controller", error);
        hasStarted.current = false;
        hasStartedGlobally = false;
      }
    })();

    return () => {
      isCancelled = true;
      if (devMode) {
        delete window.resetOnboardingTour;
      }
      destroyController();
      hasStarted.current = false;
      hasStartedGlobally = false;
    };
  }, [memberId, memberRole, isMember, destroyController, devMode, navigate]);
}

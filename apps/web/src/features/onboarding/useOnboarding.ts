import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getDriver, destroyDriver } from "./onboarding.driver";
import { hasSeenTour, resetTour } from "./onboarding.store";
import { getOnboardingSteps } from "./onboarding.steps";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    resetOnboardingTour?: () => void;
  }
}

let hasStartedGlobally = false;

export interface UseOnboardingOptions {
  targetPath?: string;
  shouldRun?: (pathname: string) => boolean;
  devMode?: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;

function waitForElement(selector: string, timeout = DEFAULT_TIMEOUT_MS): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const interval = 50;
    let elapsed = 0;

    const timer = window.setInterval(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
        return;
      }

      elapsed += interval;
      if (elapsed >= timeout) {
        clearInterval(timer);
        reject(new Error(`Element not found: ${selector}`));
      }
    }, interval);
  });
}

export function useOnboarding({ targetPath = "/dashboard", shouldRun, devMode = false }: UseOnboardingOptions = {}) {
  const { session } = useAuth();
  const memberId = session?.member?.id;
  const { pathname } = useLocation();
  const hasStarted = useRef(false);

  const effectiveShouldRun = useMemo(() => {
    return shouldRun ?? ((path: string) => path === targetPath);
  }, [shouldRun, targetPath]);

  useEffect(() => {
    if (devMode) {
      window.resetOnboardingTour = () => {
        console.log("Onboarding: resetTour() called");
        resetTour(memberId);
      };
    }

    if (!effectiveShouldRun(pathname)) {
      return;
    }

    if (hasStarted.current || hasStartedGlobally) {
      return;
    }

    if (hasSeenTour(memberId)) {
      console.log("Onboarding skipped: already completed");
      return;
    }

    hasStarted.current = true;
    hasStartedGlobally = true;

    const driverInstance = getDriver(memberId);

    let isMounted = true;

    const startTour = async () => {
      try {
        const steps = getOnboardingSteps();
        const firstElementSelector = steps
          .map((step) => step.element)
          .find((selector): selector is string => typeof selector === "string");

        if (firstElementSelector) {
          await waitForElement(firstElementSelector, DEFAULT_TIMEOUT_MS);
        }

        if (!isMounted) return;

        console.log("Onboarding started");
        driverInstance.drive();
      } catch (error) {
        console.error("Onboarding start failed", error);
        destroyDriver();
      }
    };

    void startTour();

    return () => {
      isMounted = false;
      destroyDriver();

      hasStarted.current = false;
      hasStartedGlobally = false;

      if (devMode) {
        delete window.resetOnboardingTour;
      }
    };
  }, [pathname, effectiveShouldRun, devMode, memberId]);
}

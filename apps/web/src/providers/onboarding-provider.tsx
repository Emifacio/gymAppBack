import { useCallback, useEffect, useRef, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import { createOnboardingTour } from "@/lib/onboarding-tour";
import type { OnboardingMetadata } from "@/types/gym";

const waitForElement = async (selector: string, timeoutMs = 8000): Promise<HTMLElement | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) return el;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
};

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const updateMember = useUpdateMember();
  const startedRef = useRef(false);

  const safeNavigate = useCallback((to: string): void => {
    void navigate(to);
  }, [navigate]);

  useEffect(() => {
    if (!session || !session.member) return;

    const storageKey = `onboarding_completed:${session.member.id}`;
    const persisted = window.localStorage.getItem(storageKey);

    const rawMetadata = (session.member as { profile_metadata?: OnboardingMetadata }).profile_metadata;
    const metadata: OnboardingMetadata =
      rawMetadata && typeof rawMetadata === "object" ? rawMetadata : {};

    const isCompleted = Boolean(metadata.onboarding_completed) || persisted === "true";

    if (startedRef.current || pathname === "/login" || isCompleted) {
      return;
    }

    startedRef.current = true;

    const tour = createOnboardingTour({
      navigate: safeNavigate,
      onComplete: () => {
        try {
          window.localStorage.setItem(storageKey, "true");
        } catch {
          // client may block localStorage in private mode
        }
      }
    });

    const timeout = setTimeout(() => {
      void (async () => {
        if (pathname !== "/dashboard") {
          safeNavigate("/dashboard");
        }

        const el = await waitForElement("#tour-credits");
        if (!el) {
          console.warn("Onboarding tour: #tour-credits not found, skipping tour start.");
          return;
        }

        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        await new Promise((resolve) => setTimeout(resolve, 250));
        tour.drive();
      })();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [session, pathname, updateMember, safeNavigate]);

  return <>{children}</>;
}

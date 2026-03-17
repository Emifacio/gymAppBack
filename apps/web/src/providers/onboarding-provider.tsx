import { useEffect, useRef, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import { createOnboardingTour } from "@/lib/onboarding-tour";

const waitForElement = async (selector: string, timeoutMs = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el as HTMLElement;
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

  useEffect(() => {
    if (!session || !session.member) return;

    const metadata = (session.member as any).profile_metadata || {};
    const storageKey = `onboarding_completed:${session.member.id}`;
    const isCompleted = Boolean(metadata.onboarding_completed) || window.localStorage.getItem(storageKey) === "true";

    if (startedRef.current) return;
    if (pathname === "/login") return;

    if (!isCompleted) {
      startedRef.current = true;
      const tour = createOnboardingTour({
        navigate,
        onComplete: async () => {
          try {
            window.localStorage.setItem(storageKey, "true");
          } catch {
            // ignore (private mode / blocked storage)
          }

        try {
          await updateMember.mutateAsync({
            memberId: session.member.id,
            data: {
              profile_metadata: { onboarding_completed: true }
            }
          } as any);
        } catch (error) {
          console.error("Failed to persist onboarding status:", error);
        }
        },
      });

      // Start the tour with a small delay to ensure rendering is complete
      const timeout = setTimeout(() => {
        void (async () => {
          if (pathname !== "/dashboard") {
            navigate("/dashboard");
          }

          const el = await waitForElement("#tour-credits");
          if (!el) {
            console.warn("Onboarding tour: #tour-credits not found, skipping tour start.");
            return;
          }

          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });

          // Give layout a beat after scroll for correct popover placement.
          await new Promise((resolve) => setTimeout(resolve, 250));
          tour.drive();
        })();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [session, pathname, updateMember, navigate]);

  return <>{children}</>;
}

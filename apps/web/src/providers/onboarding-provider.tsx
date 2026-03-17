import { useEffect, useRef, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import { createOnboardingTour } from "@/lib/onboarding-tour";

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
        if (pathname !== "/dashboard") {
          navigate("/dashboard");
        }
        tour.drive();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [session, pathname, updateMember, navigate]);

  return <>{children}</>;
}

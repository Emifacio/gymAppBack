import { useEffect, type PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateMember } from "@/hooks/use-workouts";
import { createOnboardingTour } from "@/lib/onboarding-tour";

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const updateMember = useUpdateMember();

  useEffect(() => {
    if (!session || !session.member) return;

    const metadata = (session.member as any).profile_metadata || {};
    const isCompleted = metadata.onboarding_completed;

    if (!isCompleted && pathname === "/dashboard") {
      const tour = createOnboardingTour(async () => {
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
      });

      // Start the tour with a small delay to ensure rendering is complete
      const timeout = setTimeout(() => {
        tour.drive();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [session, pathname, updateMember]);

  return <>{children}</>;
}

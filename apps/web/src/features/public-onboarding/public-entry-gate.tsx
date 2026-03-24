import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { LoadingScreen } from "@/components/loading-screen";
import { PublicOnboardingCarousel } from "@/features/public-onboarding/public-onboarding-carousel";
import { usePublicOnboarding } from "@/features/public-onboarding/use-public-onboarding";
import { useAuth } from "@/hooks/use-auth";

export function PublicEntryGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isHydrated, session } = useAuth();
  const { complete, isCompleted } = usePublicOnboarding();

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (!isHydrated) {
    return <LoadingScreen label="Preparando tu acceso..." />;
  }

  if (session) {
    return <Navigate replace to={redirectTo} />;
  }

  if (!isCompleted) {
    return (
      <PublicOnboardingCarousel
        onComplete={() => {
          complete();
          void navigate("/login", {
            replace: true,
            state: location.state
          });
        }}
      />
    );
  }

  return <Outlet />;
}

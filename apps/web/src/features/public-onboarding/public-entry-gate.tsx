import { lazy, Suspense } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppLoader } from "@/components/app-loader";
import { LoadingScreen } from "@/components/loading-screen";
import { usePublicOnboarding } from "@/features/public-onboarding/use-public-onboarding";
import { useAuth } from "@/hooks/use-auth";

const PublicOnboardingCarousel = lazy(() =>
  import("@/features/public-onboarding/public-onboarding-carousel").then((module) => ({
    default: module.PublicOnboardingCarousel
  }))
);

export function PublicEntryGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isHydrated, session } = useAuth();
  const { complete, isCompleted } = usePublicOnboarding();
  const routeState = location.state as { from?: { pathname?: string } } | null;

  const redirectTo = routeState?.from?.pathname ?? "/";

  if (!isHydrated) {
    return <LoadingScreen label="Preparando tu acceso..." />;
  }

  if (session) {
    return <Navigate replace to={redirectTo} />;
  }

  if (!isCompleted) {
    return (
      <Suspense fallback={<AppLoader fullScreen label="Preparando tu bienvenida a ATLHYT..." />}>
        <PublicOnboardingCarousel
          onComplete={() => {
            complete();
            void navigate("/login", {
              replace: true,
              state: routeState
            });
          }}
        />
      </Suspense>
    );
  }

  return <Outlet />;
}

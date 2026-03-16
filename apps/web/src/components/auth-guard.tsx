import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/hooks/use-auth";

export function AuthGuard() {
  const location = useLocation();
  const { isHydrated, session } = useAuth();

  if (!isHydrated) {
    return <LoadingScreen label="Syncing your training workspace..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

import { createBrowserRouter, Navigate } from "react-router-dom";
import { ErrorFallback } from "@/components/error-handling/ErrorFallback";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { AttendancePage } from "@/pages/attendance-page";
import { BookingsPage } from "@/pages/bookings-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { IntegrationsPage } from "@/pages/integrations-page";
import { LoginPage } from "@/pages/login-page";
import { MemberDetailPage } from "@/pages/member-detail-page";
import { MembersPage } from "@/pages/members-page";
import { PlansPage } from "@/pages/plans-page";
import { ProfilePage } from "@/pages/profile-page";
import { RegisterPage } from "@/pages/register-page";
import { WorkoutDetailPage } from "@/pages/workout-detail-page";
import { WorkoutsPage } from "@/pages/workouts-page";
import { OnboardingProvider } from "@/providers/onboarding-provider";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <ErrorFallback />
  },
  {
    path: "/register",
    element: <RegisterPage />,
    errorElement: <ErrorFallback />
  },
  {
    element: (
      <OnboardingProvider>
        <AuthGuard />
      </OnboardingProvider>
    ),
    errorElement: <ErrorFallback />,
    children: [
      {
        element: <DashboardLayout />,
        errorElement: <ErrorFallback />,
        children: [
          {
            index: true,
            element: <DashboardPage />
          },
          {
            path: "/profile",
            element: <ProfilePage />
          },
          {
            path: "/workouts",
            element: <WorkoutsPage />
          },
          {
            path: "/workouts/:workoutId",
            element: <WorkoutDetailPage />
          },
          {
            path: "/bookings",
            element: <BookingsPage />
          },
          {
            path: "/members",
            element: <MembersPage />
          },
          {
            path: "/plans",
            element: <PlansPage />
          },
          {
            path: "/members/:memberId",
            element: <MemberDetailPage />
          },
          {
            path: "/attendance",
            element: <AttendancePage />
          },
          {
            path: "/integrations",
            element: <IntegrationsPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

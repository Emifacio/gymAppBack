import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLoader } from "@/components/app-loader";
import { ErrorFallback } from "@/components/error-handling/ErrorFallback";
import { AuthGuard } from "@/components/auth-guard";
import { PublicEntryGate } from "@/features/public-onboarding/public-entry-gate";

function lazyPage<T extends ComponentType<object>>(loader: () => Promise<{ default: T }>) {
  return lazy(loader);
}

function routeElement(element: ReactNode, fullScreen = false) {
  return <Suspense fallback={<AppLoader fullScreen={fullScreen} />}>{element}</Suspense>;
}

const DashboardLayout = lazyPage(() =>
  import("@/layouts/dashboard-layout").then((module) => ({
    default: module.DashboardLayout
  }))
);

const AttendancePage = lazyPage(() =>
  import("@/pages/attendance-page").then((module) => ({
    default: module.AttendancePage
  }))
);

const BookingsPage = lazyPage(() =>
  import("@/pages/bookings-page").then((module) => ({
    default: module.BookingsPage
  }))
);

const DashboardPage = lazyPage(() =>
  import("@/pages/dashboard-page").then((module) => ({
    default: module.DashboardPage
  }))
);

const LoginPage = lazyPage(() =>
  import("@/pages/login-page").then((module) => ({
    default: module.LoginPage
  }))
);

const MemberDetailPage = lazyPage(() =>
  import("@/pages/member-detail-page").then((module) => ({
    default: module.MemberDetailPage
  }))
);

const MembersPage = lazyPage(() =>
  import("@/pages/members-page").then((module) => ({
    default: module.MembersPage
  }))
);

const PlansPage = lazyPage(() =>
  import("@/pages/plans-page").then((module) => ({
    default: module.PlansPage
  }))
);

const ProfilePage = lazyPage(() =>
  import("@/pages/profile-page").then((module) => ({
    default: module.ProfilePage
  }))
);

const RegisterPage = lazyPage(() =>
  import("@/pages/register-page").then((module) => ({
    default: module.RegisterPage
  }))
);

const WorkoutDetailPage = lazyPage(() =>
  import("@/pages/workout-detail-page").then((module) => ({
    default: module.WorkoutDetailPage
  }))
);

const WorkoutsPage = lazyPage(() =>
  import("@/pages/workouts-page").then((module) => ({
    default: module.WorkoutsPage
  }))
);

export const router = createBrowserRouter([
  {
    element: <PublicEntryGate />,
    errorElement: <ErrorFallback />,
    children: [
      {
        path: "/login",
        element: routeElement(<LoginPage />, true)
      },
      {
        path: "/register",
        element: routeElement(<RegisterPage />, true)
      }
    ]
  },
  {
    element: <AuthGuard />,
    errorElement: <ErrorFallback />,
    children: [
      {
        element: routeElement(<DashboardLayout />, true),
        errorElement: <ErrorFallback />,
        children: [
          {
            index: true,
            element: routeElement(<DashboardPage />)
          },
          {
            path: "/profile",
            element: routeElement(<ProfilePage />)
          },
          {
            path: "/workouts",
            element: routeElement(<WorkoutsPage />)
          },
          {
            path: "/workouts/:workoutId",
            element: routeElement(<WorkoutDetailPage />)
          },
          {
            path: "/bookings",
            element: routeElement(<BookingsPage />)
          },
          {
            path: "/members",
            element: routeElement(<MembersPage />)
          },
          {
            path: "/plans",
            element: routeElement(<PlansPage />)
          },
          {
            path: "/members/:memberId",
            element: routeElement(<MemberDetailPage />)
          },
          {
            path: "/attendance",
            element: routeElement(<AttendancePage />)
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

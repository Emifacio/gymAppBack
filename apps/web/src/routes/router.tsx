import { createBrowserRouter, Navigate } from "react-router-dom";

import { AuthGuard } from "@/components/auth-guard";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { DashboardPage } from "@/pages/dashboard-page";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { WorkoutDetailPage } from "@/pages/workout-detail-page";
import { WorkoutsPage } from "@/pages/workouts-page";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />
          },
          {
            path: "/workouts",
            element: <WorkoutsPage />
          },
          {
            path: "/workouts/:workoutId",
            element: <WorkoutDetailPage />
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

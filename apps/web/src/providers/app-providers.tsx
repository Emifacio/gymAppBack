import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";

import { queryClient } from "@/api/query-client";
import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    let lastForbiddenAt = 0;
    let lastUnauthorizedAt = 0;

    const handleUnauthorized = () => {
      const now = Date.now();
      if (now - lastUnauthorizedAt < 1000) return;
      lastUnauthorizedAt = now;
      window.location.href = "/login";
    };

    const handleForbidden = () => {
      const now = Date.now();
      if (now - lastForbiddenAt < 1000) return;
      lastForbiddenAt = now;
      window.alert("No estás autorizado para realizar esta acción. Por favor inicia sesión con una cuenta con permisos adecuados.");
    };

    const handleServerError = () => {
      window.alert("Se produjo un error del servidor (500). Por favor intenta nuevamente más tarde.");
    };

    window.addEventListener("gym:api-unauthorized", handleUnauthorized);
    window.addEventListener("gym:api-forbidden", handleForbidden);
    window.addEventListener("gym:api-server-error", handleServerError);

    return () => {
      window.removeEventListener("gym:api-unauthorized", handleUnauthorized);
      window.removeEventListener("gym:api-forbidden", handleForbidden);
      window.removeEventListener("gym:api-server-error", handleServerError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
    </QueryClientProvider>
  );
}

import type { AuthSession } from "@gym/api-client";
import { useEffect, useState, type PropsWithChildren } from "react";

import { sessionManager } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { AuthContext } from "@/providers/auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsubscribe = sessionManager.subscribe((nextSession) => {
      setSession(nextSession);
      setIsHydrated(true);
    });

    void sessionManager.hydrate().finally(() => {
      setIsHydrated(true);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isHydrated,
        session,
        logout: async () => {
          await sessionManager.clearSession();
          queryClient.clear();
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

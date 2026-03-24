import type { AuthSession } from "@gym/api-client";
import { createContext, useEffect, useState, type PropsWithChildren } from "react";

import { sessionManager } from "./api-client";
import { billingService } from "../services/billing.service";

interface AuthContextValue {
  isHydrated: boolean;
  session: AuthSession | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  useEffect(() => {
    async function syncBillingIdentity(nextSession: AuthSession | null) {
      try {
        if (!nextSession?.member.id) {
          await billingService.logout();
          return;
        }

        await billingService.login(nextSession.member.id);
      } catch {
        // Keep auth stable even when billing is not configured locally.
      }
    }

    void syncBillingIdentity(session);
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        isHydrated,
        session,
        logout: () => sessionManager.clearSession()
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

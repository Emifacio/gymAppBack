import type { AuthSession } from "@gym/api-client";
import { createContext, useEffect, useState, type PropsWithChildren } from "react";

import { sessionManager } from "./api-client";

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

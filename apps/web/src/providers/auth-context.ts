import { createContext } from "react";

import type { AuthSession } from "@gym/api-client";

export interface AuthContextValue {
  isHydrated: boolean;
  session: AuthSession | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

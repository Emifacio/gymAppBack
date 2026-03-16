import type { components } from "./schema";

export const DEFAULT_SESSION_STORAGE_KEY = "gym-platform.session";

type MaybePromise<T> = T | Promise<T>;

export type MemberProfile = components["schemas"]["MemberRead"];
export type TokenResponse = components["schemas"]["TokenResponse"];

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  member: MemberProfile;
  refreshToken?: string | null;
  expiresAt?: string | null;
}

export interface RefreshSessionResult {
  accessToken: string;
  tokenType?: string;
  member?: MemberProfile;
  refreshToken?: string | null;
  expiresAt?: string | null;
}

export interface SessionStorageAdapter {
  getItem(key: string): MaybePromise<string | null>;
  setItem(key: string, value: string): MaybePromise<void>;
  removeItem(key: string): MaybePromise<void>;
}

export type SessionListener = (session: AuthSession | null) => void;
export type RefreshHandler = (context: { session: AuthSession }) => Promise<RefreshSessionResult | null>;

export interface SessionManagerOptions {
  storage: SessionStorageAdapter;
  storageKey?: string;
  refresh?: RefreshHandler;
}

export function createBrowserStorageAdapter(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">
): SessionStorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key)
  };
}

export function toAuthSession(
  payload: TokenResponse,
  extras: Pick<AuthSession, "refreshToken" | "expiresAt"> = {
    refreshToken: null,
    expiresAt: null
  }
): AuthSession {
  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    member: payload.member,
    refreshToken: extras.refreshToken ?? null,
    expiresAt: extras.expiresAt ?? null
  };
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export class SessionManager {
  readonly storageKey: string;
  #storage: SessionStorageAdapter;
  #refresh: RefreshHandler | undefined = undefined;
  #session: AuthSession | null = null;
  #hydratePromise: Promise<AuthSession | null> | undefined = undefined;
  #refreshPromise: Promise<AuthSession | null> | undefined = undefined;
  #listeners = new Set<SessionListener>();

  constructor(options: SessionManagerOptions) {
    this.#storage = options.storage;
    this.#refresh = options.refresh;
    this.storageKey = options.storageKey ?? DEFAULT_SESSION_STORAGE_KEY;
  }

  subscribe(listener: SessionListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async hydrate(): Promise<AuthSession | null> {
    if (this.#session) {
      return this.#session;
    }

    if (!this.#hydratePromise) {
      this.#hydratePromise = this.#readFromStorage().finally(() => {
        this.#hydratePromise = undefined;
      });
    }

    return this.#hydratePromise;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.#session ?? this.hydrate();
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.accessToken ?? null;
  }

  hasRefreshStrategy(): boolean {
    return Boolean(this.#refresh);
  }

  async setSession(session: AuthSession): Promise<void> {
    this.#session = session;
    await Promise.resolve(this.#storage.setItem(this.storageKey, JSON.stringify(session)));
    this.#notify();
  }

  async clearSession(): Promise<void> {
    this.#session = null;
    await Promise.resolve(this.#storage.removeItem(this.storageKey));
    this.#notify();
  }

  async refreshSession(): Promise<AuthSession | null> {
    if (!this.#refresh) {
      return null;
    }

    const current = await this.getSession();
    if (!current) {
      return null;
    }

    if (!this.#refreshPromise) {
      this.#refreshPromise = this.#refresh({ session: current })
        .then(async (nextSession) => {
          if (!nextSession?.accessToken) {
            return null;
          }

          const updated: AuthSession = {
            ...current,
            ...nextSession,
            tokenType: nextSession.tokenType ?? current.tokenType,
            member: nextSession.member ?? current.member
          };

          await this.setSession(updated);
          return updated;
        })
        .finally(() => {
          this.#refreshPromise = undefined;
        });
    }

    return this.#refreshPromise;
  }

  async #readFromStorage(): Promise<AuthSession | null> {
    const raw = await Promise.resolve(this.#storage.getItem(this.storageKey));
    const session = parseSession(raw);
    this.#session = session;

    if (!session && raw) {
      await Promise.resolve(this.#storage.removeItem(this.storageKey));
    }

    this.#notify();
    return session;
  }

  #notify(): void {
    for (const listener of this.#listeners) {
      listener(this.#session);
    }
  }
}

export function createSessionManager(options: SessionManagerOptions): SessionManager {
  return new SessionManager(options);
}

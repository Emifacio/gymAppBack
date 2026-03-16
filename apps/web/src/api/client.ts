import {
  createApiClient,
  createApiHooks,
  createBrowserStorageAdapter,
  createSessionManager,
  DEFAULT_API_BASE_URL
} from "@gym/api-client";

export const sessionManager = createSessionManager({
  storage: createBrowserStorageAdapter(window.localStorage)
});

const configuredApiUrl =
  typeof import.meta.env.VITE_API_URL === "string" && import.meta.env.VITE_API_URL.trim()
    ? import.meta.env.VITE_API_URL.trim()
    : undefined;

const apiUrl = configuredApiUrl ?? (import.meta.env.DEV ? "http://localhost:8000" : undefined);

export const apiClient = createApiClient({
  baseUrl: apiUrl ?? DEFAULT_API_BASE_URL,
  sessionManager
});

export const apiHooks = createApiHooks({
  client: apiClient,
  sessionManager
});

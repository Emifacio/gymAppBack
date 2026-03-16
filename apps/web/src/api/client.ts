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

const apiUrl =
  typeof import.meta.env.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL : undefined;

export const apiClient = createApiClient({
  baseUrl: apiUrl ?? DEFAULT_API_BASE_URL,
  sessionManager
});

export const apiHooks = createApiHooks({
  client: apiClient,
  sessionManager
});

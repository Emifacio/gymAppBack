import * as SecureStore from "expo-secure-store";

import {
  createApiClient,
  createApiHooks,
  createSessionManager,
  DEFAULT_API_BASE_URL,
  type SessionStorageAdapter
} from "@gym/api-client";

const secureStoreAdapter: SessionStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key)
};

export const sessionManager = createSessionManager({
  storage: secureStoreAdapter
});

export const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_BASE_URL,
  sessionManager
});

export const apiHooks = createApiHooks({
  client: apiClient,
  sessionManager
});

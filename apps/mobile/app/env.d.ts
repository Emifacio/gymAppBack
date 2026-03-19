/// <reference types="vite/client" />

type ExpoEnv = {
  readonly EXPO_PUBLIC_GOOGLE_CLIENT_ID: string;
  readonly EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string;
  readonly EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
  readonly EXPO_PUBLIC_API_URL: string;
};

function getEnv<K extends keyof ExpoEnv>(key: K): ExpoEnv[K] {
  const value = import.meta.env[key];
  return value as ExpoEnv[K];
}

export function getGoogleClientId(): string {
  return getEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID");
}

export function getGoogleAndroidClientId(): string | undefined {
  return getEnv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID");
}

export function getGoogleIosClientId(): string | undefined {
  return getEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID");
}

export function getApiUrl(): string {
  return getEnv("EXPO_PUBLIC_API_URL");
}

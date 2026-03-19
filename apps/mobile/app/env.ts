type ExpoEnv = {
  readonly EXPO_PUBLIC_GOOGLE_CLIENT_ID: string;
  readonly EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string;
  readonly EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
  readonly EXPO_PUBLIC_API_URL: string;
};

const env = process.env as Readonly<Record<string, string | undefined>>;

function getEnv<K extends keyof ExpoEnv>(key: K): ExpoEnv[K] {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value as ExpoEnv[K];
}

export function getGoogleClientId(): string {
  return getEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID");
}

export function getGoogleAndroidClientId(): string | undefined {
  const value = env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  return value ?? undefined;
}

export function getGoogleIosClientId(): string | undefined {
  const value = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  return value ?? undefined;
}

export function getApiUrl(): string {
  return getEnv("EXPO_PUBLIC_API_URL");
}

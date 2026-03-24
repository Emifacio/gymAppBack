export interface OnboardingCompletionStore {
  hasCompleted: () => boolean;
  markCompleted: () => void;
  reset: () => void;
}

const STORAGE_KEY = "atlhyt.public-onboarding.completed";
const STORAGE_VERSION = "v1";

function getVersionedStorageKey() {
  return `${STORAGE_KEY}:${STORAGE_VERSION}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalOnboardingCompletionStore(
  storageKey = getVersionedStorageKey()
): OnboardingCompletionStore {
  return {
    hasCompleted() {
      return getStorage()?.getItem(storageKey) === "true";
    },
    markCompleted() {
      getStorage()?.setItem(storageKey, "true");
    },
    reset() {
      getStorage()?.removeItem(storageKey);
    }
  };
}

export const publicOnboardingStore = createLocalOnboardingCompletionStore();

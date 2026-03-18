const STORAGE_KEY = "onboarding_completed";
const ONBOARDING_VERSION = "v1";

const STORAGE_KEY_VERSIONED = `${STORAGE_KEY}:${ONBOARDING_VERSION}`;

function safeLocalStorageGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY_VERSIONED);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_VERSIONED, value);
  } catch {
    // ignore storage failures (private mode, blocked storage etc.)
  }
}

function safeLocalStorageRemove(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY_VERSIONED);
  } catch {
    // ignore
  }
}

export function hasSeenTour(): boolean {
  const value = safeLocalStorageGet();
  return value === "true";
}

export function completeTour(): void {
  safeLocalStorageSet("true");
}

export function resetTour(): void {
  safeLocalStorageRemove();
}

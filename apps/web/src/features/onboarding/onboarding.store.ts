const STORAGE_KEY = "onboarding_completed";
const ONBOARDING_VERSION = "v1";

function getStorageKey(userId?: string): string {
  if (userId) {
    return `${STORAGE_KEY}:${userId}:${ONBOARDING_VERSION}`;
  }
  return `${STORAGE_KEY}:${ONBOARDING_VERSION}`;
}

function getLegacyKey(userId?: string): string {
  if (userId) {
    return `${STORAGE_KEY}:${userId}`;
  }
  return STORAGE_KEY;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures (private mode, blocked storage etc.)
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function hasSeenTour(userId?: string): boolean {
  const memberKey = getStorageKey(userId);
  const legacyMemberKey = getLegacyKey(userId);
  const globalKey = getStorageKey();
  const legacyGlobalKey = getLegacyKey();

  return [memberKey, legacyMemberKey, globalKey, legacyGlobalKey].some((key) => safeLocalStorageGet(key) === "true");
}

export function completeTour(userId?: string): void {
  const memberKey = getStorageKey(userId);
  const legacyMemberKey = getLegacyKey(userId);
  const globalKey = getStorageKey();
  const legacyGlobalKey = getLegacyKey();

  safeLocalStorageSet(memberKey, "true");
  safeLocalStorageSet(legacyMemberKey, "true");
  safeLocalStorageSet(globalKey, "true");
  safeLocalStorageSet(legacyGlobalKey, "true");
}

export function resetTour(userId?: string): void {
  const memberKey = getStorageKey(userId);
  const legacyMemberKey = getLegacyKey(userId);
  const globalKey = getStorageKey();
  const legacyGlobalKey = getLegacyKey();

  safeLocalStorageRemove(memberKey);
  safeLocalStorageRemove(legacyMemberKey);
  safeLocalStorageRemove(globalKey);
  safeLocalStorageRemove(legacyGlobalKey);
}

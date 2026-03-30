import { useState, useEffect } from "react";

/**
 * useState backed by localStorage. Restores on mount, persists on change.
 * Falls back to `defaultValue` if nothing stored or on SSR.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, [key]);

  // Persist to localStorage on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }, [key, value, hydrated]);

  return [value, setValue];
}

/** Clear all chms-prefixed localStorage entries (for logout) */
export function clearPersistedState() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("chms-"));
  keys.forEach((k) => localStorage.removeItem(k));
}

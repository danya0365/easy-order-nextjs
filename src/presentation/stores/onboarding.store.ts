import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  /** shopId -> list of dismissed suggestion keys */
  dismissed: Record<string, string[]>;
  dismiss: (shopId: string, key: string) => void;
}

/**
 * Persists which "getting started" suggestions an owner has manually dismissed,
 * keyed per shop so multiple shops on one device don't bleed into each other.
 * `skipHydration` keeps the first client render matching the server (empty),
 * then the component rehydrates in an effect — no hydration mismatch.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      dismissed: {},
      dismiss: (shopId, key) =>
        set((s) => {
          const cur = s.dismissed[shopId] ?? [];
          if (cur.includes(key)) return s;
          return { dismissed: { ...s.dismissed, [shopId]: [...cur, key] } };
        }),
    }),
    { name: "es-onboarding-dismissed", version: 1, skipHydration: true },
  ),
);

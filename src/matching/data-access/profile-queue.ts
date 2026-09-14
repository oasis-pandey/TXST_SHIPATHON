/**
 * The client-side shape returned by the user recommendation API.
 *
 * It intentionally mirrors the public `profiles` row returned by the backend
 * without importing generated database types into the Expo bundle.
 */
export type UserRecommendationProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  skill_level: string | null;
  availability: string | null;
  discovery_mode: "people" | "teams" | "both";
  tech_stack: string[];
  interests: string[];
  preferred_roles: string[];
  created_at: string;
  updated_at: string;
};

export type DiscoverQueueSnapshot<T> = {
  current: T | undefined;
  next: T | undefined;
  length: number;
  position: number;
  isReady: boolean;
};

/**
 * The discover view only needs this small queue contract. A local list,
 * paginated API, or a mode-specific matcher can implement the same interface.
 */
export interface DiscoverQueue<T extends { id: string }> {
  getSnapshot(): DiscoverQueueSnapshot<T>;
  advance(expectedPosition: number): void;
  append(items: readonly T[]): void;
  reset(): void;
  replace(items: readonly T[]): void;
  subscribe(listener: () => void): () => void;
}

export type ProfileQueueSnapshot = DiscoverQueueSnapshot<UserRecommendationProfile>;
export type ProfileQueue = DiscoverQueue<UserRecommendationProfile>;

/** A ready-to-use local queue for discovery modes that do not have an API yet. */
export function createLocalDiscoverQueue<T extends { id: string }>(
  initialItems: readonly T[],
): DiscoverQueue<T> {
  let items = [...initialItems];
  let position = 0;
  const listeners = new Set<() => void>();
  let currentSnapshot: DiscoverQueueSnapshot<T>;
  const updateSnapshot = () => {
    currentSnapshot = {
    current: items[position],
    next: items[position + 1],
    length: items.length,
    position,
    isReady: true,
    };
  };
  updateSnapshot();
  const notify = () => {
    updateSnapshot();
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => currentSnapshot,
    advance(expectedPosition) {
      if (position !== expectedPosition) return;
      position = Math.min(position + 1, items.length);
      notify();
    },
    append(newItems) {
      const knownIds = new Set(items.map((item) => item.id));
      items = [...items, ...newItems.filter((item) => !knownIds.has(item.id))];
      notify();
    },
    reset() {
      position = 0;
      notify();
    },
    replace(newItems) {
      items = [...newItems];
      position = 0;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

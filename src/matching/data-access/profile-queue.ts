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
  append(profiles: readonly T[]): void;
  reset(): void;
  replace(profiles: readonly T[]): void;
  subscribe(listener: () => void): () => void;
}

export type ProfileQueueSnapshot = DiscoverQueueSnapshot<UserRecommendationProfile>;
export type ProfileQueue = DiscoverQueue<UserRecommendationProfile>;

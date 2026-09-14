export type MatchProfile = {
  name: string;
  age: number;
  distance: string;
  bio: string;
  tags: string[];
  image: string;
  color: string;
};

export type ProfileQueueSnapshot = {
  current: MatchProfile | undefined;
  next: MatchProfile | undefined;
  length: number;
  position: number;
  isReady: boolean;
};

/**
 * The discover view only needs this small queue contract. A local list,
 * paginated API, or a mode-specific matcher can implement the same interface.
 */
export interface ProfileQueue {
  getSnapshot(): ProfileQueueSnapshot;
  advance(expectedPosition: number): void;
  reset(): void;
  replace(profiles: readonly MatchProfile[]): void;
  subscribe(listener: () => void): () => void;
}

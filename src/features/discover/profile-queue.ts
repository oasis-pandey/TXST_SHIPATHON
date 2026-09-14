export type MatchProfile = {
  name: string;
  age: number;
  distance: string;
  bio: string;
  tags: string[];
  image: string;
  color: string;
};

/**
 * The discover view only needs this small queue contract. A local list,
 * paginated API, or a mode-specific matcher can implement the same interface.
 */
export interface ProfileQueue {
  current(): MatchProfile | undefined;
  peek(): MatchProfile | undefined;
  advance(): void;
  reset(): void;
  replace(profiles: readonly MatchProfile[]): void;
  subscribe(listener: () => void): () => void;
  readonly length: number;
  readonly position: number;
}

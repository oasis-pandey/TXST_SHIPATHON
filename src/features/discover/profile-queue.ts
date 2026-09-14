export type MatchProfile = {
  name: string;
  age: number;
  distance: string;
  bio: string;
  tags: readonly string[];
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
  readonly length: number;
  readonly position: number;
}

export function createProfileQueue(profiles: readonly MatchProfile[]): ProfileQueue {
  let position = 0;

  return {
    current: () => profiles[position],
    peek: () => profiles[position + 1],
    advance: () => {
      position = Math.min(position + 1, profiles.length);
    },
    reset: () => {
      position = 0;
    },
    get length() {
      return profiles.length;
    },
    get position() {
      return position;
    },
  };
}

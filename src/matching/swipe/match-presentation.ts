export type MatchPresentation = {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
};

type MatchResult = {
  matched: boolean;
};

type MatchProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type CompleteSuccessfulLikeOptions = {
  result: MatchResult;
  profile: MatchProfile;
  advance: () => Promise<boolean>;
  present: (match: MatchPresentation) => void;
};

export async function completeSuccessfulLike({
  result,
  profile,
  advance,
  present,
}: CompleteSuccessfulLikeOptions) {
  const match = result.matched
    ? {
        profileId: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      }
    : null;

  const didAdvance = await advance();
  if (didAdvance && match) present(match);

  return didAdvance;
}

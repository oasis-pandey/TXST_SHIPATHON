import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { DiscoverCard, DiscoverView } from '@/matching/discover/DiscoverFeature';
import { createReduxDiscoverQueue } from '@/matching/data-access/redux-profile-queue';
import {
  requestTeamRecommendations,
  type TeamRecommendation,
} from '@/matching/data-access/team-recommendation-service';
import { store } from '@/shared/data-access/store';

const MINIMUM_REMAINING_RECOMMENDATIONS = 3;

export default function TeamDiscoverFeature() {
  const queue = useMemo(
    () => createReduxDiscoverQueue<TeamRecommendation>(store, 'team-discover'),
    [],
  );
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestInProgress = useRef(false);
  const isInitialRequest = useRef(true);

  useEffect(() => {
    const remainingRecommendations = snapshot.length - snapshot.position;
    const shouldRequestRecommendations =
      isInitialRequest.current || remainingRecommendations < MINIMUM_REMAINING_RECOMMENDATIONS;
    if (!shouldRequestRecommendations || requestInProgress.current) return;

    requestInProgress.current = true;
    void requestTeamRecommendations()
      .then((teams) => {
        if (isInitialRequest.current) {
          queue.replace(teams);
          isInitialRequest.current = false;
        } else {
          queue.append(teams);
        }
        setError(null);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load team recommendations.');
      })
      .finally(() => {
        requestInProgress.current = false;
      });
  }, [attempt, queue, snapshot.length, snapshot.position]);

  return (
    <DiscoverView<TeamRecommendation>
      queue={queue}
      renderCard={(team, expanded) => (
        <DiscoverCard
          imageUrl={null}
          title={team.name}
          subtitle={`Up to ${team.max_members} members`}
          tags={team.tech_stack}
          description={[team.description, team.project_idea].filter(Boolean).join('\n\n')}
          expanded={expanded}
        />
      )}
      loadingMessage="Finding teams nearby…"
      emptyCopy="More teams will appear here soon."
      error={error}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

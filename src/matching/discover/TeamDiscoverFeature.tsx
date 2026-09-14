import { useMemo } from 'react';

import { DiscoverCard, DiscoverView } from '@/matching/discover/DiscoverFeature';
import {
  createLocalDiscoverQueue,
} from '@/matching/data-access/profile-queue';
import {
  SAMPLE_TEAMS,
  type TeamDiscoveryItem,
} from '@/matching/data-access/sample-team-queue';

export default function TeamDiscoverFeature() {
  const queue = useMemo(() => createLocalDiscoverQueue(SAMPLE_TEAMS), []);

  return (
    <DiscoverView<TeamDiscoveryItem>
      queue={queue}
      renderCard={(team, expanded) => (
        <DiscoverCard
          imageUrl={team.imageUrl}
          title={team.name}
          subtitle={`${team.openSpots} ${team.openSpots === 1 ? 'spot' : 'spots'} open`}
          tags={team.techStack}
          description={`${team.description}\n\n${team.projectIdea}`}
          expanded={expanded}
        />
      )}
      loadingMessage="Finding teams…"
      emptyCopy="More teams will appear here soon."
    />
  );
}

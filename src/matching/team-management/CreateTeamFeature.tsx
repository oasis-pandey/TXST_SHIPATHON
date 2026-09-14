import { useRouter } from 'expo-router';

import { createTeam } from '@/matching/data-access/team-service';
import { TeamForm } from '@/matching/ui/TeamForm';
import { PageHero, TeamScreen } from '@/matching/ui/TeamComponents';

export default function CreateTeamScreen() {
  const router = useRouter();

  return (
    <TeamScreen>
      <PageHero
        eyebrow="New team"
        title="Create your team"
        description="Set the direction now. You can update the team profile as the project develops."
      />
      <TeamForm
        submitLabel="Create team"
        onSubmit={async (draft) => {
          const teamId = await createTeam(draft);
          router.replace({ pathname: '/teams/[teamId]', params: { teamId } });
        }}
      />
    </TeamScreen>
  );
}

import { useRouter } from 'expo-router';

import { createTeam } from '@/features/teams/api';
import { TeamForm } from '@/features/teams/team-form';
import { SectionHeader, TeamScreen } from '@/features/teams/ui';

export default function CreateTeamScreen() {
  const router = useRouter();

  return (
    <TeamScreen>
      <SectionHeader title="Create a team" />
      <TeamForm
        submitLabel="Create team"
        onSubmit={async (draft) => {
          const teamId = await createTeam(draft);
          router.replace({ pathname: '/teams/[teamId]/index', params: { teamId } });
        }}
      />
    </TeamScreen>
  );
}

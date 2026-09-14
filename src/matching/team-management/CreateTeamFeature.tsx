import { useRouter } from 'expo-router';

import { createTeam } from '@/matching/data-access/team-service';
import { TeamForm } from '@/matching/ui/TeamForm';
import { SectionHeader, TeamScreen } from '@/matching/ui/TeamComponents';

export default function CreateTeamScreen() {
  const router = useRouter();

  return (
    <TeamScreen>
      <SectionHeader title="Create a team" />
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

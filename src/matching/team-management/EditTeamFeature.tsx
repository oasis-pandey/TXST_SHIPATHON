import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { getTeam, updateTeam } from '@/matching/data-access/team-service';
import { TeamForm } from '@/matching/ui/TeamForm';
import { ErrorState, LoadingState, PageHero, TeamScreen } from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

export default function EditTeamScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const router = useRouter();
  const loader = useCallback(() => getTeam(teamId), [teamId]);
  const resource = useResource(loader);

  return (
    <TeamScreen>
      {resource.data && <Stack.Screen options={{ title: `Edit ${resource.data.name}` }} />}
      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && (
        <>
          <PageHero
            eyebrow="Team settings"
            title={`Edit ${resource.data.name}`}
            description="Changes are saved to the shared team profile for every member."
          />
          <TeamForm
            includeCreatorRole={false}
            submitLabel="Save changes"
            initialValue={{
              name: resource.data.name,
              description: resource.data.description ?? '',
              projectIdea: resource.data.project_idea ?? '',
              repoUrl: resource.data.repo_url ?? '',
              techStack: resource.data.tech_stack.join(', '),
              maxMembers: resource.data.max_members as 2 | 4,
              creatorRole: '',
            }}
            onSubmit={async (draft) => {
              await updateTeam(teamId, draft);
              router.back();
            }}
          />
        </>
      )}
    </TeamScreen>
  );
}

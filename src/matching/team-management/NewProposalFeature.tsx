import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/ui/themed-text';
import { Spacing } from '@/shared/lib/theme';
import {
  createProposal,
  getCurrentUserId,
  isCurrentUserTeamMember,
  listProfiles,
} from '@/matching/data-access/team-service';
import {
  proposalTypeDescriptions,
  proposalTypeLabels,
  type ProposalType,
} from '@/matching/data-access/team-types';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  SectionHeader,
  TeamScreen,
  teamStyles,
} from '@/matching/ui/TeamComponents';
import { useResource } from '@/shared/hooks/use-resource';

const teamProposalTypes: ProposalType[] = [
  'team_swiped_user',
  'direct_invite',
  'teammate_match',
];

export default function NewProposalScreen() {
  const { teamId, path } = useLocalSearchParams<{ teamId: string; path?: ProposalType }>();
  const router = useRouter();
  const [type, setType] = useState<ProposalType>(path ?? 'team_swiped_user');
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const loader = useCallback(async () => {
    const [userId, profiles, isMember] = await Promise.all([
      getCurrentUserId(),
      listProfiles(),
      isCurrentUserTeamMember(teamId),
    ]);
    return { userId, profiles, isMember };
  }, [teamId]);
  const resource = useResource(loader);
  const candidates = useMemo(
    () => resource.data?.profiles.filter((profile) => profile.id !== resource.data?.userId) ?? [],
    [resource.data],
  );
  const availableTypes: ProposalType[] = resource.data?.isMember
    ? teamProposalTypes
    : ['user_swiped_team'];
  const effectiveType = availableTypes.includes(type) ? type : availableTypes[0];
  const selectedCandidate =
    effectiveType === 'user_swiped_team' ? resource.data?.userId : candidateId;

  const submit = async () => {
    if (!selectedCandidate) {
      setActionError('Select a candidate.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const proposalId = await createProposal(teamId, selectedCandidate, effectiveType);
      router.replace({
        pathname: '/teams/[teamId]/proposals/[proposalId]',
        params: { teamId, proposalId },
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to create proposal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeamScreen>
      <SectionHeader title="Choose a proposal path" />
      {availableTypes.map((proposalType) => (
        <Pressable key={proposalType} onPress={() => setType(proposalType)}>
          <Card>
            <View style={teamStyles.spread}>
              <ThemedText type="smallBold">{proposalTypeLabels[proposalType]}</ThemedText>
              <ThemedText type="code">
                {effectiveType === proposalType ? 'SELECTED' : ''}
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary">
              {proposalTypeDescriptions[proposalType]}
            </ThemedText>
          </Card>
        </Pressable>
      ))}

      {resource.loading && !resource.data && <LoadingState />}
      {resource.error && <ErrorState message={resource.error} />}
      {resource.data && effectiveType === 'user_swiped_team' && (
        <Card>
          <ThemedText type="smallBold">Applying as the signed-in user</ThemedText>
          <ThemedText themeColor="textSecondary">
            This path requires an existing user-to-team like created by the discovery flow.
          </ThemedText>
        </Card>
      )}
      {resource.data && effectiveType !== 'user_swiped_team' && (
        <>
          <SectionHeader title="Select candidate" />
          <View style={styles.list}>
            {candidates.map((profile) => (
              <Pressable key={profile.id} onPress={() => setCandidateId(profile.id)}>
                <Card>
                  <View style={teamStyles.spread}>
                    <ThemedText type="smallBold">{profile.display_name}</ThemedText>
                    <ThemedText type="code">
                      {candidateId === profile.id ? 'SELECTED' : ''}
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="textSecondary">
                    {profile.tech_stack.join(' · ') || 'No tech stack listed'}
                  </ThemedText>
                </Card>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {actionError && <ErrorState message={actionError} />}
      <Button
        label={
          saving ? 'Creating…' : `Create ${proposalTypeLabels[effectiveType].toLowerCase()}`
        }
        onPress={() => void submit()}
        disabled={saving || !resource.data}
      />
    </TeamScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: Spacing.two } });

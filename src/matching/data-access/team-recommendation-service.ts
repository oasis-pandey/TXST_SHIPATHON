import { getSupabase } from '@/shared/lib/supabase';

export type TeamRecommendation = {
  id: string;
  name: string;
  description: string | null;
  project_idea: string | null;
  repo_url: string | null;
  tech_stack: string[];
  max_members: number;
  created_at: string;
  updated_at: string;
};

type PopulateQueueResponse = {
  recommendations?: unknown;
};

function normalizeTeam(value: unknown): TeamRecommendation | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const team = value as Record<string, unknown>;
  if (
    typeof team.id !== 'string' ||
    typeof team.name !== 'string' ||
    (team.description !== null && typeof team.description !== 'string') ||
    (team.project_idea !== null && typeof team.project_idea !== 'string') ||
    (team.repo_url !== null && typeof team.repo_url !== 'string') ||
    typeof team.max_members !== 'number' ||
    typeof team.created_at !== 'string' ||
    typeof team.updated_at !== 'string'
  ) {
    return undefined;
  }

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    project_idea: team.project_idea,
    repo_url: team.repo_url,
    tech_stack: Array.isArray(team.tech_stack)
      ? team.tech_stack.filter((item): item is string => typeof item === 'string')
      : [],
    max_members: team.max_members,
    created_at: team.created_at,
    updated_at: team.updated_at,
  };
}

export async function requestTeamRecommendations() {
  const { data, error } = await getSupabase().functions.invoke<PopulateQueueResponse>(
    'populate-team-recommendation-queue',
    { method: 'POST' },
  );
  if (error) throw new Error('Could not load team recommendations. Please try again.');

  return Array.isArray(data?.recommendations)
    ? data.recommendations
      .map(normalizeTeam)
      .filter((team): team is TeamRecommendation => Boolean(team))
    : [];
}

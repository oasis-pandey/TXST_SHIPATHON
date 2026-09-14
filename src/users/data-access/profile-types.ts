import type { Tables } from '@/shared/types/database.types';

export type ProfileInput = Pick<Tables<'profiles'>,
  'display_name' | 'bio' | 'github_url' | 'skill_level' | 'availability' |
  'discovery_mode' | 'tech_stack' | 'interests' | 'preferred_roles'
>;

export function normalizeProfile(input: ProfileInput): ProfileInput {
  const text = (value: string | null) => value?.trim() || null;
  const tags = (values: string[]) => {
    const seen = new Set<string>();
    return values.map(value => value.trim()).filter(value => {
      if (!value || seen.has(value.toLowerCase())) return false;
      seen.add(value.toLowerCase());
      return true;
    });
  };
  return {
    display_name: input.display_name.trim(),
    bio: text(input.bio), github_url: text(input.github_url),
    skill_level: text(input.skill_level), availability: text(input.availability),
    discovery_mode: input.discovery_mode,
    tech_stack: tags(input.tech_stack), interests: tags(input.interests),
    preferred_roles: tags(input.preferred_roles),
  };
}

export function validateProfile(input: ProfileInput): Partial<Record<keyof ProfileInput, string>> {
  const errors: Partial<Record<keyof ProfileInput, string>> = {};
  if (!input.display_name || input.display_name.length > 80) errors.display_name = 'Enter a display name between 1 and 80 characters.';
  if ((input.bio?.length ?? 0) > 1000) errors.bio = 'Keep your bio under 1,000 characters.';
  if ((input.skill_level?.length ?? 0) > 80) errors.skill_level = 'Keep skill level under 80 characters.';
  if ((input.availability?.length ?? 0) > 160) errors.availability = 'Keep availability under 160 characters.';
  if (!['people', 'teams', 'both'].includes(input.discovery_mode)) errors.discovery_mode = 'Choose people, teams, or both.';
  if (input.github_url) {
    try {
      const url = new URL(input.github_url);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || url.port || !/^\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/.test(url.pathname) || url.search || url.hash) throw new Error();
    } catch {
      errors.github_url = 'Use a GitHub profile URL such as https://github.com/yourname.';
    }
  }
  for (const field of ['tech_stack', 'interests', 'preferred_roles'] as const) {
    if (input[field].length > 20 || input[field].some(value => value.length > 50)) errors[field] = 'Use up to 20 items, each 50 characters or fewer.';
  }
  return errors;
}

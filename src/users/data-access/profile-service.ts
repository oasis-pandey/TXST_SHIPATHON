import { getSupabase } from '@/shared/lib/supabase';
import type { TablesInsert } from '@/shared/types/database.types';
import { requireUser } from './auth-service';
import { normalizeProfile, validateProfile, type ProfileInput } from './profile-types';

export async function getMyProfile() {
  const user = await requireUser();
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw new Error('Could not load your profile. Please try again.');
  return data;
}

export async function createProfile(input: ProfileInput) {
  const values = normalizeProfile(input);
  const errors = validateProfile(values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const user = await requireUser();
  const row = { ...values, id: user.id } satisfies TablesInsert<'profiles'>;
  const { data, error } = await getSupabase().from('profiles').insert(row).select('*').single();
  if (error) {
    // A retry after a lost response must not overwrite an already-created profile.
    if (error.code === '23505') {
      const existing = await getMyProfile();
      if (existing) return existing;
    }
    throw new Error('Could not save your profile. Check your connection and try again.');
  }
  return data;
}

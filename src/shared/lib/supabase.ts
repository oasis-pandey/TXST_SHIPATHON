import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/shared/types/database.types';

let client: SupabaseClient<Database> | undefined;

export function getSupabase() {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('PairUp cannot connect right now. Please check the app configuration.');

  const instance = createClient<Database>(url, key, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  if (Platform.OS !== 'web') {
    const refresh = (state: string) => {
      if (state === 'active') instance.auth.startAutoRefresh();
      else instance.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    AppState.addEventListener('change', refresh);
  }
  client = instance;
  return client;
}

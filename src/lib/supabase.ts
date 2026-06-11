// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@/types/database.types';

const SUPABASE_URL = 'https://ecywltvkxaebdbcdokbz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeXdsdHZreGFlYmRiY2Rva2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODEzMTIsImV4cCI6MjA5Njc1NzMxMn0.n48f5poiDK0981o6323sm7W9zD0trz_QaK_DwuX9bV8';

import { Platform } from 'react-native';

const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

const customStorage = {
  getItem: async (key: string) => {
    if (isSSR) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (isSSR) return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isSSR) return;
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

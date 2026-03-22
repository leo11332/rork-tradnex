import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const FALLBACK_URL = 'https://gxdkmlxcmlvijkzjnsao.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4ZGttbHhjbWx2aWprempuc2FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzQ3MjAsImV4cCI6MjA4OTc1MDcyMH0.ChVVhwECoKl7NnPjlkiHguqSJkLphr5sEZx9VlPhqpA';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL).trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('dummy')
);

console.log('[supabase] init', {
  isConfigured: isSupabaseConfigured,
  url: supabaseUrl ? supabaseUrl.substring(0, 40) : '(empty)',
  hasKey: Boolean(supabaseAnonKey),
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : '(empty)',
});

function buildClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    console.log('[supabase] Not configured – using dummy client (auth will be local-only)');
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  console.log('[supabase] Creating real client for', supabaseUrl);
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export const supabase = buildClient();

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; debug?: string }> {
  const debug = `URL=${supabaseUrl ? supabaseUrl.substring(0, 45) + '...' : '(vide)'} | Key=${supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : '(vide)'} | configured=${isSupabaseConfigured}`;
  console.log('[supabase] testConnection debug:', debug);

  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase non configuré (URL ou clé manquante)', debug };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const testUrl = `${supabaseUrl}/auth/v1/settings`;
    console.log('[supabase] fetching:', testUrl);
    const res = await fetch(testUrl, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    console.log('[supabase] response status:', res.status);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log('[supabase] error body:', body);
      return { ok: false, message: `Supabase a répondu ${res.status}`, debug };
    }
    return { ok: true, message: 'Connexion OK', debug };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('[supabase] testConnection error:', msg);
    if (msg.includes('abort')) {
      return { ok: false, message: 'Timeout – le projet Supabase est peut-être en pause.', debug };
    }
    return { ok: false, message: `Erreur réseau : ${msg}`, debug };
  }
}

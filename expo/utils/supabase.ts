import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

console.log('[supabase] init', {
  hasUrl: Boolean(SUPABASE_URL),
  urlPrefix: SUPABASE_URL ? SUPABASE_URL.substring(0, 40) : '(empty)',
  hasKey: Boolean(SUPABASE_KEY),
});

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('placeholder'),
  );
}

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    console.log('[supabase] Not configured – using dummy client');
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  console.log('[supabase] Creating real client for', SUPABASE_URL.substring(0, 40));
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = buildClient();
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as Function).bind(client);
    }
    return value;
  },
});

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; debug?: string }> {
  const configured = isSupabaseConfigured();
  const debug = `URL=${SUPABASE_URL ? SUPABASE_URL.substring(0, 45) + '...' : '(vide)'} | Key=${SUPABASE_KEY ? 'present' : '(vide)'} | configured=${configured}`;
  console.log('[supabase] testConnection debug:', debug);

  if (!configured) {
    return { ok: false, message: 'Supabase non configuré (URL ou clé manquante)', debug };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const testUrl = `${SUPABASE_URL}/auth/v1/settings`;
    const res = await fetch(testUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { ok: false, message: `Supabase a répondu ${res.status}`, debug };
    }
    return { ok: true, message: 'Connexion OK', debug };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort')) {
      return { ok: false, message: 'Timeout – le projet Supabase est peut-être en pause.', debug };
    }
    return { ok: false, message: `Erreur réseau : ${msg}`, debug };
  }
}

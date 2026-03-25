import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { getEnv } from '@/utils/env';

function resolveSupabaseUrl(): string {
  const fromProcessEnv = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  if (fromProcessEnv && fromProcessEnv.startsWith('https://')) return fromProcessEnv;

  const fromGetEnv = getEnv('EXPO_PUBLIC_SUPABASE_URL').trim();
  if (fromGetEnv && fromGetEnv.startsWith('https://')) return fromGetEnv;

  return '';
}

function resolveSupabaseKey(): string {
  const fromProcessEnv = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (fromProcessEnv && fromProcessEnv.length > 10) return fromProcessEnv;

  const fromGetEnv = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY').trim();
  if (fromGetEnv && fromGetEnv.length > 10) return fromGetEnv;

  return '';
}

let _url = '';
let _key = '';
let _resolved = false;

function ensureResolved() {
  if (_resolved) return;
  _resolved = true;
  _url = resolveSupabaseUrl();
  _key = resolveSupabaseKey();
  console.log('[supabase] resolved', {
    url: _url ? _url.substring(0, 40) : '(empty)',
    hasKey: Boolean(_key),
    keyPrefix: _key ? _key.substring(0, 20) + '...' : '(empty)',
  });
}

export function isSupabaseConfigured(): boolean {
  ensureResolved();
  return Boolean(
    _url &&
    _key &&
    _url.startsWith('https://') &&
    !_url.includes('placeholder') &&
    !_url.includes('dummy'),
  );
}

let _client: SupabaseClient | null = null;

function buildClient(): SupabaseClient {
  ensureResolved();
  if (!isSupabaseConfigured()) {
    console.log('[supabase] Not configured – using dummy client (auth will be local-only)');
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  console.log('[supabase] Creating real client for', _url);
  return createClient(_url, _key, {
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
  ensureResolved();
  const configured = isSupabaseConfigured();
  const debug = `URL=${_url ? _url.substring(0, 45) + '...' : '(vide)'} | Key=${_key ? _key.substring(0, 15) + '...' : '(vide)'} | configured=${configured}`;
  console.log('[supabase] testConnection debug:', debug);

  if (!configured) {
    return { ok: false, message: 'Supabase non configuré (URL ou clé manquante)', debug };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const testUrl = `${_url}/auth/v1/settings`;
    console.log('[supabase] fetching:', testUrl);
    const res = await fetch(testUrl, {
      headers: {
        apikey: _key,
        Authorization: `Bearer ${_key}`,
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

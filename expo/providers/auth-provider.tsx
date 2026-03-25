import createContextHook from '@nkzw/create-context-hook';
import { Session, User } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { supabase, isSupabaseConfigured } from '@/utils/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUpMutation: ReturnType<typeof useMutation<void, Error, { email: string; password: string }>>;
  signInMutation: ReturnType<typeof useMutation<void, Error, { email: string; password: string }>>;
  signOutMutation: ReturnType<typeof useMutation<void, Error, void>>;
  resetPasswordMutation: ReturnType<typeof useMutation<void, Error, { email: string }>>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      if (!isSupabaseConfigured()) {
        console.log('[auth] sessionQuery:skipped (not configured)');
        return null;
      }
      console.log('[auth] sessionQuery:fetching');
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 8000),
      );
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeout,
        ]);
        if (result.error) {
          console.log('[auth] sessionQuery:error', result.error.message);
          throw result.error;
        }
        console.log('[auth] sessionQuery:success', { hasSession: Boolean(result.data.session) });
        return result.data.session;
      } catch (e) {
        console.log('[auth] sessionQuery:timeout or error', e);
        return null;
      }
    },
    staleTime: Infinity,
    retry: 0,
    enabled: isSupabaseConfigured(),
  });

  useEffect(() => {
    if (sessionQuery.data !== undefined) {
      setSession(sessionQuery.data);
      setUser(sessionQuery.data?.user ?? null);
    }
  }, [sessionQuery.data]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.log('[auth] onAuthStateChange:skipped (not configured)');
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      console.log('[auth] onAuthStateChange', _event, { hasSession: Boolean(nextSession) });
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      queryClient.setQueryData(['auth', 'session'], nextSession);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signUpMutation = useMutation<void, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      console.log('[auth] signUp:start', { email });
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.log('[auth] signUp:error', error.message);
        throw error;
      }
      console.log('[auth] signUp:success', { hasSession: Boolean(data.session) });
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        queryClient.setQueryData(['auth', 'session'], data.session);
      }
    },
  });

  const signInMutation = useMutation<void, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      console.log('[auth] signIn:start', { email });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.log('[auth] signIn:error', error.message);
        throw error;
      }
      console.log('[auth] signIn:success', { hasSession: Boolean(data.session) });
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        queryClient.setQueryData(['auth', 'session'], data.session);
      }
    },
  });

  const signOutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      console.log('[auth] signOut:start');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('[auth] signOut:error', error.message);
        throw error;
      }
      console.log('[auth] signOut:success');
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const resetPasswordMutation = useMutation<void, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      console.log('[auth] resetPassword:start', { email });
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.log('[auth] resetPassword:error', error.message);
        throw error;
      }
      console.log('[auth] resetPassword:success');
    },
  });

  const isAuthenticated = Boolean(session?.user);
  const isLoading = sessionQuery.isLoading;

  return useMemo(() => ({
    session,
    user,
    isAuthenticated,
    isLoading,
    signUpMutation,
    signInMutation,
    signOutMutation,
    resetPasswordMutation,
  }), [
    session,
    user,
    isAuthenticated,
    isLoading,
    signUpMutation,
    signInMutation,
    signOutMutation,
    resetPasswordMutation,
  ]);
});

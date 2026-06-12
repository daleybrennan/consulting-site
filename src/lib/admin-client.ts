'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/browser';

type AuthState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; session: Session };

export function useAdminAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) {
      setState({ status: 'unconfigured' });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setState(
        data.session
          ? { status: 'signed-in', session: data.session }
          : { status: 'signed-out' }
      );
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(
        session ? { status: 'signed-in', session } : { status: 'signed-out' }
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getBrowserClient();
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => {
    await getBrowserClient()?.auth.signOut();
  }, []);

  return { state, signIn, signOut };
}

/** Fetch wrapper that attaches the current access token. */
export async function authedFetch(
  token: string,
  input: string,
  init?: RequestInit
) {
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

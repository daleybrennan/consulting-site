'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Anon-key browser client, used only by the admin login + dashboard.
let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (cached) return cached;
  cached = createClient(url, key);
  return cached;
}

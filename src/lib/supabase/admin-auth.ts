import { NextResponse } from 'next/server';
import { getServiceClient, isSupabaseConfigured } from './server';

/**
 * Verifies the Bearer access token on an admin request against Supabase Auth,
 * and (if ADMIN_EMAIL is set) restricts to that single email.
 * Returns the user email on success, or a NextResponse error to return.
 */
export async function requireAdmin(
  req: Request
): Promise<{ email: string } | NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'not_configured' },
      { status: 503 }
    );
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const allowed = process.env.ADMIN_EMAIL?.toLowerCase();
  if (allowed && data.user.email.toLowerCase() !== allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return { email: data.user.email };
}

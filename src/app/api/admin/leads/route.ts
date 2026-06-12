import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-auth';
import { getServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, created_at, company_name, contact_name, contact_email, brand_category, stage, locale, status'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }
  return NextResponse.json({ leads: data ?? [] });
}

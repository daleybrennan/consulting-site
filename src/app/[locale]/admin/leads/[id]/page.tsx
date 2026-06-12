'use client';

import { use } from 'react';
import { AdminGate } from '@/components/admin/AdminGate';
import { LeadDetail } from '@/components/admin/LeadDetail';

export default function AdminLeadPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = use(params);
  return (
    <AdminGate>
      {({ token }) => (
        <LeadDetail token={token} id={id} localePrefix={`/${locale}`} />
      )}
    </AdminGate>
  );
}

'use client';

import { use } from 'react';
import { AdminGate } from '@/components/admin/AdminGate';
import { LeadsList } from '@/components/admin/LeadsList';

export default function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  return (
    <AdminGate>
      {({ token, signOut }) => (
        <LeadsList token={token} signOut={signOut} localePrefix={`/${locale}`} />
      )}
    </AdminGate>
  );
}

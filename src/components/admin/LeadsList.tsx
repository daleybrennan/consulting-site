'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/admin-client';

type Row = {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  brand_category: string;
  stage: string;
  locale: string;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  researching: 'bg-amber-100 text-amber-800',
  pending_review: 'bg-accent/15 text-accent',
  sent: 'bg-green-100 text-green-800',
  scheduled_call: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-200 text-gray-700',
  archived: 'bg-gray-100 text-gray-500',
};

export function LeadsList({
  token,
  signOut,
  localePrefix,
}: {
  token: string;
  signOut: () => void;
  localePrefix: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch(token, '/api/admin/leads')
      .then((r) => r.json())
      .then((d) => setRows(d.leads ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Leads</h1>
        <button
          onClick={signOut}
          className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          Sign out
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-muted">No leads yet.</p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Contact</th>
                <th className="hidden px-4 py-3 sm:table-cell">Category</th>
                <th className="hidden px-4 py-3 md:table-cell">Stage</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 lg:table-cell">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-paper">
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition-colors hover:bg-surface"
                  onClick={() => {
                    window.location.href = `${localePrefix}/admin/leads/${r.id}`;
                  }}
                >
                  <td className="px-4 py-3 font-medium">{r.company_name}</td>
                  <td className="px-4 py-3 text-muted">
                    {r.contact_name}
                    <span className="ml-1 text-xs text-muted/70">
                      ({r.locale})
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {r.brand_category}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {r.stage}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted lg:table-cell">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

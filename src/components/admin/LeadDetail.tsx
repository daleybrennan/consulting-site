'use client';

import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/admin-client';

type ReportRow = {
  id: string;
  type: string;
  version: number;
  status: string;
  created_at: string;
  locale?: string;
  error?: string | null;
  instructions?: string | null;
  pdf_storage_path?: string | null;
  generated_content?: Record<string, { reviewerNotes?: string[] }> | null;
  research_sources?: { title?: string; url?: string }[] | null;
};

type Detail = {
  lead: Record<string, unknown> & {
    id: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    status: string;
    locale: string;
    free_text: string;
  };
  reports: ReportRow[];
  drafts: {
    id: string;
    report_id: string;
    subject: string;
    body: string;
    status: string;
  }[];
  activity: { id: string; type: string; created_at: string }[];
  pdfUrl: string | null;
};

// ---- intake field formatting ------------------------------------

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function money(amt: unknown, cur: unknown): string {
  if (amt === null || amt === undefined || amt === '') return '';
  return `${amt}${cur ? ` ${cur}` : ''}`;
}

function joinParts(...parts: unknown[]): string {
  return parts.map((p) => fmt(p)).filter(Boolean).join(', ');
}

/** Grouped, populated-only intake fields for the Application panel. */
function intakeGroups(
  lead: Detail['lead']
): { title: string; rows: [string, string][] }[] {
  const targetStructured = lead.target_country
    ? joinParts(lead.target_country) +
      (lead.target_region ? ` / ${fmt(lead.target_region)}` : '')
    : fmt(lead.target_markets);
  const submitted = lead.created_at
    ? new Date(lead.created_at as string).toLocaleString()
    : '';

  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Contact',
      rows: [
        ['Role', fmt(lead.contact_role)],
        ['Language', fmt(lead.locale).toUpperCase()],
        ['Submitted', submitted],
        ['Source', fmt(lead.source)],
        ['Consent', lead.consent === undefined ? '' : fmt(lead.consent)],
      ],
    },
    {
      title: 'Brand',
      rows: [
        ['Category', fmt(lead.brand_category)],
        ['Website', fmt(lead.brand_website)],
      ],
    },
    {
      title: 'Product',
      rows: [
        ['Wines', fmt(lead.wine_names)],
        ['Style', fmt(lead.wine_style)],
        ['Vintage', fmt(lead.vintage)],
      ],
    },
    {
      title: 'Pricing',
      rows: [
        ['EXW', money(lead.exw_price, lead.exw_currency)],
        ['Domestic shelf', money(lead.domestic_price, lead.domestic_currency)],
        ['Price positioning', fmt(lead.price_positioning)],
        ['Volume (cases)', fmt(lead.volume_cases)],
        ['Scale', fmt(lead.scale_note)],
        ['Channel', fmt(lead.channel)],
      ],
    },
    {
      title: 'Markets',
      rows: [
        ['Origin', joinParts(lead.origin_region, lead.origin_country)],
        ['Sells today', fmt(lead.current_markets)],
        ['Target', targetStructured],
        ['Stage', fmt(lead.stage)],
        ['Distribution', fmt(lead.current_distribution)],
      ],
    },
    {
      title: 'Speaking',
      rows: [
        ['Engagement', fmt(lead.event_type)],
        ['Audience & topic', fmt(lead.event_audience)],
        ['Timeframe', fmt(lead.event_timeframe)],
        ['Location & format', fmt(lead.event_format)],
      ],
    },
  ];

  return groups
    .map((g) => ({ ...g, rows: g.rows.filter(([, v]) => v) as [string, string][] }))
    .filter((g) => g.rows.length);
}

export function LeadDetail({
  token,
  id,
  localePrefix,
}: {
  token: string;
  id: string;
  localePrefix: string;
}) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchDetail = useCallback(
    (): Promise<Detail> =>
      authedFetch(token, `/api/admin/leads/${id}`).then((r) => r.json()),
    [token, id]
  );

  // Manual refresh (used by the action buttons below).
  const load = useCallback(() => {
    setLoading(true);
    fetchDetail()
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fetchDetail]);

  // Initial load — state is only set inside async callbacks, never synchronously
  // in the effect body, and is guarded against updates after unmount.
  useEffect(() => {
    let cancelled = false;
    fetchDetail()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDetail]);

  if (loading) return <Wrap><p className="text-muted">Loading…</p></Wrap>;
  if (!data?.lead) return <Wrap><p className="text-muted">Not found.</p></Wrap>;

  const { lead, reports, drafts, pdfUrl } = data;
  const activeDraft = drafts.find((d) => d.status !== 'sent') ?? drafts[0];
  const activeReport = reports.find((r) => r.status !== 'superseded') ?? reports[0];
  const reportLocale = activeReport?.locale ?? lead.locale;
  const reviewerNotes =
    activeReport?.generated_content?.[reportLocale]?.reviewerNotes ?? [];
  const sources = (activeReport?.research_sources ?? []).filter((s) => s?.url);
  const hasInternal = Boolean(
    reviewerNotes.length ||
      activeReport?.error ||
      activeReport?.instructions ||
      sources.length
  );
  const groups = intakeGroups(lead);
  const techSheet = fmt(lead.tech_sheet_url);

  return (
    <Wrap>
      <a
        href={`${localePrefix}/admin`}
        className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
      >
        ← All leads
      </a>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl">{lead.company_name}</h1>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-xs uppercase tracking-wider text-muted">
          {lead.status}
        </span>
      </div>
      <p className="mt-1 text-muted">
        {lead.contact_name} · {lead.contact_email} · {lead.locale.toUpperCase()}
      </p>

      {msg && <p className="mt-4 rounded-md bg-accent/10 px-4 py-2 text-sm text-accent">{msg}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Application + PDF */}
        <section className="space-y-6">
          <div className="rounded-lg border border-line bg-paper p-6">
            <h2 className="font-display text-xl">Application</h2>
            <div className="mt-4 space-y-5">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="text-xs uppercase tracking-wider text-accent">
                    {g.title}
                  </p>
                  <dl className="mt-2 space-y-2 text-sm">
                    {g.rows.map(([label, value]) => (
                      <div key={label} className="flex gap-3">
                        <dt className="w-36 shrink-0 text-muted">{label}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              {techSheet && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-accent">
                    Attachments
                  </p>
                  <a
                    href={techSheet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-accent hover:underline"
                  >
                    Tech sheet ↗
                  </a>
                </div>
              )}
            </div>
            <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
              In their words
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{lead.free_text}</p>
          </div>

          <div className="rounded-lg border border-line bg-paper p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Pitch PDF</h2>
              {activeReport && (
                <span className="text-xs text-muted">
                  v{activeReport.version} · {activeReport.status}
                </span>
              )}
            </div>
            {pdfUrl ? (
              <>
                <iframe
                  src={pdfUrl}
                  className="mt-4 h-[460px] w-full rounded border border-line"
                  title="Pitch PDF"
                />
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm text-accent hover:underline"
                >
                  Open in new tab ↗
                </a>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">
                {activeReport?.status === 'generating'
                  ? 'Generating… refresh in a moment.'
                  : 'No PDF yet.'}
              </p>
            )}
            <button
              onClick={load}
              className="mt-3 ml-4 text-sm text-muted hover:text-accent"
            >
              Refresh
            </button>
          </div>

          {/* Internal — never sent to the client. */}
          {hasInternal && (
            <div className="rounded-lg border border-dashed border-accent/50 bg-accent/5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Reviewer notes</h2>
                <span className="text-xs uppercase tracking-wider text-accent">
                  Internal · not sent to client
                </span>
              </div>

              {reviewerNotes.length > 0 && (
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
                  {reviewerNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}

              {activeReport?.error && (
                <p className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700">
                  Generation error: {activeReport.error}
                </p>
              )}

              {activeReport?.instructions && (
                <p className="mt-4 text-sm">
                  <span className="text-muted">Regenerate instructions: </span>
                  {activeReport.instructions}
                </p>
              )}

              {sources.length > 0 && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-muted hover:text-accent">
                    Research sources ({sources.length})
                  </summary>
                  <ul className="mt-2 space-y-1 pl-1">
                    {sources.map((s, i) => (
                      <li key={i} className="truncate">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>

        {/* Draft + actions */}
        <section className="space-y-6">
          {activeDraft && (
            <DraftEditor
              token={token}
              draft={activeDraft}
              onSaved={(m) => setMsg(m)}
              onSent={() => {
                setMsg('Sent. The lead has the diagnostic.');
                load();
              }}
            />
          )}

          {activeReport && (
            <Regenerate
              token={token}
              reportId={activeReport.id}
              onDone={(m) => {
                setMsg(m);
                load();
              }}
            />
          )}
        </section>
      </div>
    </Wrap>
  );
}

function DraftEditor({
  token,
  draft,
  onSaved,
  onSent,
}: {
  token: string;
  draft: { id: string; subject: string; body: string; status: string };
  onSaved: (m: string) => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [busy, setBusy] = useState(false);
  const sent = draft.status === 'sent';

  async function save() {
    setBusy(true);
    await authedFetch(token, `/api/admin/email-drafts/${draft.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ subject, body }),
    });
    setBusy(false);
    onSaved('Draft saved.');
  }

  async function send() {
    if (!confirm('Send the diagnostic to the lead? This cannot be undone.')) return;
    setBusy(true);
    const res = await authedFetch(
      token,
      `/api/admin/email-drafts/${draft.id}/approve-send`,
      { method: 'POST', body: '{}' }
    );
    setBusy(false);
    if (res.ok) onSent();
    else {
      const d = await res.json().catch(() => ({}));
      onSaved(`Send failed: ${d.error ?? 'unknown'} ${d.detail ?? ''}`);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-paper p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Reply</h2>
        <span className="text-xs text-muted">{draft.status}</span>
      </div>
      <label className="mt-4 block text-xs uppercase tracking-wider text-muted">
        Subject
      </label>
      <input
        value={subject}
        disabled={sent}
        onChange={(e) => setSubject(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
      />
      <label className="mt-4 block text-xs uppercase tracking-wider text-muted">
        Body
      </label>
      <textarea
        value={body}
        disabled={sent}
        rows={12}
        onChange={(e) => setBody(e.target.value)}
        className="mt-1 w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
      />
      {!sent && (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-accent disabled:opacity-60"
          >
            Save draft
          </button>
          <button
            onClick={send}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-surface hover:bg-accent-soft disabled:opacity-60"
          >
            Approve &amp; send →
          </button>
        </div>
      )}
    </div>
  );
}

function Regenerate({
  token,
  reportId,
  onDone,
}: {
  token: string;
  reportId: string;
  onDone: (m: string) => void;
}) {
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!instructions.trim()) return;
    setBusy(true);
    const res = await authedFetch(
      token,
      `/api/admin/reports/${reportId}/regenerate`,
      { method: 'POST', body: JSON.stringify({ instructions }) }
    );
    setBusy(false);
    if (res.ok) {
      setInstructions('');
      onDone('Regenerated — new version is ready.');
    } else {
      const d = await res.json().catch(() => ({}));
      onDone(`Regenerate failed: ${d.error ?? 'unknown'}`);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-paper p-6">
      <h2 className="font-display text-xl">Regenerate</h2>
      <p className="mt-2 text-sm text-muted">
        Add instructions and re-run. The current version is superseded.
      </p>
      <textarea
        value={instructions}
        rows={4}
        placeholder="e.g. Lead harder on the pricing-ladder risk; tighten the questions to three."
        onChange={(e) => setInstructions(e.target.value)}
        className="mt-3 w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        onClick={go}
        disabled={busy || !instructions.trim()}
        className="mt-3 rounded-full border border-line px-5 py-2.5 text-sm hover:border-accent disabled:opacity-50"
      >
        {busy ? 'Regenerating…' : 'Regenerate'}
      </button>
    </div>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">{children}</div>;
}

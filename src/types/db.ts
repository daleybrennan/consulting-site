// Hand-maintained DB types mirroring supabase/migrations/0001_init.sql.

export type Locale = 'en' | 'fr';

export type LeadStatus =
  | 'new'
  | 'researching'
  | 'pending_review'
  | 'sent'
  | 'scheduled_call'
  | 'completed'
  | 'archived';

export type BrandCategory =
  | 'wine'
  | 'spirits'
  | 'na_beverage'
  | 'specialty_food'
  | 'other'
  | 'speaking';

export type Stage = 'pre_entry' | 'expanding' | 'underperforming';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string | null;
  locale: Locale;
  contact_name: string;
  contact_email: string;
  contact_role: string | null;
  company_name: string;
  brand_category: BrandCategory;
  brand_website: string | null;
  current_markets: string[];
  target_markets: string[];
  stage: Stage | null;
  current_distribution: string | null;
  price_positioning: string | null;
  scale_note: string | null;
  free_text: string;
  source: string | null;
  consent: boolean;
  status: LeadStatus;
  // Structured pricing fields (migration 0002)
  origin_country: string | null;
  origin_region: string | null;
  target_country: string | null;
  target_region: string | null;
  wine_names: string | null;
  wine_style: string | null;
  vintage: number | null;
  volume_cases: number | null;
  exw_price: number | null;
  exw_currency: string | null;
  channel: string | null;
  tech_sheet_url: string | null;
  // Speaking / training inquiry fields (migration 20260620225229)
  event_type: string | null;
  event_audience: string | null;
  event_timeframe: string | null;
  event_format: string | null;
}

export type ReportType = 'pitch' | 'product';
export type ReportStatus =
  | 'generating'
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'sent'
  | 'superseded'
  | 'error';

/** The structured, locale-keyed shape the PDF renders from. */
export interface PitchContent {
  headline: string;
  intro: string;
  positionRead: string; // where the brand appears to stand
  riskAreas: { title: string; teaser: string }[]; // named, NOT resolved
  questions: string[]; // questions worth answering before committing budget
  closing: string;
}

export type LocaleKeyed<T> = Partial<Record<Locale, T>>;

export interface Report {
  id: string;
  created_at: string;
  updated_at: string | null;
  lead_id: string;
  type: ReportType;
  meeting_id: string | null;
  locale: Locale;
  version: number;
  status: ReportStatus;
  generated_content: LocaleKeyed<PitchContent> | null;
  research_sources: { title?: string; url?: string }[] | null;
  consensus: unknown | null;
  notes_source_ref: string | null;
  instructions: string | null;
  pdf_storage_path: string | null;
  generated_by: string | null;
  error: string | null;
}

export type EmailDraftStatus =
  | 'draft'
  | 'edited'
  | 'approved'
  | 'sent'
  | 'failed';

export interface EmailDraft {
  id: string;
  created_at: string;
  updated_at: string | null;
  lead_id: string;
  report_id: string;
  locale: Locale;
  subject: string;
  body: string;
  status: EmailDraftStatus;
  gmail_message_id: string | null;
  sent_at: string | null;
  error: string | null;
}

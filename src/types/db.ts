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
  | 'other';

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
  stage: Stage;
  current_distribution: string | null;
  price_positioning: string | null;
  scale_note: string | null;
  free_text: string;
  source: string | null;
  consent: boolean;
  status: LeadStatus;
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

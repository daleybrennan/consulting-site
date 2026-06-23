import { z } from 'zod';

// Splits a free-text "France, UK, US — NY" field into a clean string[].
function toList(v: string | undefined | null): string[] {
  if (!v) return [];
  return v
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

export const leadSubmitSchema = z.object({
  locale: z.enum(['en', 'fr']).default('en'),
  contact_name: z.string().trim().min(2).max(200),
  contact_email: z.string().trim().email().max(320),
  contact_role: z.string().trim().max(200).optional().default(''),
  company_name: z.string().trim().min(1).max(200),
  brand_category: z.enum([
    'wine',
    'spirits',
    'na_beverage',
    'specialty_food',
    'other',
    'speaking',
  ]),
  brand_website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(''),
  current_markets: z.string().trim().max(1000).optional().default(''),
  target_markets: z.string().trim().max(1000).optional().default(''),
  // Required for export inquiries; not shown (or required) for speaking — see refine below.
  stage: z
    .enum(['pre_entry', 'expanding', 'underperforming', 'exploring'])
    .or(z.literal(''))
    .optional()
    .default(''),
  current_distribution: z.string().trim().max(1000).optional().default(''),
  price_positioning: z.string().trim().max(500).optional().default(''),
  scale_note: z.string().trim().max(500).optional().default(''),
  free_text: z.string().trim().min(5).max(5000),
  consent: z.literal(true),
  // Honeypot — must be empty.
  company_url_hp: z.string().optional().default(''),
  turnstileToken: z.string().optional().default(''),
  // Structured pricing fields (optional — shown for wine/spirits only)
  origin_country:  z.string().trim().max(100).optional().default(''),
  origin_region:   z.string().trim().max(100).optional().default(''),
  target_country:  z.enum(['US', 'UK', 'FR', 'CA', 'OTHER', '']).optional().default(''),
  target_region:   z.string().trim().max(100).optional().default(''),
  wine_names:      z.string().trim().max(500).optional().default(''),
  wine_style:      z.string().trim().max(200).optional().default(''),
  vintage:         z.preprocess(v => (v === '' || v == null) ? undefined : v, z.coerce.number().int().min(1900).max(2100).optional()),
  volume_cases:    z.preprocess(v => (v === '' || v == null) ? undefined : v, z.coerce.number().int().min(1).optional()),
  exw_price:       z.preprocess(v => (v === '' || v == null) ? undefined : v, z.coerce.number().positive().optional()),
  exw_currency:    z.enum(['EUR', 'USD', 'GBP', 'CAD', '']).optional().default(''),
  domestic_price:    z.preprocess(v => (v === '' || v == null) ? undefined : v, z.coerce.number().positive().optional()),
  domestic_currency: z.enum(['EUR', 'USD', 'GBP', 'CAD', '']).optional().default(''),
  channel:         z.enum(['on', 'off', 'both', '']).optional().default(''),
  tech_sheet_url:  z.string().trim().max(500).optional().default(''),
  // Speaking / training inquiry fields (optional — shown for 'speaking' only)
  event_type:      z.string().trim().max(200).optional().default(''),
  event_audience:  z.string().trim().max(1000).optional().default(''),
  event_timeframe: z.string().trim().max(200).optional().default(''),
  event_format:    z.string().trim().max(200).optional().default(''),
}).superRefine((data, ctx) => {
  // Stage is required for every inquiry except speaking / training.
  if (data.brand_category !== 'speaking' && !data.stage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stage'],
      message: 'Please choose a stage.',
    });
  }
});

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>;

/** Maps a validated payload to the `leads` insert row. */
export function toLeadRow(input: LeadSubmitInput) {
  return {
    locale: input.locale,
    contact_name: input.contact_name,
    contact_email: input.contact_email,
    contact_role: input.contact_role || null,
    company_name: input.company_name,
    brand_category: input.brand_category,
    brand_website: input.brand_website || null,
    current_markets: toList(input.current_markets),
    target_markets: toList(input.target_markets),
    stage: input.stage || null,
    current_distribution: input.current_distribution || null,
    price_positioning: input.price_positioning || null,
    scale_note: input.scale_note || null,
    free_text: input.free_text,
    consent: input.consent,
    status: 'new' as const,
    // Structured pricing fields
    origin_country:  input.origin_country  || null,
    origin_region:   input.origin_region   || null,
    target_country:  input.target_country  || null,
    target_region:   input.target_region   || null,
    wine_names:      input.wine_names      || null,
    wine_style:      input.wine_style      || null,
    vintage:         input.vintage         ?? null,
    volume_cases:    input.volume_cases    ?? null,
    exw_price:       input.exw_price       ?? null,
    exw_currency:    input.exw_currency    || null,
    domestic_price:    input.domestic_price    ?? null,
    domestic_currency: input.domestic_currency || null,
    channel:         input.channel         || null,
    tech_sheet_url:  input.tech_sheet_url  || null,
    // Speaking / training fields
    event_type:      input.event_type      || null,
    event_audience:  input.event_audience  || null,
    event_timeframe: input.event_timeframe || null,
    event_format:    input.event_format    || null,
  };
}

/** Maps a zod error to the first matching client error key. */
export function firstErrorKey(err: z.ZodError): string {
  const path = err.issues[0]?.path[0];
  switch (path) {
    case 'contact_name':
      return 'name';
    case 'contact_email':
      return 'email';
    case 'company_name':
      return 'company';
    case 'brand_category':
      return 'category';
    case 'stage':
      return 'stage';
    case 'free_text':
      return 'freeText';
    case 'consent':
      return 'consent';
    default:
      return 'generic';
  }
}

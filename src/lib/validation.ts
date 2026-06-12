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
  ]),
  brand_website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default(''),
  current_markets: z.string().trim().max(1000).optional().default(''),
  target_markets: z.string().trim().max(1000).optional().default(''),
  stage: z.enum(['pre_entry', 'expanding', 'underperforming']),
  current_distribution: z.string().trim().max(1000).optional().default(''),
  price_positioning: z.string().trim().max(500).optional().default(''),
  scale_note: z.string().trim().max(500).optional().default(''),
  free_text: z.string().trim().min(5).max(5000),
  consent: z.literal(true),
  // Honeypot — must be empty.
  company_url_hp: z.string().optional().default(''),
  turnstileToken: z.string().optional().default(''),
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
    stage: input.stage,
    current_distribution: input.current_distribution || null,
    price_positioning: input.price_positioning || null,
    scale_note: input.scale_note || null,
    free_text: input.free_text,
    consent: input.consent,
    status: 'new' as const,
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

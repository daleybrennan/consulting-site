import { getServiceClient } from '@/lib/supabase/server';
import { getAnthropic, PITCH_MODEL } from '@/lib/anthropic';
import { pitchHtml } from '@/lib/pdf-template';
import { htmlToPdf } from '@/lib/render-pdf';
import { notifyOwner } from '@/lib/notify';
import { computePricing, money } from '@/lib/pricing-model';
import type { Lead, PitchContent, Locale } from '@/types/db';

// Markets the EXW→shelf price walk supports (others, incl. 'OTHER', are skipped).
const PRICING_MARKETS = ['US', 'UK', 'FR', 'CA'] as const;
type PricingMarket = (typeof PRICING_MARKETS)[number];

// ---- Prompts ----------------------------------------------------

function brandBrief(lead: Lead): string {
  const lines = [
    `Company / brand: ${lead.company_name}`,
    `Category: ${lead.brand_category}`,
    lead.brand_website ? `Website: ${lead.brand_website}` : '',
    lead.contact_role ? `Contact role: ${lead.contact_role}` : '',
    `Currently sells in: ${lead.current_markets.join(', ') || 'unspecified'}`,
    `Target markets: ${lead.target_markets.join(', ') || 'unspecified'}`,
    `Stage: ${lead.stage}`,
    lead.current_distribution
      ? `Current distribution: ${lead.current_distribution}`
      : '',
    lead.price_positioning ? `Price positioning: ${lead.price_positioning}` : '',
    lead.scale_note ? `Scale: ${lead.scale_note}` : '',
    // Structured pricing fields
    lead.origin_country
      ? `Origin: ${[lead.origin_region, lead.origin_country].filter(Boolean).join(', ')}`
      : '',
    lead.target_country
      ? `Target market (structured): ${lead.target_country}${lead.target_region ? ' / ' + lead.target_region : ''}`
      : '',
    lead.wine_names ? `Wines: ${lead.wine_names}` : '',
    lead.wine_style ? `Style: ${lead.wine_style}` : '',
    lead.vintage ? `Vintage: ${lead.vintage}` : '',
    lead.exw_price != null
      ? `EXW price: ${lead.exw_currency || 'EUR'} ${lead.exw_price.toFixed(2)} per bottle`
      : '',
    lead.volume_cases ? `Annual volume: ${lead.volume_cases} cases` : '',
    lead.channel ? `Channel intent: ${lead.channel}` : '',
    lead.tech_sheet_url ? `Tech sheet: ${lead.tech_sheet_url}` : '',
    '',
    'In their own words:',
    lead.free_text,
  ];
  return lines.filter(Boolean).join('\n');
}

function formatPricingForContext(
  pricing: ReturnType<typeof computePricing>
): string {
  const cur = pricing.market.currency;
  const pb = pricing.expected.perBottle;
  const b = pricing.band;
  const lines = [
    `Market: ${pricing.market.label} (${pricing.market.model})`,
    `EXW converted: ${money(pb.exw, cur)} | CIF: ${money(pb.cif, cur)} | Landed: ${money(pb.landed, cur)}`,
    `Importer-out: ${money(pb.importerOut, cur)} | Front line (trade): ${money(pb.frontline, cur)}`,
    `On-premise list: ${money(pb.onPremiseList, cur)} | Off-premise shelf (incl. tax): ${money(pb.offPremiseShelfInclTax, cur)}`,
    `Band (off-premise shelf): ${money(b.offPremiseShelf.low, cur)} – ${money(b.offPremiseShelf.high, cur)} (expected ${money(b.offPremiseShelf.expected, cur)})`,
    `Quantity discount: ${String(pricing.quantityDiscount.legal).toUpperCase()}: ${pricing.quantityDiscount.note || ''}`,
    pricing.warnings.length ? `Warnings: ${pricing.warnings.join(' | ')}` : '',
    pricing.disclaimer,
  ];
  return lines.filter(Boolean).join('\n');
}

const RESEARCH_SYSTEM = `You are Daley Brennan's research engine. Daley is a current, senior commercial practitioner in the premium wine & spirits industry who advises a small number of brands on US market entry, distribution, and pricing.

Your job: research a brand and produce the raw material for a TEASER diagnostic, a short written read that demonstrates Daley's competence and creates desire for a paid engagement, WITHOUT giving away the answers.

CRITICAL, this is a teaser by design:
- Surface the SHAPE of the diagnosis and the questions worth answering. NEVER resolve them.
- Name categories of likely risk ("a probable pricing-ladder compression between your ex-cellars price and US shelf", "a likely market-sequencing error given your target states"), but do NOT prescribe the fix.
- The resolution, the specific fixes and the order to make them, is the paid work. Withhold it.
- Be specific to THIS brand, category, and target markets, and ground it in how the US trade actually buys right now. Use web search to check the brand, its competitive set, and current market conditions.
- Never invent facts about the brand. If something is unknown, treat it as a question worth answering, not an assertion.

Tone: precise, senior, quietly confident. No hype, no emoji, no sales language. Never use em-dashes; use commas, colons, or periods.`;

function structureSystem(locale: Locale): string {
  const lang = locale === 'fr' ? 'French' : 'English';
  return `You convert research notes into a structured teaser diagnostic, written entirely in ${lang}.

Hold the teaser discipline: name risks and questions, resolve nothing. Keep each field tight and specific to the brand. 3–4 risk areas, 3–5 questions. No hype, no emoji. Never use em-dashes; use commas, colons, or periods.`;
}

const PITCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    intro: { type: 'string' },
    positionRead: { type: 'string' },
    riskAreas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          teaser: { type: 'string' },
        },
        required: ['title', 'teaser'],
      },
    },
    questions: { type: 'array', items: { type: 'string' } },
    closing: { type: 'string' },
  },
  required: ['headline', 'intro', 'positionRead', 'riskAreas', 'questions', 'closing'],
} as const;

// ---- LLM steps --------------------------------------------------

type Source = { title?: string; url?: string };

async function research(
  lead: Lead
): Promise<{ findings: string; sources: Source[] }> {
  const client = getAnthropic();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: 'user',
      content: `Research this brand and produce teaser-diagnostic raw material.\n\n${brandBrief(
        lead
      )}`,
    },
  ];

  const sources: Source[] = [];
  let finalText = '';

  for (let i = 0; i < 6; i++) {
    const stream = client.messages.stream({
      model: PITCH_MODEL,
      max_tokens: 8000,
      system: RESEARCH_SYSTEM,
      thinking: { type: 'adaptive' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { effort: 'high' } as any,
      tools: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: 'web_search_20260209', name: 'web_search', max_uses: 6 } as any,
      ],
      messages,
    });
    const msg = await stream.finalMessage();

    for (const block of msg.content) {
      if (block.type === 'text') finalText += block.text;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyBlock = block as any;
      if (anyBlock.type === 'web_search_tool_result' && Array.isArray(anyBlock.content)) {
        for (const r of anyBlock.content) {
          if (r?.url) sources.push({ title: r.title, url: r.url });
        }
      }
    }

    if (msg.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: msg.content });
      continue; // resume the server-tool loop
    }
    break;
  }

  return { findings: finalText.trim(), sources };
}

async function structure(
  lead: Lead,
  findings: string,
  instructions?: string
): Promise<PitchContent> {
  const client = getAnthropic();
  const extra = instructions
    ? `\n\nAdditional instructions from Daley (apply these):\n${instructions}`
    : '';
  const msg = await client.messages.create({
    model: PITCH_MODEL,
    max_tokens: 4000,
    system: structureSystem(lead.locale),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output_config: { format: { type: 'json_schema', schema: PITCH_SCHEMA } } as any,
    messages: [
      {
        role: 'user',
        content: `Brand brief:\n${brandBrief(lead)}\n\nResearch notes:\n${findings}\n\nProduce the structured teaser diagnostic.${extra}`,
      },
    ],
  });
  const text = msg.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('No structured output');
  return JSON.parse(text.text) as PitchContent;
}

// ---- Email draft ------------------------------------------------

function draftEmail(lead: Lead, locale: Locale) {
  if (locale === 'fr') {
    return {
      subject: `Votre diagnostic commercial : ${lead.company_name}`,
      body: `Bonjour ${lead.contact_name.split(' ')[0]},

Merci de m'avoir parlé de ${lead.company_name}. Vous trouverez ci-joint un court diagnostic commercial : ma lecture préliminaire de votre position sur le marché américain, les zones de risque qui méritent d'être nommées, et les questions à trancher avant d'engager un budget.

C'est volontairement une lecture préliminaire, pas le diagnostic complet. Si ce que vous y lisez résonne, proposons un appel pour approfondir.

Bien à vous,
Daley Brennan`,
    };
  }
  return {
    subject: `Your commercial diagnostic: ${lead.company_name}`,
    body: `Hi ${lead.contact_name.split(' ')[0]},

Thanks for telling me about ${lead.company_name}. Attached is a short commercial diagnostic: my preliminary read of where you stand in the US market, the risk areas worth naming, and the questions worth answering before you commit budget.

It's deliberately a preliminary read, not the full diagnostic. If what you see in it lands, let's book a call to go deeper.

Best,
Daley Brennan`,
  };
}

// ---- Orchestrator -----------------------------------------------

export async function generatePitchReport(leadId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single<Lead>();
  if (leadErr || !lead) {
    console.error('[generatePitchReport] lead not found', leadId, leadErr);
    return;
  }

  // Create the report row first so we have an id for the storage path.
  const { data: report, error: repErr } = await supabase
    .from('reports')
    .insert({
      lead_id: lead.id,
      type: 'pitch',
      locale: lead.locale,
      status: 'generating',
      generated_by: PITCH_MODEL,
    })
    .select('id')
    .single<{ id: string }>();
  if (repErr || !report) {
    console.error('[generatePitchReport] could not create report', repErr);
    return;
  }

  await supabase.from('leads').update({ status: 'researching' }).eq('id', lead.id);

  try {
    const { findings, sources } = await research(lead);

    // Enrich research findings with computed price walk when pricing data is present.
    let enrichedFindings = findings;
    if (
      lead.exw_price != null &&
      PRICING_MARKETS.includes(lead.target_country as PricingMarket)
    ) {
      try {
        const pricing = computePricing({
          exwPrice: lead.exw_price,
          exwCurrency: (lead.exw_currency || 'EUR') as 'EUR' | 'USD' | 'GBP' | 'CAD',
          targetMarket: lead.target_country as PricingMarket,
          targetRegion: lead.target_region || undefined,
          volumeCases: lead.volume_cases || undefined,
        });
        enrichedFindings += '\n\n## COMPUTED PRICE WALK\n' + formatPricingForContext(pricing);
      } catch {
        // Non-fatal — continue with research findings only.
      }
    }

    const content = await structure(lead, enrichedFindings);

    const html = pitchHtml(content, lead, lead.locale);
    const pdf = await htmlToPdf(html);
    const path = `pitch/${lead.id}/${report.id}.pdf`;

    const { error: upErr } = await supabase.storage
      .from('reports')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    await supabase
      .from('reports')
      .update({
        status: 'draft',
        generated_content: { [lead.locale]: content },
        research_sources: sources,
        pdf_storage_path: path,
      })
      .eq('id', report.id);

    const email = draftEmail(lead, lead.locale);
    await supabase.from('email_drafts').insert({
      lead_id: lead.id,
      report_id: report.id,
      locale: lead.locale,
      subject: email.subject,
      body: email.body,
      status: 'draft',
    });

    await supabase
      .from('leads')
      .update({ status: 'pending_review' })
      .eq('id', lead.id);

    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      type: 'pitch_generated',
      payload: { report_id: report.id, sources: sources.length },
    });

    await notifyOwner('pitch_generated', {
      leadId: lead.id,
      company: lead.company_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[generatePitchReport] failed', message);
    await supabase
      .from('reports')
      .update({ status: 'error', error: message })
      .eq('id', report.id);
    await notifyOwner('pitch_error', {
      leadId: lead.id,
      company: lead.company_name,
      detail: message,
    });
  }
}

/**
 * Regenerate a pitch with override instructions: supersede the prior report,
 * create a new version, re-run research + structuring, refresh the draft.
 */
export async function regeneratePitchReport(
  reportId: string,
  instructions: string
): Promise<{ ok: boolean; newReportId?: string; error?: string }> {
  const supabase = getServiceClient();

  const { data: prior, error: priorErr } = await supabase
    .from('reports')
    .select('id, lead_id, version, type')
    .eq('id', reportId)
    .single<{ id: string; lead_id: string; version: number; type: string }>();
  if (priorErr || !prior) return { ok: false, error: 'report_not_found' };

  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', prior.lead_id)
    .single<Lead>();
  if (!lead) return { ok: false, error: 'lead_not_found' };

  const { data: created } = await supabase
    .from('reports')
    .insert({
      lead_id: lead.id,
      type: 'pitch',
      locale: lead.locale,
      version: prior.version + 1,
      status: 'generating',
      instructions,
      generated_by: PITCH_MODEL,
    })
    .select('id')
    .single<{ id: string }>();
  if (!created) return { ok: false, error: 'create_failed' };

  try {
    const { findings, sources } = await research(lead);

    let enrichedFindings = findings;
    if (
      lead.exw_price != null &&
      PRICING_MARKETS.includes(lead.target_country as PricingMarket)
    ) {
      try {
        const pricing = computePricing({
          exwPrice: lead.exw_price,
          exwCurrency: (lead.exw_currency || 'EUR') as 'EUR' | 'USD' | 'GBP' | 'CAD',
          targetMarket: lead.target_country as PricingMarket,
          targetRegion: lead.target_region || undefined,
          volumeCases: lead.volume_cases || undefined,
        });
        enrichedFindings += '\n\n## COMPUTED PRICE WALK\n' + formatPricingForContext(pricing);
      } catch {
        // Non-fatal.
      }
    }

    const content = await structure(lead, enrichedFindings, instructions);
    const html = pitchHtml(content, lead, lead.locale);
    const pdf = await htmlToPdf(html);
    const path = `pitch/${lead.id}/${created.id}.pdf`;

    const { error: upErr } = await supabase.storage
      .from('reports')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    await supabase
      .from('reports')
      .update({
        status: 'draft',
        generated_content: { [lead.locale]: content },
        research_sources: sources,
        pdf_storage_path: path,
      })
      .eq('id', created.id);

    // Supersede the prior version and any of its drafts.
    await supabase.from('reports').update({ status: 'superseded' }).eq('id', prior.id);

    const email = draftEmail(lead, lead.locale);
    await supabase.from('email_drafts').insert({
      lead_id: lead.id,
      report_id: created.id,
      locale: lead.locale,
      subject: email.subject,
      body: email.body,
      status: 'draft',
    });

    await supabase.from('activity_log').insert({
      lead_id: lead.id,
      type: 'regenerated',
      payload: { from: prior.id, to: created.id, version: prior.version + 1 },
    });

    return { ok: true, newReportId: created.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[regeneratePitchReport] failed', message);
    await supabase
      .from('reports')
      .update({ status: 'error', error: message })
      .eq('id', created.id);
    await notifyOwner('pitch_error', {
      leadId: lead.id,
      company: lead.company_name,
      detail: message,
    });
    return { ok: false, error: message };
  }
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Status = 'idle' | 'submitting' | 'success' | 'error';

const FIELD_BASE =
  'w-full rounded-md border border-line bg-paper px-4 py-3 text-ink outline-none transition-colors focus:border-accent';

export function ApplicationForm() {
  const t = useTranslations('contact.form');
  const te = useTranslations('contact.errors');
  const ts = useTranslations('contact.success');
  const locale = useLocale();

  const [status, setStatus] = useState<Status>('idle');
  const [errorKey, setErrorKey] = useState<string>('generic');
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [category, setCategory] = useState('');
  const [wasSpeaking, setWasSpeaking] = useState(false);
  const turnstileToken = useRef<string>('');
  const widgetMounted = useRef(false);

  const showPricing = category === 'wine' || category === 'spirits';
  const isSpeaking = category === 'speaking';

  // Load Cloudflare Turnstile only when a site key is configured.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || widgetMounted.current) return;
    widgetMounted.current = true;
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      // @ts-expect-error injected global
      window.turnstile?.render('#turnstile-widget', {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          turnstileToken.current = token;
        },
        'expired-callback': () => {
          turnstileToken.current = '';
        },
        'error-callback': () => {
          turnstileToken.current = '';
        },
      });
    };
    document.body.appendChild(script);
  }, []);

  // Reset the Turnstile widget after a failed submit so the user gets a fresh
  // challenge token rather than a stale, already-consumed one.
  function resetTurnstile() {
    turnstileToken.current = '';
    // @ts-expect-error injected global
    window.turnstile?.reset?.();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const get = (k: string) => String(fd.get(k) ?? '').trim();
    const payload = {
      locale,
      contact_name: get('contact_name'),
      contact_email: get('contact_email'),
      contact_role: get('contact_role'),
      company_name: get('company_name'),
      brand_category: get('brand_category'),
      brand_website: get('brand_website'),
      current_markets: get('current_markets'),
      target_markets: get('target_markets'),
      stage: get('stage'),
      current_distribution: get('current_distribution'),
      price_positioning: get('price_positioning'),
      scale_note: get('scale_note'),
      free_text: get('free_text'),
      consent: fd.get('consent') === 'on',
      turnstileToken: turnstileToken.current,
      // Structured pricing fields
      origin_country:  get('origin_country'),
      origin_region:   get('origin_region'),
      target_country:  get('target_country'),
      target_region:   get('target_region'),
      wine_names:      get('wine_names'),
      wine_style:      get('wine_style'),
      vintage:         get('vintage'),
      volume_cases:    get('volume_cases'),
      exw_price:       get('exw_price'),
      exw_currency:    get('exw_currency'),
      channel:         get('channel'),
      tech_sheet_url:  get('tech_sheet_url'),
      // Speaking / training fields
      event_type:      get('event_type'),
      event_audience:  get('event_audience'),
      event_timeframe: get('event_timeframe'),
      event_format:    get('event_format'),
    };

    // Client-side validation (server re-validates with zod).
    const errs: Record<string, boolean> = {};
    if (payload.contact_name.length < 2) errs.contact_name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email))
      errs.contact_email = true;
    if (payload.company_name.length < 1) errs.company_name = true;
    if (!payload.brand_category) errs.brand_category = true;
    if (payload.brand_category !== 'speaking' && !payload.stage) errs.stage = true;
    if (payload.free_text.length < 5) errs.free_text = true;
    if (!payload.consent) errs.consent = true;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        track('lead_submitted', { category: payload.brand_category, stage: payload.stage });
        setWasSpeaking(payload.brand_category === 'speaking');
        setStatus('success');
        form.reset();
        setCategory('');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrorKey(data?.errorKey ?? 'generic');
      resetTurnstile();
      setStatus('error');
    } catch {
      setErrorKey('generic');
      resetTurnstile();
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-line bg-paper p-8 md:p-10">
        <h2 className="font-display text-3xl text-ink">{ts('title')}</h2>
        <p className="mt-4 max-w-prose text-muted">
          {wasSpeaking ? ts('speakingBody') : ts('body')}
        </p>
      </div>
    );
  }

  const errClass = (k: string) =>
    fieldErrors[k] ? 'border-accent' : '';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('contactName')} required>
          <input
            name="contact_name"
            autoComplete="name"
            aria-required="true"
            className={`${FIELD_BASE} ${errClass('contact_name')}`}
            aria-invalid={!!fieldErrors.contact_name}
            aria-describedby={fieldErrors.contact_name ? 'contact_name-error' : undefined}
          />
          {fieldErrors.contact_name && <Err id="contact_name-error">{te('name')}</Err>}
        </Field>
        <Field label={t('contactEmail')} required>
          <input
            name="contact_email"
            type="email"
            autoComplete="email"
            aria-required="true"
            className={`${FIELD_BASE} ${errClass('contact_email')}`}
            aria-invalid={!!fieldErrors.contact_email}
            aria-describedby={fieldErrors.contact_email ? 'contact_email-error' : undefined}
          />
          {fieldErrors.contact_email && <Err id="contact_email-error">{te('email')}</Err>}
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('contactRole')}>
          <input
            name="contact_role"
            placeholder={t('contactRolePlaceholder')}
            className={FIELD_BASE}
          />
        </Field>
        <Field label={t('companyName')} required>
          <input
            name="company_name"
            autoComplete="organization"
            aria-required="true"
            className={`${FIELD_BASE} ${errClass('company_name')}`}
            aria-invalid={!!fieldErrors.company_name}
            aria-describedby={fieldErrors.company_name ? 'company_name-error' : undefined}
          />
          {fieldErrors.company_name && <Err id="company_name-error">{te('company')}</Err>}
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('brandCategory')} required>
          <select
            name="brand_category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-required="true"
            className={`${FIELD_BASE} ${errClass('brand_category')}`}
            aria-invalid={!!fieldErrors.brand_category}
            aria-describedby={fieldErrors.brand_category ? 'brand_category-error' : undefined}
          >
            <option value="" disabled>
              {t('select')}
            </option>
            <option value="wine">{t('brandCategoryOptions.wine')}</option>
            <option value="spirits">{t('brandCategoryOptions.spirits')}</option>
            <option value="na_beverage">
              {t('brandCategoryOptions.na_beverage')}
            </option>
            <option value="specialty_food">
              {t('brandCategoryOptions.specialty_food')}
            </option>
            <option value="speaking">{t('brandCategoryOptions.speaking')}</option>
            <option value="other">{t('brandCategoryOptions.other')}</option>
          </select>
          {fieldErrors.brand_category && <Err id="brand_category-error">{te('category')}</Err>}
        </Field>
        <Field label={t('brandWebsite')} hint={t('brandWebsiteOptional')}>
          <input
            name="brand_website"
            type="url"
            inputMode="url"
            placeholder="https://"
            className={FIELD_BASE}
          />
        </Field>
      </div>

      {!isSpeaking && (
      <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('currentMarkets')}>
          <input
            name="current_markets"
            placeholder={t('currentMarketsPlaceholder')}
            className={FIELD_BASE}
          />
        </Field>
        <Field label={t('targetMarkets')}>
          <input
            name="target_markets"
            placeholder={t('targetMarketsPlaceholder')}
            className={FIELD_BASE}
          />
        </Field>
      </div>

      <Field label={t('stage')} required>
        <select
          name="stage"
          defaultValue=""
          aria-required="true"
          className={`${FIELD_BASE} ${errClass('stage')}`}
          aria-invalid={!!fieldErrors.stage}
          aria-describedby={fieldErrors.stage ? 'stage-error' : undefined}
        >
          <option value="" disabled>
            {t('select')}
          </option>
          <option value="pre_entry">{t('stageOptions.pre_entry')}</option>
          <option value="expanding">{t('stageOptions.expanding')}</option>
          <option value="underperforming">
            {t('stageOptions.underperforming')}
          </option>
        </select>
        {fieldErrors.stage && <Err id="stage-error">{te('stage')}</Err>}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('currentDistribution')}>
          <input
            name="current_distribution"
            placeholder={t('currentDistributionPlaceholder')}
            className={FIELD_BASE}
          />
        </Field>
        <Field label={t('pricePositioning')} hint={t('optional')}>
          <input
            name="price_positioning"
            placeholder={t('pricePositioningPlaceholder')}
            className={FIELD_BASE}
          />
        </Field>
      </div>

      <Field label={t('scaleNote')} hint={t('optional')}>
        <input
          name="scale_note"
          placeholder={t('scaleNotePlaceholder')}
          className={FIELD_BASE}
        />
      </Field>
      </>
      )}

      {/* Speaking / training section — speaking inquiries only */}
      {isSpeaking && (
        <div className="space-y-6 rounded-lg border border-line/60 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">
            {t('speakingSection')}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('eventType')} hint={t('optional')}>
              <select name="event_type" defaultValue="" className={FIELD_BASE}>
                <option value="">{t('select')}</option>
                <option value="keynote">{t('eventTypeOptions.keynote')}</option>
                <option value="workshop">{t('eventTypeOptions.workshop')}</option>
                <option value="panel">{t('eventTypeOptions.panel')}</option>
                <option value="guest_lecture">
                  {t('eventTypeOptions.guest_lecture')}
                </option>
                <option value="podcast">{t('eventTypeOptions.podcast')}</option>
                <option value="other">{t('eventTypeOptions.other')}</option>
              </select>
            </Field>
            <Field label={t('eventTimeframe')} hint={t('optional')}>
              <input
                name="event_timeframe"
                placeholder={t('eventTimeframePlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <Field label={t('eventAudience')} hint={t('optional')}>
            <input
              name="event_audience"
              placeholder={t('eventAudiencePlaceholder')}
              className={FIELD_BASE}
            />
          </Field>

          <Field label={t('eventFormat')} hint={t('optional')}>
            <input
              name="event_format"
              placeholder={t('eventFormatPlaceholder')}
              className={FIELD_BASE}
            />
          </Field>
        </div>
      )}

      {/* Structured pricing section — wine and spirits only */}
      {showPricing && (
        <div className="space-y-6 rounded-lg border border-line/60 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-muted">
            {t('pricingSection')}
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('wineNames')} hint={t('optional')}>
              <input
                name="wine_names"
                placeholder={t('wineNamesPlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
            <Field label={t('wineStyle')} hint={t('optional')}>
              <input
                name="wine_style"
                placeholder={t('wineStylePlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('originCountry')} hint={t('optional')}>
              <input
                name="origin_country"
                placeholder={t('originCountryPlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
            <Field label={t('originRegion')} hint={t('optional')}>
              <input
                name="origin_region"
                placeholder={t('originRegionPlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('targetCountry')} hint={t('optional')}>
              <select name="target_country" defaultValue="" className={FIELD_BASE}>
                <option value="">{t('select')}</option>
                <option value="US">{t('targetCountryOptions.US')}</option>
                <option value="UK">{t('targetCountryOptions.UK')}</option>
                <option value="FR">{t('targetCountryOptions.FR')}</option>
                <option value="CA">{t('targetCountryOptions.CA')}</option>
                <option value="OTHER">{t('targetCountryOptions.OTHER')}</option>
              </select>
            </Field>
            <Field label={t('targetRegion')} hint={t('optional')}>
              <input
                name="target_region"
                placeholder={t('targetRegionPlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('exwPrice')} hint={t('optional')}>
              <div className="flex gap-2">
                <select
                  name="exw_currency"
                  defaultValue="EUR"
                  className="rounded-md border border-line bg-paper px-3 py-3 text-ink outline-none transition-colors focus:border-accent"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
                <input
                  name="exw_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={`${FIELD_BASE} flex-1`}
                />
              </div>
            </Field>
            <Field label={t('volumeCases')} hint={t('optional')}>
              <input
                name="volume_cases"
                type="number"
                min="1"
                placeholder={t('volumeCasesPlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label={t('channel')} hint={t('optional')}>
              <select name="channel" defaultValue="" className={FIELD_BASE}>
                <option value="">{t('select')}</option>
                <option value="on">{t('channelOptions.on')}</option>
                <option value="off">{t('channelOptions.off')}</option>
                <option value="both">{t('channelOptions.both')}</option>
              </select>
            </Field>
            <Field label={t('vintage')} hint={t('optional')}>
              <input
                name="vintage"
                type="number"
                min="1900"
                max="2100"
                placeholder={t('vintagePlaceholder')}
                className={FIELD_BASE}
              />
            </Field>
          </div>

          <Field label={t('techSheetUrl')} hint={t('optional')}>
            <input
              name="tech_sheet_url"
              type="url"
              inputMode="url"
              placeholder="https://"
              className={FIELD_BASE}
            />
          </Field>
        </div>
      )}

      <Field label={isSpeaking ? t('freeTextSpeaking') : t('freeText')} required>
        <textarea
          name="free_text"
          rows={5}
          placeholder={
            isSpeaking ? t('freeTextSpeakingPlaceholder') : t('freeTextPlaceholder')
          }
          aria-required="true"
          className={`${FIELD_BASE} resize-y ${errClass('free_text')}`}
          aria-invalid={!!fieldErrors.free_text}
          aria-describedby={fieldErrors.free_text ? 'free_text-error' : undefined}
        />
        {fieldErrors.free_text && <Err id="free_text-error">{te('freeText')}</Err>}
      </Field>

      {/* Honeypot */}
      <input
        type="text"
        name="company_url_hp"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="consent"
          aria-required="true"
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
          aria-invalid={!!fieldErrors.consent}
          aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
        />
        <span>{isSpeaking ? t('consentSpeaking') : t('consent')}</span>
      </label>
      {fieldErrors.consent && <Err id="consent-error">{te('consent')}</Err>}

      {TURNSTILE_SITE_KEY && <div id="turnstile-widget" className="pt-2" />}

      {status === 'error' && (
        <p role="alert" className="text-sm text-accent">
          {te(errorKey)}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-60"
      >
        {status === 'submitting' ? t('submitting') : t('submit')}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between text-xs uppercase tracking-[0.12em] text-muted">
        <span>{label}</span>
        {hint && <span className="lowercase tracking-normal text-muted/70">{hint}</span>}
        {required && <span className="text-accent" aria-hidden="true">•</span>}
      </span>
      {children}
    </label>
  );
}

function Err({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} role="alert" className="mt-1.5 block text-xs text-accent">
      {children}
    </span>
  );
}

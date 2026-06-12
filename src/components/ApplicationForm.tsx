'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

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
  const turnstileToken = useRef<string>('');
  const widgetMounted = useRef(false);

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
      });
    };
    document.body.appendChild(script);
  }, []);

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
    };

    // Client-side validation (server re-validates with zod).
    const errs: Record<string, boolean> = {};
    if (payload.contact_name.length < 2) errs.contact_name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact_email))
      errs.contact_email = true;
    if (payload.company_name.length < 1) errs.company_name = true;
    if (!payload.brand_category) errs.brand_category = true;
    if (!payload.stage) errs.stage = true;
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
        setStatus('success');
        form.reset();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrorKey(data?.errorKey ?? 'generic');
      setStatus('error');
    } catch {
      setErrorKey('generic');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-line bg-paper p-8 md:p-10">
        <h2 className="font-display text-3xl text-ink">{ts('title')}</h2>
        <p className="mt-4 max-w-prose text-muted">{ts('body')}</p>
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
            className={`${FIELD_BASE} ${errClass('contact_name')}`}
            aria-invalid={!!fieldErrors.contact_name}
          />
          {fieldErrors.contact_name && <Err>{te('name')}</Err>}
        </Field>
        <Field label={t('contactEmail')} required>
          <input
            name="contact_email"
            type="email"
            autoComplete="email"
            className={`${FIELD_BASE} ${errClass('contact_email')}`}
            aria-invalid={!!fieldErrors.contact_email}
          />
          {fieldErrors.contact_email && <Err>{te('email')}</Err>}
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
            className={`${FIELD_BASE} ${errClass('company_name')}`}
            aria-invalid={!!fieldErrors.company_name}
          />
          {fieldErrors.company_name && <Err>{te('company')}</Err>}
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t('brandCategory')} required>
          <select
            name="brand_category"
            defaultValue=""
            className={`${FIELD_BASE} ${errClass('brand_category')}`}
            aria-invalid={!!fieldErrors.brand_category}
          >
            <option value="" disabled>
              —
            </option>
            <option value="wine">{t('brandCategoryOptions.wine')}</option>
            <option value="spirits">{t('brandCategoryOptions.spirits')}</option>
            <option value="na_beverage">
              {t('brandCategoryOptions.na_beverage')}
            </option>
            <option value="specialty_food">
              {t('brandCategoryOptions.specialty_food')}
            </option>
            <option value="other">{t('brandCategoryOptions.other')}</option>
          </select>
          {fieldErrors.brand_category && <Err>{te('category')}</Err>}
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
          className={`${FIELD_BASE} ${errClass('stage')}`}
          aria-invalid={!!fieldErrors.stage}
        >
          <option value="" disabled>
            —
          </option>
          <option value="pre_entry">{t('stageOptions.pre_entry')}</option>
          <option value="expanding">{t('stageOptions.expanding')}</option>
          <option value="underperforming">
            {t('stageOptions.underperforming')}
          </option>
        </select>
        {fieldErrors.stage && <Err>{te('stage')}</Err>}
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

      <Field label={t('freeText')} required>
        <textarea
          name="free_text"
          rows={5}
          placeholder={t('freeTextPlaceholder')}
          className={`${FIELD_BASE} resize-y ${errClass('free_text')}`}
          aria-invalid={!!fieldErrors.free_text}
        />
        {fieldErrors.free_text && <Err>{te('freeText')}</Err>}
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
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
          aria-invalid={!!fieldErrors.consent}
        />
        <span>{t('consent')}</span>
      </label>
      {fieldErrors.consent && <Err>{te('consent')}</Err>}

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

function Err({ children }: { children: React.ReactNode }) {
  return (
    <span role="alert" className="mt-1.5 block text-xs text-accent">
      {children}
    </span>
  );
}

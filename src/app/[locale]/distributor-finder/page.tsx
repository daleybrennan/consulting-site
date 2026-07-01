import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Section, ButtonLink, Eyebrow, NumberedGrid } from '@/components/ui';
import { AccountFinderMockup } from '@/components/AccountFinderMockup';
import appShot from '../../../../public/account-finder-app.png';
import settingsShot from '../../../../public/account-finder-settings.png';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';
// External destination for the tool. Falls back to '#' until the live URL is set.
const TOOL_URL = process.env.NEXT_PUBLIC_DISTRIBUTOR_FINDER_URL ?? '#';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.distributorFinder' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/distributor-finder`,
      languages: {
        en: '/en/distributor-finder',
        fr: '/fr/distributor-finder',
        'x-default': '/en/distributor-finder',
      },
    },
  };
}

export default async function DistributorFinderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SoftwareJsonLd locale={locale} />
      <Hero />
      <What />
      <Plans />
      <Walkthrough />
      <Platforms />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('distributorFinder.hero');
  return (
    <section className="relative isolate overflow-hidden border-b-2 border-accent/40 bg-ink text-surface">
      {/* Soft burgundy glow behind the mockup, in place of a photo */}
      <div
        aria-hidden="true"
        className="absolute right-0 top-1/2 -z-10 h-[42rem] w-[42rem] -translate-y-1/2 translate-x-1/4 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent) 55%, transparent) 0%, transparent 68%)',
        }}
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-20 md:grid-cols-[1fr_1.05fr] md:gap-12 md:px-10 md:pb-28 md:pt-28">
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>
          <h1 className="reveal mt-6 max-w-xl text-balance text-4xl leading-tight md:text-6xl">
            {t('title')}
          </h1>
          <p className="reveal prose-measure mt-8 max-w-xl text-lg text-muted-dark md:text-xl">
            {t('lede')}
          </p>
          <div className="reveal mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ButtonLink href="/contact" variant="accent">
              {t('cta')}
            </ButtonLink>
            <Link
              href="/contact"
              className="text-sm text-muted-dark underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {t('secondary')} →
            </Link>
          </div>
        </div>
        <AccountFinderMockup
          app={appShot}
          settings={settingsShot}
          appAlt={t('mockupAlt')}
          settingsAlt={t('settingsAlt')}
          chromeLabel={t('chromeLabel')}
          expandLabel={t('lightbox.expand')}
          closeLabel={t('lightbox.close')}
          dialogLabel={t('lightbox.dialogLabel')}
        />
      </div>
    </section>
  );
}

const FEATURE_KEYS = ['0', '1', '2', '3', '4', '5'] as const;

function What() {
  const t = useTranslations('distributorFinder.what');
  const items = FEATURE_KEYS.map((k) => ({
    title: t(`items.${k}.title`),
    body: t(`items.${k}.body`),
  }));
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted">
          {t('body')}
        </p>
      </div>
      <div className="mt-14">
        <NumberedGrid items={items} variant="sm" cols={3} />
      </div>
      <div className="reveal mt-14 max-w-3xl border-l-2 border-accent pl-6">
        <p className="text-lg leading-relaxed text-ink-soft">{t('proof')}</p>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t('nature')}</p>
      </div>
    </Section>
  );
}

function Plans() {
  const t = useTranslations('distributorFinder.plans');
  const tiers = ['individual', 'team'] as const;
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {tiers.map((k) => (
          <div key={k} className="reveal rounded-lg border border-line bg-surface p-8 md:p-10">
            <h3 className="text-2xl">{t(`${k}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`${k}.body`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Walkthrough() {
  const t = useTranslations('distributorFinder.walkthrough');
  return (
    <Section tone="light">
      <div className="reveal card-hover flex flex-col gap-6 rounded-lg border border-line bg-surface-2 p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div>
          <h2 className="text-2xl md:text-3xl">{t('title')}</h2>
          <p className="mt-3 max-w-xl text-muted">{t('body')}</p>
        </div>
        <div className="shrink-0">
          <ButtonLink href="/contact" variant="accent">
            {t('button')}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}

function Platforms() {
  const t = useTranslations('distributorFinder.platforms');
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <div>
          <p className="reveal max-w-xl text-lg leading-relaxed text-muted">{t('body')}</p>
          <div className="reveal mt-8 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-3 rounded-lg border border-line px-5 py-3 text-ink">
              <GlobeGlyph />
              <span className="text-sm font-medium">{t('browser')}</span>
            </span>
          </div>
          <p className="reveal mt-4 text-xs uppercase tracking-[0.12em] text-muted">
            {t('comingSoon')}
          </p>
        </div>
      </div>
    </Section>
  );
}

function GlobeGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}

function Cta() {
  const t = useTranslations('distributorFinder.cta');
  // Until a live tool URL is configured, the demo request (contact) is the only
  // CTA — never render a dead '#' link.
  const hasTool = TOOL_URL !== '#';
  return (
    <Section tone="dark" className="text-center">
      <h2 className="reveal mx-auto max-w-2xl text-balance text-4xl md:text-5xl">
        {t('title')}
      </h2>
      <p className="reveal mx-auto mt-5 max-w-xl text-muted-dark">{t('body')}</p>
      <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-5">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-soft"
        >
          <span>{t('button')}</span>
          <span aria-hidden="true">→</span>
        </Link>
        {hasTool ? (
          <a
            href={TOOL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-dark underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {t('openTool')} ↗
          </a>
        ) : (
          <Link
            href="/contact"
            className="text-sm text-muted-dark underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {t('secondary')} →
          </Link>
        )}
      </div>
    </Section>
  );
}

async function SoftwareJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'meta.distributorFinder' });
  const json = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t('name'),
    applicationCategory: 'BusinessApplication',
    description: t('description'),
    url: `${SITE_URL}/${locale}/distributor-finder`,
    provider: {
      '@type': 'Person',
      name: 'Daley Brennan',
      sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

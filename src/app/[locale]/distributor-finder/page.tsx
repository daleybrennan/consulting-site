import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Section, Eyebrow } from '@/components/ui';
import cellar from '../../../../public/wine-cellar.jpg';

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
      <Platforms />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('distributorFinder.hero');
  return (
    <section className="relative isolate overflow-hidden bg-ink text-surface">
      <Image
        src={cellar}
        alt=""
        aria-hidden="true"
        placeholder="blur"
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/40"
      />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:px-10 md:pb-28 md:pt-32">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="reveal mt-6 max-w-4xl text-balance text-4xl leading-tight md:text-6xl">
          {t('title')}
        </h1>
        <p className="reveal prose-measure mt-8 max-w-2xl text-lg text-muted-dark md:text-xl">
          {t('lede')}
        </p>
      </div>
    </section>
  );
}

const FEATURE_KEYS = ['0', '1', '2', '3', '4', '5'] as const;

function What() {
  const t = useTranslations('distributorFinder.what');
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted">
          {t('body')}
        </p>
      </div>
      <div className="mt-14 grid overflow-hidden rounded-lg border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((k, i) => (
          <div key={k} className="reveal border-b border-r border-line bg-surface p-8 md:p-9">
            <span className="font-display text-2xl text-accent">0{i + 1}</span>
            <h3 className="mt-3 text-xl">{t(`items.${k}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t(`items.${k}.body`)}
            </p>
          </div>
        ))}
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

// Placeholder app-store badges — link to '#' until real store URLs are provided.
function StoreBadge({
  label,
  glyph,
}: {
  label: string;
  glyph: React.ReactNode;
}) {
  return (
    <a
      href="#"
      aria-label={label}
      className="inline-flex items-center gap-3 rounded-lg bg-ink px-5 py-3 text-white transition-colors hover:bg-accent"
    >
      <span aria-hidden="true">{glyph}</span>
      <span className="text-sm font-medium">{label}</span>
    </a>
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
            <StoreBadge label={t('ios')} glyph={<AppleGlyph />} />
            <StoreBadge label={t('android')} glyph={<PlayGlyph />} />
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

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c.02 2.55 2.23 3.4 2.26 3.41-.02.06-.35 1.21-1.16 2.4-.7 1.03-1.43 2.05-2.58 2.07-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.76.69-1.11.04-1.96-1.11-2.66-2.14-1.44-2.08-2.54-5.88-1.06-8.45.73-1.27 2.04-2.08 3.46-2.1 1.09-.02 2.12.73 2.78.73.67 0 1.92-.9 3.24-.77.55.02 2.1.22 3.1 1.68-.08.05-1.85 1.08-1.83 3.24zM14.2 5.39c.59-.71.98-1.7.87-2.69-.85.03-1.87.57-2.48 1.28-.55.63-1.02 1.64-.9 2.6.95.08 1.92-.48 2.51-1.19z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.6 2.4c-.25.26-.4.66-.4 1.18v16.84c0 .52.15.92.4 1.18l.06.05L13.1 12.1v-.2L3.66 2.35l-.06.05zM16.5 15.5l-3.4-3.4 3.4-3.4 4 2.28c1.14.65 1.14 1.71 0 2.36l-4 2.16zM12.97 11.9l-9.3 9.3c.38.4 1 .45 1.7.05l10.93-6.21-3.33-3.14z" />
    </svg>
  );
}

function Cta() {
  const t = useTranslations('distributorFinder.cta');
  return (
    <Section tone="dark" className="text-center">
      <h2 className="reveal mx-auto max-w-2xl text-balance text-4xl md:text-5xl">
        {t('title')}
      </h2>
      <p className="reveal mx-auto mt-5 max-w-xl text-muted-dark">{t('body')}</p>
      <div className="reveal mt-9 flex flex-wrap items-center justify-center gap-5">
        <a
          href={TOOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-soft"
        >
          <span>{t('button')}</span>
          <span aria-hidden="true">↗</span>
        </a>
        <Link
          href="/contact"
          className="text-sm text-muted-dark underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          {t('secondary')}
        </Link>
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

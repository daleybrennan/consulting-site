import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, Eyebrow } from '@/components/ui';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://daleybrennan.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta.advisory' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/advisory`,
      languages: {
        en: '/en/advisory',
        fr: '/fr/advisory',
        'x-default': '/en/advisory',
      },
    },
  };
}

export default async function AdvisoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ServiceJsonLd locale={locale} />
      <Hero />
      <Services />
      <Markets />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('advisory.hero');
  return (
    <Section tone="dark">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="reveal mt-6 max-w-4xl text-balance text-4xl leading-tight md:text-6xl">
        {t('title')}
      </h1>
      <p className="reveal prose-measure mt-8 text-lg text-muted-dark md:text-xl">
        {t('lede')}
      </p>
    </Section>
  );
}

const SERVICE_KEYS = [
  'marketEntry',
  'distribution',
  'pricing',
  'channel',
  'data',
  'positioning',
] as const;

function Services() {
  const t = useTranslations('advisory.services');
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14 grid overflow-hidden rounded-lg border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_KEYS.map((k, i) => (
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

function Markets() {
  const t = useTranslations('advisory.markets');
  return (
    <Section tone="panel">
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted">
          {t('body')}
        </p>
      </div>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('advisory.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

function ServiceJsonLd({ locale }: { locale: string }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Commercial Advisory for Premium Wine & Spirits Brands',
    serviceType:
      'Distribution, pricing, and channel strategy for wine and spirits brands',
    url: `${SITE_URL}/${locale}/advisory`,
    provider: {
      '@type': 'Person',
      name: 'Daley Brennan',
      sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
    },
    areaServed: ['United States', 'United Kingdom', 'United Arab Emirates'],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

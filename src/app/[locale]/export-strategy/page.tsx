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
  const t = await getTranslations({ locale, namespace: 'meta.exportStrategy' });
  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/export-strategy`,
      languages: {
        en: '/en/export-strategy',
        fr: '/fr/export-strategy',
        'x-default': '/en/export-strategy',
      },
    },
  };
}

export default async function ExportStrategyPage({
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
      <StartingPoints />
      <Covers />
      <Markets />
      <How />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('exportStrategy.hero');
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

function StartingPoints() {
  const t = useTranslations('exportStrategy.startingPoints');
  const items = ['scratch', 'established'] as const;
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {items.map((k) => (
          <div key={k} className="reveal rounded-lg border border-line bg-surface p-8 md:p-10">
            <h3 className="text-2xl">{t(`items.${k}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`items.${k}.body`)}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

const COVER_KEYS = [
  'brand',
  'culture',
  'pricing',
  'distribution',
  'fulfilment',
  'channel',
] as const;

function Covers() {
  const t = useTranslations('exportStrategy.covers');
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14 grid overflow-hidden rounded-lg border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {COVER_KEYS.map((k, i) => (
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
  const t = useTranslations('exportStrategy.markets');
  return (
    <Section tone="light">
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <h2 className="reveal text-3xl md:text-4xl">{t('title')}</h2>
        <p className="reveal max-w-xl self-center text-lg leading-relaxed text-muted">
          {t('body')}
        </p>
      </div>
    </Section>
  );
}

function How() {
  const t = useTranslations('exportStrategy.how');
  const steps = ['one', 'two', 'three', 'four'] as const;
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <ol className="mt-14 grid overflow-hidden rounded-lg border-l border-t border-line md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="reveal border-b border-r border-line bg-surface p-8 md:p-10">
            <span className="font-display text-3xl text-accent">0{i + 1}</span>
            <h3 className="mt-3 text-2xl">{t(`steps.${s}.title`)}</h3>
            <p className="mt-3 text-muted">{t(`steps.${s}.body`)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Cta() {
  const t = useTranslations('exportStrategy.cta');
  return <CtaBand title={t('title')} body={t('body')} button={t('button')} />;
}

async function ServiceJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'meta.exportStrategy' });
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('title'),
    serviceType: t('serviceType'),
    url: `${SITE_URL}/${locale}/export-strategy`,
    provider: {
      '@type': 'Person',
      name: 'Daley Brennan',
      sameAs: ['https://www.linkedin.com/in/daley-b-91477670/'],
    },
    areaServed: [
      'United States',
      'France',
      'United Kingdom',
      'Latin America',
      'Middle East',
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

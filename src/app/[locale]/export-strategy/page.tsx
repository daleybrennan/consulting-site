import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, PageHero, NumberedGrid } from '@/components/ui';
import vineyard from '../../../../public/vineyard-glass.jpg';

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
      <FaqJsonLd locale={locale} />
      <Hero />
      <StartingPoints />
      <Covers />
      <Markets />
      <How />
      <Faq />
      <Cta />
    </>
  );
}

function Hero() {
  const t = useTranslations('exportStrategy.hero');
  return (
    <PageHero
      image={vineyard}
      objectPosition="50% 30%"
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
    />
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
  const items = COVER_KEYS.map((k) => ({
    title: t(`items.${k}.title`),
    body: t(`items.${k}.body`),
  }));
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14">
        <NumberedGrid items={items} variant="sm" cols={3} />
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
  const items = steps.map((s) => ({
    title: t(`steps.${s}.title`),
    body: t(`steps.${s}.body`),
  }));
  return (
    <Section tone="panel">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14">
        <NumberedGrid items={items} variant="lg" cols={2} ordered />
      </div>
      <p className="reveal mt-8 max-w-2xl text-sm leading-relaxed text-muted">{t('note')}</p>
    </Section>
  );
}

type FaqItem = { q: string; a: string };

function Faq() {
  const t = useTranslations('exportStrategy.faq');
  const items = t.raw('items') as FaqItem[];
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-10 border-t border-line">
        {items.map((it, i) => (
          <details key={i} className="reveal group border-b border-line py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-ink [&::-webkit-details-marker]:hidden">
              <span>{it.q}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl leading-none text-accent transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">{it.a}</p>
          </details>
        ))}
      </div>
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

async function FaqJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'exportStrategy.faq' });
  const items = t.raw('items') as FaqItem[];
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

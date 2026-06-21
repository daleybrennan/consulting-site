import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { Section, CtaBand, PageHero, NumberedGrid } from '@/components/ui';
import advisory from '../../../../public/advisory.jpg';

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
    <PageHero
      image={advisory}
      eyebrow={t('eyebrow')}
      title={t('title')}
      lede={t('lede')}
    />
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
  const items = SERVICE_KEYS.map((k) => ({
    title: t(`items.${k}.title`),
    body: t(`items.${k}.body`),
  }));
  return (
    <Section tone="light">
      <h2 className="reveal max-w-2xl text-3xl md:text-4xl">{t('title')}</h2>
      <div className="mt-14">
        <NumberedGrid items={items} variant="sm" cols={3} />
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

async function ServiceJsonLd({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'meta.advisory' });
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('name'),
    serviceType: t('serviceType'),
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
